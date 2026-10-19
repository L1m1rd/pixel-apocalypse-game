const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),sharp=require('sharp');
const ROOT=path.resolve(__dirname,'..'),DIR=path.join(ROOT,'assets/northern-dachas-v1');
const read=f=>JSON.parse(fs.readFileSync(path.join(DIR,f),'utf8'));
const write=(f,x)=>fs.writeFileSync(path.join(DIR,f),JSON.stringify(x,null,2)+'\n');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
// A row is a representation/state of a canonical entity, never a new inventory item.
const groups={
 foliage:[
  ['bramble','bush_large','Заросли ежевики'],['hazel','bush_small','Подлесок орешника'],
  ['meadow-white','grass_tall','Луговая трава с белыми цветами'],['meadow-yellow','grass_tall','Луговая трава с жёлтыми цветами'],
  ['reeds','grass_tall','Камыш и рогоз'],['fern','grass_tall','Папоротник и крапива'],
  ['ivy-climbing','ivy','Вьющийся плющ'],['wild-rose','bush_small','Шиповник']
 ],
 'ground-details':[
  ['leaf-litter','leaves','Опавшая листва'],['root-moss','moss','Мох и корни'],
  ['wheel-ruts','road_dirt','Мокрые колеи'],['puddle-shallow','puddle','Мелкая лужа с грязным краем'],
  ['stone-scatter','rubble','Камни и кирпичная крошка'],['grass-transition','edge_soil_grass','Переход травы в землю'],
  ['foundation-damp','edge_soil_mud','Влажная земля у фундамента'],['glass-scatter','glass_shards','Россыпь битого стекла']
 ],
 'yard-details':[
  ['wood-shelter','garage','Дровник'],['workbench-tools','table','Верстак с инструментами'],
  ['salvage-boards','item/resource-harvest-boards','Доски и листы железа'],['rain-barrel-group','barrel','Бочка, ведро и шланг'],
  ['truck-canvas','car_abandoned','Брошенный грузовик с тентом'],['crate-group','crate','Ящики и корзина'],
  ['fence-broken','fence_wood','Перекошенная секция забора'],['direction-sign','road_sign','Дачный указатель']
 ],
 'ruin-details':[
  ['roof-debris','rubble','Обвалившиеся стропила и шифер'],['brick-debris','rubble','Кирпич и штукатурка'],
  ['fallen-birch','fallen_log','Поваленная берёза'],['dead-tree','tree_dead','Сухое дерево'],
  ['pallet-aged','pallet','Старый поддон'],['wood-barricade','barricade','Дощатое заграждение'],
  ['broken-window-frame','window_broken','Разбитая оконная рама'],['fungal-stump','fungal_cluster','Грибы на гнилом пне']
 ],
 'tree-details':[
  ['birch-mature','tree_deciduous','Взрослая берёза'],['spruce-mature','tree_conifer','Взрослая ель'],
  ['apple-mature','tree_deciduous','Старая яблоня'],['birch-autumn','tree_deciduous','Осенняя берёза']
 ],
 'house-details':[
  ['cottage-collapsed','house','Дача с обвалившейся крышей'],['cottage-plaster','house','Штукатурная дача с верандой'],
  ['cottage-blue','house','Синяя дача с заколоченным окном'],['shed-workshop','garage','Дачная мастерская']
 ]
};
async function seamMetrics(bytes){
 const {data:d,info:i}=await sharp(bytes).removeAlpha().raw().toBuffer({resolveWithObject:true});
 let ex=0,ey=0,nx=0,ny=0;
 for(let y=0;y<i.height;y++)for(let c=0;c<3;c++){ex+=Math.abs(d[(y*i.width)*3+c]-d[(y*i.width+i.width-1)*3+c]);for(let x=1;x<i.width;x++)nx+=Math.abs(d[(y*i.width+x)*3+c]-d[(y*i.width+x-1)*3+c]);}
 for(let x=0;x<i.width;x++)for(let c=0;c<3;c++){ey+=Math.abs(d[x*3+c]-d[((i.height-1)*i.width+x)*3+c]);for(let y=1;y<i.height;y++)ny+=Math.abs(d[(y*i.width+x)*3+c]-d[((y-1)*i.width+x)*3+c]);}
 return {edgeMeanX:ex/(i.height*3),edgeMeanY:ey/(i.width*3),neighborMeanX:nx/(i.height*(i.width-1)*3),neighborMeanY:ny/(i.width*(i.height-1)*3),kind:'diagnostic-not-proof-of-invisible-seams'};
}
async function unpackAtlas(bytes,count){
 const {data:d,info}=await sharp(bytes).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const w=info.width,h=info.height,labels=new Int32Array(w*h),queue=new Int32Array(w*h),components=[];let label=0;
 for(let p=0;p<w*h;p++){
  if(labels[p]||d[p*4+3]<=8)continue;label++;let head=0,tail=1,x0=w,x1=0,y0=h,y1=0;queue[0]=p;labels[p]=label;
  while(head<tail){const q=queue[head++],x=q%w,y=q/w|0;x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);
   for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const nx=x+dx,ny=y+dy,n=ny*w+nx;if(nx<0||ny<0||nx>=w||ny>=h||labels[n]||d[n*4+3]<=8)continue;labels[n]=label;queue[tail++]=n;}
  }
  components.push({label,area:tail,left:x0,top:y0,width:x1-x0+1,height:y1-y0+1});
 }
 const selected=components.sort((a,b)=>b.area-a.area).slice(0,count);
 // Sprite sheets may not obey the requested equal cell widths. Use their actual
 // alpha islands to unpack full objects, keeping neighbouring assets separate.
 selected.sort((a,b)=>((a.top+a.height/2<h/2?0:1)-(b.top+b.height/2<h/2?0:1))||a.left-b.left);
 if(selected.some(c=>c.area<2500))throw Error('Missing atlas silhouette');
 return selected.map(c=>{
  const raw=Buffer.alloc(c.width*c.height*4);
  for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++){
   const p=(c.top+y)*w+c.left+x;if(labels[p]!==c.label)continue;const q=(y*c.width+x)*4;raw[q]=d[p*4];raw[q+1]=d[p*4+1];raw[q+2]=d[p*4+2];raw[q+3]=d[p*4+3];
  }
  return {raw,crop:{left:c.left,top:c.top,width:c.width,height:c.height}};
 });
}
async function main(){
 const input=process.argv[2]?JSON.parse(fs.readFileSync(process.argv[2],'utf8')):read('detail-production-plan.json').jobs;
 const registry=JSON.parse(fs.readFileSync(path.join(ROOT,'docs/asset-registry.json'),'utf8'));
 const manifest=read('manifest.json'),prompts=read('prompts.json'),palettes=read('sector-palettes.json');
 const rows=[],jobs=[];
 fs.mkdirSync(path.join(DIR,'sources/details'),{recursive:true});fs.mkdirSync(path.join(DIR,'details'),{recursive:true});
 for(const job of input){
  const source='sources/details/'+job.id+'.png',sourcePath=path.join(DIR,source);
  if(job.generatedPath)fs.copyFileSync(job.generatedPath,sourcePath);
  const bytes=fs.readFileSync(sourcePath),meta=await sharp(bytes).metadata(),sourceMetadata={width:meta.width,height:meta.height,sha256:hash(bytes)};
  const specs=groups[job.id]??[[job.id,job.id==='forest-floor'?'forest_path':'road_dirt',job.id==='forest-floor'?'Лесная подстилка':'Утоптанная земля проездов']];
  const cols=specs.length===8?4:2,cellW=Math.floor(meta.width/cols),cellH=Math.floor(meta.height/2);
  const islands=groups[job.id]&&job.id!=='ground-details'?await unpackAtlas(bytes,specs.length):null;
  for(let n=0;n<specs.length;n++){
   const [id,entity,title]=specs[n],canonicalId=entity.includes('/')?entity:'world/'+entity;
   const owner=registry.entities.find(e=>e.id===canonicalId)?.owner;if(!owner)throw Error('Unknown canonical owner '+canonicalId);
   const tile=specs.length===1,file=(tile?'tiles/':'details/')+id+'.png';
   const crop=tile?null:islands?islands[n].crop:{left:n%cols*cellW,top:Math.floor(n/cols)*cellH,width:cellW,height:cellH};
   let pipeline=islands?sharp(islands[n].raw,{raw:{width:crop.width,height:crop.height,channels:4}}):sharp(bytes);
   if(crop){if(!islands)pipeline=pipeline.extract(crop);pipeline=pipeline.extend({top:8,bottom:8,left:8,right:8,background:{r:0,g:0,b:0,alpha:0}});}else pipeline=pipeline.resize(512,512);
   const exported=await pipeline.png().toBuffer(),em=await sharp(exported).metadata();fs.writeFileSync(path.join(DIR,file),exported);
   const row={id,title,canonicalId,owner,kind:tile?'tile':'sprite',category:tile?'terrain':'detail',file,transparent:!tile,width:em.width,height:em.height,sha256:hash(exported),source,sourceMetadata,detailSet:'district-detail-v2',variant:id};
   if(crop)row.atlasCrop=crop;
   if(islands)row.atlasExtraction='alpha-island';
   if(tile)row.tiling={requestedSeamless:true,metrics:await seamMetrics(exported),runtimeBlendRequired:true,review:'review/detail-contact.png'};
   rows.push(row);
  }
  jobs.push({id:job.id,source,prompt:job.prompt,transparent:!!job.transparent,status:'exported',exports:specs.map(s=>s[0]),sourceMetadata});
 }
 manifest.bindings=manifest.bindings.filter(b=>b.detailSet!=='district-detail-v2').concat(rows);
 manifest.detailProductionPlan='detail-production-plan.json';manifest.status='integrated-district-sunlight-and-details';
 manifest.runtime={...manifest.runtime,lighting:'desktop/northern-dachas-lighting.mjs',staticSun:true,detailAssets:rows.length};
 for(const b of manifest.bindings)if(!b.title)b.title=registry.entities.find(e=>e.id===b.canonicalId)?.name??b.id;
 prompts.jobs=prompts.jobs.filter(j=>!j.source?.startsWith('sources/details/')).concat(jobs);
 // Make each exported variant available in at least one sector palette.
 for(const sector of palettes.sectors)sector.assets=[...new Set([...sector.assets,...rows.filter(r=>!['reeds','fungal-stump','dead-tree','roof-debris','brick-debris'].includes(r.id)).map(r=>r.id)])];
 palettes.sectors.find(s=>s.name==='Заброшенные участки').assets.push('fungal-stump','dead-tree','roof-debris','brick-debris','reeds');
 write('manifest.json',manifest);write('prompts.json',prompts);write('sector-palettes.json',palettes);
 write('detail-production-plan.json',{version:2,tool:'built-in image_gen',scope:'District ground, understory, canopy, yard props, damage and building variants',canonicalPolicy:'All exports reuse existing canonical entity IDs and owners.',jobs,exportedAssets:rows.map(r=>r.id),count:rows.length});
 const cards=rows.map(r=>`<article><div class="sprite"><img loading="lazy" src="${r.file}" alt="${r.title}"></div><h3>${r.title}</h3><p>${r.canonicalId} · ${r.width} × ${r.height}</p><a href="${r.file}">PNG</a></article>`).join('');
 fs.writeFileSync(path.join(DIR,'details.html'),`<!doctype html><html lang="ru"><meta charset="utf-8"><title>Северные дачи — детали и солнце</title><style>body{margin:0;background:#202820;color:#ede7d5;font:16px Segoe UI}main{max-width:1450px;margin:auto;padding:30px}a{color:#d6c38b}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:16px}article{background:#30382c;padding:16px;border:1px solid #5b6046}h3{margin:12px 0 5px}p{font-size:12px}.sprite{height:220px;background:repeating-conic-gradient(#50594a 0 25%,#414a3b 0 50%) 0/24px 24px;display:flex;align-items:center;justify-content:center}.sprite img{max-width:100%;max-height:100%;object-fit:contain}</style><main><a href="index.html">← Северные дачи</a><h1>Детали района · 42 новых варианта</h1><p>40 прозрачных спрайтов и наземных накладок, два покрытия. Изображения созданы встроенным image_gen. <a href="detail-production-plan.json">Все промпты и исходники</a>.</p><p>В игре подключено неподвижное солнце: направление сверху слева, высота 43°, направленные тени по силуэтам объектов.</p><div class="grid">${cards}</div></main></html>`);
 const production=[...manifest.bindings,...manifest.entities],groundIds=new Set(groups['ground-details'].map(r=>r[0]));
 const gallery=production.map(r=>{
  const kind=r.kind==='tile'?(r.file.startsWith('materials/')?'material':'terrain'):groundIds.has(r.id)?'decal':'sprite';
  const picture=r.kind==='tile'?`<div class="image surface" style="background-image:url(${r.file})"></div>`:`<div class="image sprite"><img loading="lazy" src="${r.file}" alt="${r.title}"></div>`;
  return `<article data-id="${r.id}" data-kind="${kind}">${picture}<h3>${r.title}</h3><p>${r.width} × ${r.height} · ${r.canonicalId}</p><a href="${r.file}">PNG</a>${r.source?` · <a href="${r.source}">Исходник</a>`:''}</article>`;
 }).join('');
 fs.writeFileSync(path.join(DIR,'textures.html'),`<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Текстуры Северных дач</title>
 <style>body{margin:0;background:#172019;color:#ece9da;font:16px/1.5 Segoe UI}main{max-width:1500px;margin:auto;padding:28px}a{color:#e0d1a1}.toolbar{display:flex;flex-wrap:wrap;gap:12px;position:sticky;top:0;background:#172019ef;padding:15px 0;z-index:2}select,button{font:inherit;padding:9px;border:1px solid #627158;background:#293828;color:#eee;border-radius:6px}#grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:18px}article{background:#293528;border:1px solid #46513e;padding-bottom:16px}article h3,article p,article>a{margin-left:15px}article p{font-size:12px;overflow-wrap:anywhere}.image{height:250px;background-color:#56604b}.sprite{background:repeating-conic-gradient(#59634e 0 25%,#4d5743 0 50%) 50%/24px 24px;display:flex;align-items:center;justify-content:center}.sprite img{max-width:100%;max-height:100%;object-fit:contain}.surface{background-size:128px 128px;background-repeat:repeat}body.dirt .sprite{background:#62513e}body.dark .sprite{background:#161c17}body.light .sprite{background:#c5c4b6}[hidden]{display:none!important}</style>
 <main><a href="index.html">← Северные дачи</a><h1>Текстуры и объекты района</h1><p>76 игровых PNG: 13 покрытий и материалов, 63 прозрачных спрайта и накладки. <a href="details.html">42 новых варианта и кадр из игры →</a></p>
 <div class="toolbar"><label>Сектор <select id="sector"><option value="">Весь район</option>${palettes.sectors.map((s,i)=>`<option value="${i}">${s.name}</option>`).join('')}</select></label><label>Тип <select id="kind"><option value="">Все</option><option value="terrain">Земля и вода</option><option value="material">Стены и крыши</option><option value="sprite">Объекты</option><option value="decal">Наземные накладки</option></select></label><label>Фон <select id="background"><option value="">Клетка</option><option value="dirt">Земля</option><option value="dark">Тёмный</option><option value="light">Светлый</option></select></label><button id="repeat">Масштаб покрытий</button><span id="count"></span></div><div id="grid">${gallery}</div>
 <p><a href="manifest.json">Реестр</a> · <a href="detail-production-plan.json">Новые промпты</a> · <a href="review/detail-contact.png">Лист всех новых деталей</a></p></main>
 <script>const sectors=${JSON.stringify(palettes.sectors)},sector=document.getElementById('sector'),kind=document.getElementById('kind'),cards=[...document.querySelectorAll('article')];function update(){const allowed=sector.value===''?null:new Set(sectors[Number(sector.value)].assets);let count=0;for(const card of cards){card.hidden=!!((allowed&&!allowed.has(card.dataset.id))||(kind.value&&card.dataset.kind!==kind.value));if(!card.hidden)count++;}document.getElementById('count').textContent=count+' файлов';}sector.onchange=kind.onchange=update;document.getElementById('background').onchange=e=>document.body.className=e.target.value;let large=false;document.getElementById('repeat').onclick=()=>{large=!large;document.querySelectorAll('.surface').forEach(e=>e.style.backgroundSize=large?'256px 256px':'128px 128px');};update();</script></html>`);
 let index=fs.readFileSync(path.join(DIR,'index.html'),'utf8');
 index=index.replaceAll('34 PNG','76 PNG').replaceAll('34 рабочих PNG','76 рабочих PNG');
 if(!index.includes('href="details.html"'))index=index.replace('<h2>Полный район', '<p><a href="details.html"><strong>42 новых варианта деталей и неподвижное солнце →</strong></a></p><h2>Полный район');
 fs.writeFileSync(path.join(DIR,'index.html'),index);
 // Inspection contact sheet, preserving alpha over a neutral review background.
 const cell=180,thumbs=[];
 for(let i=0;i<rows.length;i++)thumbs.push({input:await sharp(path.join(DIR,rows[i].file)).resize(cell-16,cell-16,{fit:'inside'}).extend({top:8,bottom:8,left:8,right:8,background:{r:0,g:0,b:0,alpha:0}}).toBuffer(),left:(i%7)*cell,top:Math.floor(i/7)*cell});
 await sharp({create:{width:cell*7,height:cell*6,channels:4,background:'#414a3b'}}).composite(thumbs).png().toFile(path.join(DIR,'review/detail-contact.png'));
 console.log(JSON.stringify({generatedSheets:jobs.length,newVariants:rows.length,sprites:rows.filter(r=>r.kind==='sprite').length,tiles:rows.filter(r=>r.kind==='tile').length,totalProduction:manifest.bindings.length+manifest.entities.length}));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
