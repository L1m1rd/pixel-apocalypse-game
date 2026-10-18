const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const sharp = require('sharp');
const ROOT = path.resolve(__dirname, '..'), DIR = path.join(ROOT, 'assets/northern-dachas-v1');
const read = file => JSON.parse(fs.readFileSync(path.join(DIR, file), 'utf8'));
const write = (file, data) => fs.writeFileSync(path.join(DIR, file), JSON.stringify(data, null, 2) + '\n');
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const escape = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function metadata(file) {
  const bytes = fs.readFileSync(path.join(DIR, file)), m = await sharp(bytes).metadata();
  return { width:m.width, height:m.height, sha256:hash(bytes) };
}
async function seamMetrics(file) {
  const {data,info} = await sharp(path.join(DIR,file)).removeAlpha().raw().toBuffer({resolveWithObject:true});
  const w=info.width,h=info.height,c=info.channels;
  let sx=0,sy=0,nx=0,ny=0,ix=0,iy=0;
  for(let y=0;y<h;y++)for(let k=0;k<3;k++){
    sx+=Math.abs(data[(y*w)*c+k]-data[(y*w+w-1)*c+k]);nx++;
    for(let x=1;x<w;x++)ix+=Math.abs(data[(y*w+x)*c+k]-data[(y*w+x-1)*c+k]);
  }
  for(let x=0;x<w;x++)for(let k=0;k<3;k++){
    sy+=Math.abs(data[x*c+k]-data[((h-1)*w+x)*c+k]);ny++;
    for(let y=1;y<h;y++)iy+=Math.abs(data[(y*w+x)*c+k]-data[((y-1)*w+x)*c+k]);
  }
  return {edgeMeanX:sx/nx,edgeMeanY:sy/ny,neighborMeanX:ix/(h*(w-1)*3),neighborMeanY:iy/(w*(h-1)*3),kind:'diagnostic-not-proof-of-invisible-seams'};
}
async function main(){
  const plan=read('production-plan.json'), manifest=read('manifest.json');
  const registry=JSON.parse(fs.readFileSync(path.join(ROOT,'docs/asset-registry.json'),'utf8'));
  const old=manifest.bindings.filter(b=>!b.source);
  assert.equal(old.length,4);
  const sourcePrompts=read('prompts.json');
  manifest.bindings=old;manifest.entities=[];
  fs.mkdirSync(path.join(DIR,'review'),{recursive:true});
  for(const job of plan.jobs){
    assert(fs.existsSync(path.join(DIR,job.source)),'Missing source '+job.id);
    const input=path.join(DIR,job.source), output=path.join(DIR,job.file);
    fs.mkdirSync(path.dirname(output),{recursive:true});
    let pipeline=sharp(input);
    if(job.kind==='sprite'){
      const max=/^house/.test(job.id)?768:job.id==='greenhouse'?640:job.id.startsWith('tree')?640:job.id==='utility_pole'?512:job.id==='car_abandoned'?512:['fence_mesh','gate'].includes(job.id)?512:job.id==='grass_tall'?192:384;
      pipeline=pipeline.resize({width:max,height:max,fit:'inside',withoutEnlargement:true}).extend({top:16,bottom:16,left:16,right:16,background:{r:0,g:0,b:0,alpha:0}});
    }else{
      if(job.exportCrop)pipeline=pipeline.extract(job.exportCrop).resize(512,512,{fit:'fill'});
      else pipeline=pipeline.resize(512,512,{fit:'cover',position:'centre'});
      pipeline=pipeline.removeAlpha();
    }
    await pipeline.png().toFile(output);
    const owner=job.isNew?{pack:'northern-dachas-v1',id:job.id}:registry.entities.find(e=>e.id===job.canonicalId)?.owner;
    assert(owner,'Unresolved owner '+job.canonicalId);
    const entry={id:job.id,title:job.title,canonicalId:job.canonicalId,kind:job.kind==='sprite'?'sprite':'tile',category:job.kind,file:job.file,source:job.source,owner,transparent:job.transparent,...await metadata(job.file),sourceMetadata:await metadata(job.source)};
    if(job.exportCrop)entry.exportCrop=job.exportCrop;
    if(job.kind!=='sprite')entry.tiling={requestedSeamless:true,review:'review/terrain-repeat-contact.png',metrics:await seamMetrics(job.file),runtimeBlendRequired:true};
    if(job.isNew)manifest.entities.push(entry);else manifest.bindings.push(entry);
    job.status='exported';
    const existing=sourcePrompts.jobs.find(j=>j.id===job.id&&j.source===job.source);
    if(existing)Object.assign(existing,job);else sourcePrompts.jobs.push({...job});
  }
  const oldTitles={house:'Синяя деревянная дача',garage:'Дачный сарай',fence_wood:'Деревянный забор',tree_deciduous:'Берёза'};
  for(const b of old){b.title=oldTitles[b.id];b.category='sprite';}
  manifest.status='production-textures-generated-not-engine-integrated';
  manifest.productionPlan='production-plan.json';manifest.sectorPalettes='sector-palettes.json';
  manifest.notes=[
    '34 individual production images: 11 surface tiles and 23 isolated sprites, including four existing sprites.',
    'Existing entities retain canonical ownership. Greenhouse, well and garden_bed are new world entities explicitly owned by this pack.',
    'Generated high-resolution sources are preserved; exports only resize and add transparent sprite padding.',
    'Terrain repeat metrics and previews are diagnostics. Terrain transitions and target-scale material mapping need runtime validation.',
    'Buildings are static complete sprites; roofless interiors, separable roofs, open doors and other interactive states are not implemented.',
    'No gameplay renderer, collision map, publication configuration or packaged game is changed.'
  ];
  write('manifest.json',manifest);write('production-plan.json',plan);write('prompts.json',sourcePrompts);
  const common=['soil','grass_short','mud','gravel','floor_wood','wall_wood','roof','fence_wood','gate','barrel','crate','bush_small','grass_tall'];
  const sectors=[
    ['Старые дачи',['house','house-plaster','house-abandoned','wall_brick','garage','well','bench','boards','rubble','utility_pole']],
    ['Берёзовая улица',['house','house-plaster','tree_deciduous','fence_mesh','utility_pole','car_abandoned','puddle','floor_concrete']],
    ['Северные участки',['house-abandoned','garage','tree_conifer','tree_deciduous','boards','puddle']],
    ['Яблоневые сады',['house','tree-apple','bench','garden_bed','well','fence_mesh']],
    ['Тепличный сектор',['greenhouse','garden_bed','well','fence_mesh','floor_concrete','puddle']],
    ['Дачные сараи',['garage','boards','rubble','utility_pole','floor_concrete']],
    ['Заброшенные участки',['house-abandoned','rubble','tree_conifer','tree_deciduous','water','puddle','boards']],
    ['Южный въезд',['asphalt','floor_concrete','house-plaster','wall_brick','car_abandoned','utility_pole','gate','fence_mesh','bench']]
  ].map(([name,ids])=>({name,assets:[...new Set([...common,...ids])]}));
  const all=[...manifest.bindings,...manifest.entities];
  const ids=new Set(all.map(a=>a.id));
  for(const sector of sectors)for(const id of sector.assets)assert(ids.has(id),'Unknown sector asset '+id);
  for(const a of all)assert(sectors.some(s=>s.assets.includes(a.id)),'Asset not assigned to district '+a.id);
  write('sector-palettes.json',{role:'asset-palettes-not-runtime-placement',sectors});
  const surfaces=all.filter(a=>a.kind==='tile'),cards=[];
  for(let i=0;i<surfaces.length;i++){
    const tile=await sharp(path.join(DIR,surfaces[i].file)).resize(128,128).png().toBuffer(),copies=[];
    for(let y=0;y<3;y++)for(let x=0;x<3;x++)copies.push({input:tile,left:x*128,top:y*128});
    const panel=await sharp({create:{width:384,height:384,channels:3,background:'#333c32'}}).composite(copies).png().toBuffer();
    cards.push({input:panel,left:(i%4)*384,top:Math.floor(i/4)*384});
  }
  await sharp({create:{width:1536,height:Math.ceil(surfaces.length/4)*384,channels:3,background:'#172019'}}).composite(cards).png().toFile(path.join(DIR,'review/terrain-repeat-contact.png'));
  write('review/terrain-repeat-order.json',surfaces.map(a=>({id:a.id,file:a.file,metrics:a.tiling.metrics})));
  const sprites=all.filter(a=>a.kind==='sprite'),spritePanels=[];
  for(let i=0;i<sprites.length;i++){
    const buffer=await sharp(path.join(DIR,sprites[i].file)).resize(264,224,{fit:'inside'}).png().toBuffer(),meta=await sharp(buffer).metadata();
    spritePanels.push({input:buffer,left:(i%5)*280+Math.floor((280-meta.width)/2),top:Math.floor(i/5)*240+Math.floor((240-meta.height)/2)});
  }
  await sharp({create:{width:1400,height:Math.ceil(sprites.length/5)*240,channels:3,background:'#59634e'}}).composite(spritePanels).png().toFile(path.join(DIR,'review/sprite-contact.png'));
  write('review/sprite-contact-order.json',sprites.map(a=>({id:a.id,file:a.file})));
  const groupTitle={terrain:'Земля и вода',material:'Стены и крыши',sprite:'Объекты'};
  const card=a=>'<article data-id="'+escape(a.id)+'" data-kind="'+escape(a.category)+'"><div class="image '+(a.kind==='tile'?'surface':'sprite')+'" style="'+(a.kind==='tile'?'background-image:url('+a.file+');':'')+'">'+(a.kind==='tile'?'':'<img loading="lazy" src="'+a.file+'" alt="'+escape(a.title)+'">')+'</div><h3>'+escape(a.title)+'</h3><p>'+a.width+' × '+a.height+' · '+(a.kind==='tile'?'повторяемое покрытие':'прозрачный PNG')+'</p><a href="'+a.file+'">PNG</a>'+(a.source?' · <a href="'+a.source+'">Исходник</a>':'')+'</article>';
  const html=['<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Текстуры Северных дач</title>',
    '<style>body{margin:0;background:#162018;color:#ebe9da;font:16px/1.5 system-ui}main{max-width:1500px;margin:auto;padding:28px}h1{font-size:34px}a{color:#d9cc9c}p{color:#bdc6b5}.toolbar{display:flex;flex-wrap:wrap;gap:12px;position:sticky;top:0;background:#162018ed;padding:15px 0;z-index:2}select,button{font:inherit;padding:9px;border:1px solid #627158;background:#293828;color:#eee;border-radius:6px}#grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:18px}article{background:#253026;border:1px solid #46513e;border-radius:8px;overflow:hidden;padding:0 0 16px}article h3,article p,article>a{margin-left:15px}.image{height:250px;background-color:#56604b}.sprite{background:repeating-conic-gradient(#59634e 0% 25%,#4d5743 0% 50%) 50%/24px 24px;display:flex;align-items:center;justify-content:center}.sprite img{max-width:100%;max-height:100%;object-fit:contain}.surface{background-size:128px 128px;background-repeat:repeat}body.dirt .sprite{background:#62513e}body.dark .sprite{background:#161c17}body.light .sprite{background:#c5c4b6}[hidden]{display:none!important}h3{font-size:18px;margin-bottom:0}article p{font-size:13px;margin-top:4px}.notice{max-width:1050px}</style>',
    '<main><a href="index.html">← Локация и план района</a><h1>Текстуры и объекты Северных дач</h1><p>34 отдельных PNG: 11 покрытий и материалов, 23 объекта. Новых генераций — 30. Все восемь секторов большого района получили наборы материалов.</p><p class="notice">В карточках покрытий показан повтор текстуры. Масштаб материала и переходы между покрытиями проверяются при сборке сцены. Дома пока цельные, без отдельных крыш и открывающихся дверей; набор в игру не подключён.</p>',
    '<div class="toolbar"><label>Сектор <select id="sector"><option value="">Весь район</option>'+sectors.map((s,i)=>'<option value="'+i+'">'+escape(s.name)+'</option>').join('')+'</select></label><label>Тип <select id="kind"><option value="">Все</option>'+Object.entries(groupTitle).map(([k,v])=>'<option value="'+k+'">'+v+'</option>').join('')+'</select></label><label>Фон <select id="background"><option value="">Шахматный</option><option value="dirt">Земля</option><option value="dark">Тёмный</option><option value="light">Светлый</option></select></label><button id="repeat">Крупнее покрытие</button><span id="count"></span></div>',
    '<div id="grid">'+all.map(card).join('')+'</div><p><a href="review/terrain-repeat-contact.png">Лист проверки повторения</a> · <a href="production-plan.json">Промпты новых генераций</a> · <a href="manifest.json">Реестр файлов</a></p></main>',
    '<script>const sectors='+JSON.stringify(sectors)+';const sector=document.getElementById("sector"),kind=document.getElementById("kind"),cards=[...document.querySelectorAll("article")];function update(){const allowed=sector.value===""?null:new Set(sectors[Number(sector.value)].assets);let count=0;for(const c of cards){c.hidden=!!((allowed&&!allowed.has(c.dataset.id))||(kind.value&&c.dataset.kind!==kind.value));if(!c.hidden)count++;}document.getElementById("count").textContent=count+" файлов";}sector.onchange=kind.onchange=update;document.getElementById("background").onchange=e=>document.body.className=e.target.value;let large=false;document.getElementById("repeat").onclick=()=>{large=!large;for(const p of document.querySelectorAll(".surface"))p.style.backgroundSize=large?"256px 256px":"128px 128px";};update();</script></html>'
  ].join('\n');
  fs.writeFileSync(path.join(DIR,'textures.html'),html);
  let index=fs.readFileSync(path.join(DIR,'index.html'),'utf8');
  const link='<p id="production-link"><a href="textures.html"><strong>Открыть текстуры всего района: 34 PNG, фильтр по 8 секторам →</strong></a></p>';
  if(!index.includes('id="production-link"'))index=index.replace('<h1>Северные дачи</h1>','<h1>Северные дачи</h1>'+link);
  fs.writeFileSync(path.join(DIR,'index.html'),index);
  console.log(JSON.stringify({generated:plan.jobs.length,individualImages:all.length,surfaces:surfaces.length,sprites:all.length-surfaces.length,newWorldEntities:manifest.entities.length,sectors:sectors.length}));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
