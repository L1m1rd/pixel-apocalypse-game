const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const os = require('node:os');
function dep(name) { try { return require(name); } catch { return require(path.join(os.homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules', name)); } }
const sharp = dep('sharp');
const JSZip = dep('jszip');
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'assets/environment-variants-v1');
const CATALOG = Object.entries(require('./environment-catalog.cjs')).flatMap(([kind, items]) => items.map(([id,label,subject,playback])=>({id,label,kind,subject,playback:playback||null})));
const json = (p,v) => fs.writeFile(p,JSON.stringify(v,null,2)+'\n');
const nearest = sharp.kernel.nearest;
const big = new Set(['tree_deciduous','tree_conifer','tree_dead','house','shop','warehouse','garage','container']);
const medium = new Set(['car_abandoned','car_wreck','wall_wood','wall_brick','roof','fence_wood','fence_metal','fence_mesh','gate','barricade','boarded_passage','utility_pole','streetlamp']);
async function alphaBounds(buf) {
 const {data,info}=await sharp(buf).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 let x0=info.width,y0=info.height,x1=-1,y1=-1,count=0,edge=0;
 for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++)if(data[(y*info.width+x)*4+3]>8){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);count++;if(x===0||y===0||x===info.width-1||y===info.height-1)edge++;}
 return {x0,y0,x1,y1,count,edge,hasTransparency:count<info.width*info.height};
}
async function textureRegion(file){
 const {data,info}=await sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 // Detect the dark sheet margin; keep a rectangular crop of real generated pixels.
 const corners=[[0,0],[info.width-1,0],[0,info.height-1],[info.width-1,info.height-1]].map(([x,y])=>Array.from(data.subarray((y*info.width+x)*4,(y*info.width+x)*4+3)));
 const bg=[0,1,2].map(k=>corners.reduce((n,c)=>n+c[k],0)/4),xs=new Uint32Array(info.width),ys=new Uint32Array(info.height);
 for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){const i=(y*info.width+x)*4,d=Math.abs(data[i]-bg[0])+Math.abs(data[i+1]-bg[1])+Math.abs(data[i+2]-bg[2]);if(d>38){xs[x]++;ys[y]++;}}
 const xx=Array.from(xs).map((n,i)=>n>info.height*.14?i:-1).filter(i=>i>=0),yy=Array.from(ys).map((n,i)=>n>info.width*.14?i:-1).filter(i=>i>=0);
 if(!xx.length||!yy.length)return {left:0,top:0,width:info.width,height:info.height};
 return {left:xx[0],top:yy[0],width:xx.at(-1)-xx[0]+1,height:yy.at(-1)-yy[0]+1};
}
async function cells(file,cols,rows,region=null,adaptive=false){
 const m=await sharp(file).metadata();const out=[];region=region||{left:0,top:0,width:m.width,height:m.height};
 let cuts=null;
 if(adaptive&&cols===3&&rows===1){
  const {data,info}=await sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true});cuts=[0];
  for(let n=1;n<3;n++){
   const center=Math.round(n*info.width/3),radius=Math.floor(info.width*.045);let best=center,bestScore=Infinity;
   for(let x=center-radius;x<=center+radius;x++){let count=0;for(let y=0;y<info.height;y++)if(data[(y*info.width+x)*4+3]>8)count++;const score=count*1000+Math.abs(x-center);if(score<bestScore){best=x;bestScore=score;}}
   cuts.push(best);
  }cuts.push(info.width);
 }
 for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){
  const left=cuts?cuts[c]:region.left+Math.floor(c*region.width/cols),top=region.top+Math.floor(r*region.height/rows),width=cuts?cuts[c+1]-cuts[c]:region.left+Math.floor((c+1)*region.width/cols)-left,height=region.top+Math.floor((r+1)*region.height/rows)-top;
  const input=await sharp(file).extract({left,top,width,height}).ensureAlpha().png().toBuffer();
  out.push({input,width,height,rect:{left,top,width,height},bounds:await alphaBounds(input)});
 }
 if(cuts){
  const maxWidth=Math.max(...out.map(c=>c.width));
  for(const c of out){const left=Math.floor((maxWidth-c.width)/2);if(maxWidth!==c.width){c.input=await sharp({create:{width:maxWidth,height:c.height,channels:4,background:'#00000000'}}).composite([{input:c.input,left,top:0}]).png().toBuffer();c.width=maxWidth;c.bounds=await alphaBounds(c.input);}c.normalizedOffset={left,top:0};}
 }
 return out;
}
async function fitRegistered(raw,size,padding=4){
 // One transform for the entire element, preserving variation/animation registration.
 const w=Math.min(...raw.map(x=>x.width)),h=Math.min(...raw.map(x=>x.height));
 const occupied=raw.filter(c=>c.bounds.count),x0=Math.max(0,Math.min(...occupied.map(c=>c.bounds.x0))),y0=Math.max(0,Math.min(...occupied.map(c=>c.bounds.y0))),x1=Math.min(w-1,Math.max(...occupied.map(c=>c.bounds.x1))),y1=Math.min(h-1,Math.max(...occupied.map(c=>c.bounds.y1)));
 const crop=occupied.length?{left:x0,top:y0,width:x1-x0+1,height:y1-y0+1}:{left:0,top:0,width:w,height:h};
 const scale=Math.min((size-padding*2)/crop.width,(size-padding*2)/crop.height),rw=Math.max(1,Math.round(crop.width*scale)),rh=Math.max(1,Math.round(crop.height*scale));
 return Promise.all(raw.map(async c=>sharp({create:{width:size,height:size,channels:4,background:'#00000000'}}).composite([{input:await sharp(c.input).extract(crop).resize(rw,rh,{kernel:nearest,fit:'fill'}).png().toBuffer(),left:Math.floor((size-rw)/2),top:Math.floor((size-rh)/2)}]).png().toBuffer()));
}
async function build(){
 const manifest={version:1,variantsPerElement:3,plannedElements:CATALOG.length,generatedElements:0,staticVariants:0,animations:0,animationFrames:0,lightingReferences:0,tool:'built-in image_gen',status:'generated-art-not-engine-integration',notes:['Source art is preserved without recoloring or synthesized variants.','Terrain seams and road connectors require validation in the eventual map renderer.','Six-frame effect sheets are proposed visual animations; gameplay timing and damage are not implemented.','Lighting panels are visual references; presets are proposed settings, not rendered engine lighting.'],elements:[],missing:[]};
 await fs.mkdir(path.join(OUT,'elements'),{recursive:true});
 for(const a of CATALOG){
  let source=path.join(OUT,'sources',a.id+'.png');try{await fs.access(source);}catch{manifest.missing.push(a.id);continue;}
  try{const revision=path.join(OUT,'sources',a.id+'-v2.png');await fs.access(revision);source=revision;}catch{}
  const dir=path.join(OUT,'elements',a.id);await fs.mkdir(dir,{recursive:true});
  const animated=a.kind==='animation',texture=['terrain','transition'].includes(a.kind),region=texture?await textureRegion(source):null,raw=await cells(source,animated?6:3,animated?3:1,region,a.kind==='prop'),size=animated?192:big.has(a.id)?256:medium.has(a.id)?192:128;
  let rendered;
  if(['terrain','transition'].includes(a.kind)){
   // Interior square avoids generated sheet padding and dividers. Never invent texture pixels.
   rendered=await Promise.all(raw.map(c=>{const side=Math.floor(Math.min(c.width,c.height)*.84);return sharp(c.input).extract({left:Math.floor((c.width-side)/2),top:Math.floor((c.height-side)/2),width:side,height:side}).resize(64,64,{kernel:nearest}).png().toBuffer();}));
  }else if(a.kind==='lighting')rendered=await Promise.all(raw.map(c=>sharp(c.input).resize({width:256,kernel:nearest}).png().toBuffer()));
  else rendered=await fitRegistered(raw,size,a.kind==='road'?0:4);
  const e={...a,source:'sources/'+path.basename(source),variants:[],warnings:[]};
  if(['prop','road','animation'].includes(a.kind)&&raw.some(c=>!c.bounds.hasTransparency))e.warnings.push('Source has an opaque cell: inspect alpha before integration.');
  if(['prop','animation'].includes(a.kind)&&raw.some(c=>c.bounds.edge>4))e.warnings.push('Visible source pixels touch a grid boundary: inspect framing.');
  for(let v=0;v<3;v++){
   const id=a.id+'_'+['a','b','c'][v],prefix='elements/'+a.id+'/',frameBuffers=animated?rendered.slice(v*6,v*6+6):[rendered[v]];
   const m=await sharp(frameBuffers[0]).metadata(),variant={id,variant:['A','B','C'][v],width:m.width,height:m.height,origin:{x:.5,y:.5},files:[]};
   if(a.kind==='prop')variant.origin.y=1;
   for(let f=0;f<frameBuffers.length;f++){
    const name=id+(animated?'_'+String(f).padStart(2,'0'):'')+'.png';await fs.writeFile(path.join(dir,name),frameBuffers[f]);variant.files.push(prefix+name);
   }
   if(animated){
    const sheet=id+'-sheet.png',atlas=id+'-atlas.json',gif=id+'.gif';
    await sharp({create:{width:m.width*6,height:m.height,channels:4,background:'#00000000'}}).composite(frameBuffers.map((input,i)=>({input,left:i*m.width,top:0}))).png().toFile(path.join(dir,sheet));
    await json(path.join(dir,atlas),{frames:Object.fromEntries(variant.files.map((p,i)=>[path.basename(p,'.png'),{frame:{x:i*m.width,y:0,w:m.width,h:m.height},rotated:false,trimmed:false,spriteSourceSize:{x:0,y:0,w:m.width,h:m.height},sourceSize:{w:m.width,h:m.height}}])),meta:{image:sheet,size:{w:m.width*6,h:m.height},scale:'1'}});
    const frames=await Promise.all(frameBuffers.map(b=>sharp(b).flatten({background:'#26312c'}).png().toBuffer()));
    const fast=['muzzle_flash','shell_casing','hit_wood','hit_soil','hit_glass','explosion'].includes(a.id),ms=fast?80:140;
    await sharp(frames,{join:{animated:true}}).gif({delay:frames.map((_,i)=>ms+(i===5&&a.playback!=='loop'?650:0)),loop:0,dither:0}).toFile(path.join(dir,gif));
    Object.assign(variant,{spritesheet:prefix+sheet,atlas:prefix+atlas,preview:prefix+gif,frameRate:1000/ms,repeat:a.playback==='loop'?-1:0,persistence:a.playback==='hold'?'hold-last-frame':a.playback==='loop'?'loop':'destroy',rootMotion:false});manifest.animations++;manifest.animationFrames+=6;
   }else{variant.preview=variant.files[0];if(a.kind==='lighting')manifest.lightingReferences++;else manifest.staticVariants++;}
   variant.sha256=await Promise.all(variant.files.map(async p=>crypto.createHash('sha256').update(await fs.readFile(path.join(OUT,p))).digest('hex')));e.variants.push(variant);
  }
  await json(path.join(dir,'export.json'),{element:a.id,source:e.source,sourceCells:raw.map(c=>({rect:c.rect,normalizedOffset:c.normalizedOffset||null,alpha:c.bounds})),warnings:e.warnings});
  manifest.elements.push(e);manifest.generatedElements++;console.log(a.id+': 3 variants'+(animated?', 18 frames':''));
 }
 await json(path.join(OUT,'manifest.json'),manifest);await fs.writeFile(path.join(OUT,'manifest.js'),'window.ENVIRONMENT_VARIANTS='+JSON.stringify(manifest)+';\n');
 await contact(manifest);await storyboards(manifest);await lightingPresets();await readme(manifest);
 console.log(JSON.stringify({generated:manifest.generatedElements,missing:manifest.missing.length,staticVariants:manifest.staticVariants,animations:manifest.animations,animationFrames:manifest.animationFrames,lightingReferences:manifest.lightingReferences,warnings:manifest.elements.filter(e=>e.warnings.length).map(e=>({id:e.id,warnings:e.warnings}))},null,2));
}
async function contact(m){
 const W=1440,CW=360,CH=200,rows=Math.ceil(m.elements.length/4);if(!rows)return;
 const inputs=[];
 for(let i=0;i<m.elements.length;i++){
  const a=m.elements[i],x=i%4*CW,y=Math.floor(i/4)*CH;
  for(let v=0;v<3;v++){
   const variant=a.variants[v],p=variant.files[a.kind==='animation'?2:0],input=await sharp(path.join(OUT,p)).resize(108,154,{fit:'contain',kernel:nearest,background:'#26312c'}).flatten({background:'#26312c'}).png().toBuffer();inputs.push({input,left:x+v*114+8,top:y+34});
  }
  const label=`<svg width="350" height="32"><text x="8" y="23" fill="#d4dfcd" font-size="16" font-family="Arial">${a.label.replace(/&/g,'&amp;')}</text></svg>`;inputs.push({input:Buffer.from(label),left:x,top:y});
 }
 await sharp({create:{width:W,height:rows*CH,channels:4,background:'#26312c'}}).composite(inputs).png().toFile(path.join(OUT,'overview.png'));
 const chunks=Math.ceil(m.elements.length/20);for(let n=0;n<chunks;n++){
  const start=n*5*CH,height=Math.min(5*CH,rows*CH-start);if(height>0)await sharp(path.join(OUT,'overview.png')).extract({left:0,top:start,width:W,height}).png().toFile(path.join(OUT,`overview-${String(n+1).padStart(2,'0')}.png`));
 }
}
async function lightingPresets(){
 const presets={status:'proposed-renderer-settings',blendMode:'multiply',presets:{daylight:[{tint:'#fff4df',opacity:.04},{tint:'#fff1d8',opacity:.05},{tint:'#f5f4eb',opacity:.04}],dusk:[{tint:'#807c9b',opacity:.30},{tint:'#7c7897',opacity:.31},{tint:'#84809e',opacity:.29}],night:[{tint:'#273b63',opacity:.62},{tint:'#2a3d65',opacity:.61},{tint:'#253960',opacity:.63}]}};await json(path.join(OUT,'lighting-presets.json'),presets);
}
async function storyboards(m){
 const effects=m.elements.filter(e=>e.kind==='animation'),PW=480,PH=265;
 for(let page=0;page<Math.ceil(effects.length/9);page++){
  const group=effects.slice(page*9,page*9+9),inputs=[];
  for(let k=0;k<group.length;k++){
   const a=group[k],left=k%3*PW,top=Math.floor(k/3)*PH;
   inputs.push({input:Buffer.from(`<svg width="480" height="30"><text x="8" y="22" fill="#d4dfcd" font-size="16" font-family="Arial">${a.label}</text></svg>`),left,top});
   for(let v=0;v<3;v++)for(let f=0;f<6;f++)inputs.push({input:await sharp(path.join(OUT,a.variants[v].files[f])).resize(76,76,{kernel:nearest}).flatten({background:'#26312c'}).png().toBuffer(),left:left+f*80+2,top:top+32+v*77});
  }
  await sharp({create:{width:1440,height:Math.ceil(group.length/3)*PH,channels:4,background:'#26312c'}}).composite(inputs).png().toFile(path.join(OUT,`storyboard-${String(page+1).padStart(2,'0')}.png`));
 }
}
async function readme(m){
 const text=`# Окружение и эффекты — три варианта каждого элемента\n\nГотово ${m.generatedElements} из ${m.plannedElements} элементов, по три близких варианта A/B/C. Все три предназначены для совместного использования: это небольшие различия деталей, а не уровни силы или разные стили.\n\nВ экспорте: ${m.staticVariants} статичных вариантов, ${m.animations} анимаций / ${m.animationFrames} кадров, ${m.lightingReferences} референсов освещения.\n\n![Обзор](overview-01.png)\n\n## Просмотр\n\nОткройте [preview.html](preview.html) двойным щелчком. Просмотрщик работает локально без сервера: поиск, категории, варианты A/B/C рядом, светлый фон и остановка анимаций. На GitHub HTML показывается исходным кодом. Обзор всех элементов: [overview.png](overview.png).\n\n## Файлы\n\n- \`sources/<element>.png\` — неизменённые исходные листы встроенного image_gen, три варианта одного элемента на листе.\n- \`elements/<element>/*_a.png\`, \`*_b.png\`, \`*_c.png\` — отдельные статичные варианты.\n- У анимаций — шесть PNG-кадров на вариант, горизонтальный PNG-лист, JSON-атлас и GIF для просмотра.\n- [manifest.json](manifest.json) — состав и параметры экспорта; [manifest.js](manifest.js) — те же данные для локального просмотрщика.\n- [generation-plan.json](generation-plan.json) — полный перечень элементов и точные запросы генерации. Использован встроенный image_gen, без CLI/API-скриптов генерации.\n- \`records/*.json\` — происхождение каждого исходника.\n- \`elements/<element>/export.json\` — исходные области нарезки, результаты проверки альфа-канала и замечания.\n- [lighting-presets.json](lighting-presets.json) — предлагаемые настройки оттенка и интенсивности освещения.\n- [verification.json](verification.json) — последний отчёт проверки файлов.\n\n## Экспорт\n\nПокрытия: 64×64 пикселя, вид сверху. Предметы: прозрачные квадратные холсты 128/192/256 пикселей. Эффекты: 192×192, шесть кадров. Экспорт использует ближайшего соседа, сохраняет исходную прозрачность и один общий масштаб/область обрезки для всех вариантов и кадров элемента. Отдельные кадры не центрируются по отдельности.\n\nКоординаты: +X вправо, +Y вниз. У статичных предметов предложена нижняя центральная точка привязки, у покрытий и эффектов — центральная. Точные игровые размеры и коллизии выбираются при интеграции: большой холст не означает большой объект в мире. GIF служат просмотру: у одноразовых действий в конце есть пауза; игровые параметры находятся в manifest.\n\n## Границы готовности\n\nЭто сгенерированная графика и её экспорт. Проверка файлов подтверждает состав, уникальность, размеры, альфа-канал и атласы. Она не подтверждает бесшовность покрытий, геометрию соединений дорог или качество движения в движке. Эти свойства требуют проверки на собранной карте. Три панели дня/сумерек/ночи являются визуальными референсами; игровое освещение, погода, столкновения, открытие дверей и боевые события ещё не реализованы.\n\n## Воспроизведение экспорта\n\n\`node tools/build-environment-variants.cjs\`\n\n\`node tools/check-environment-variants.cjs\`\n\n\`node tools/build-environment-variants.cjs --zip\` — архив \`output/environment-variants-v1.zip\`. Исходную графику эти команды не генерируют.\n`;
 await fs.writeFile(path.join(OUT,'README.md'),text.replace(/\`/g,'`'));
}
async function zip(){
 const z=new JSZip();async function walk(dir,prefix=''){for(const f of await fs.readdir(dir,{withFileTypes:true})){const p=prefix+f.name;if(f.isDirectory())await walk(path.join(dir,f.name),p+'/');else z.file(p,await fs.readFile(path.join(dir,f.name)));}}await walk(OUT);
 const buf=await z.generateAsync({type:'nodebuffer',compression:'DEFLATE',compressionOptions:{level:6}});await JSZip.loadAsync(buf,{checkCRC32:true});const dest=path.join(ROOT,'output/environment-variants-v1.zip');await fs.writeFile(dest,buf);console.log(dest+' '+buf.length+' bytes, CRC verified');
}
(process.argv.includes('--zip')?zip():build()).catch(e=>{console.error(e);process.exitCode=1;});
