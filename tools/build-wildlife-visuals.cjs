const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
function dep(n){try{return require(n);}catch{return require(path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules',n));}}
const sharp=dep('sharp'),JSZip=dep('jszip'),ROOT=path.resolve(__dirname,'..'),OUT=path.join(ROOT,'assets/wildlife-visuals-v1');
const catalog=require('./wildlife-catalog.cjs'),dirs=['south','west','east','north'],dirLabels=['Спереди','Слева','Справа','Сзади'],variants=['a','b','c'];
const json=(p,o)=>fs.writeFile(p,JSON.stringify(o,null,2)+'\n'),hash=b=>crypto.createHash('sha256').update(b).digest('hex');
async function bounds(input){
 const {data,info}=await sharp(input).ensureAlpha().raw().toBuffer({resolveWithObject:true});let x0=info.width,y0=info.height,x1=-1,y1=-1,visible=0,edge=0,clear=0;
 for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){const a=data[(y*info.width+x)*4+3];if(a===0)clear++;if(a>12){visible++;x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);if(x===0||y===0||x===info.width-1||y===info.height-1)edge++;}}
 if(!visible)throw Error('Empty source sprite');const pad=4;return {left:Math.max(0,x0-pad),top:Math.max(0,y0-pad),width:Math.min(info.width-1,x1+pad)-Math.max(0,x0-pad)+1,height:Math.min(info.height-1,y1+pad)-Math.max(0,y0-pad)+1,visible,edge,transparentPixels:clear};
}
async function sourceCells(file){
 const m=await sharp(file).metadata(),out=[];
 // Static turnarounds often allocate more horizontal room to side views.
 // Locate transparent separators instead of cutting off heads at nominal quarters.
 const {data,info}=await sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 function cuts(parts,axis){
  const length=axis==='x'?info.width:info.height,cross=axis==='x'?info.height:info.width,radius=Math.floor(length*(axis==='x'?.115:.065)),result=[0];
  for(let n=1;n<parts;n++){
   const center=Math.round(n*length/parts);let best=center,score=Infinity;
   for(let p=Math.max(result.at(-1)+1,center-radius);p<Math.min(length-1,center+radius);p++){
    let solid=0;for(let q=0;q<cross;q++){const x=axis==='x'?p:q,y=axis==='x'?q:p;if(data[(y*info.width+x)*4+3]>12)solid++;}
    const candidate=solid*10000+Math.abs(p-center);if(candidate<score){score=candidate;best=p;}
   }result.push(best);
  }result.push(length);return result;
 }
 const xs=cuts(4,'x'),ys=cuts(3,'y');
 for(let row=0;row<3;row++)for(let col=0;col<4;col++){
  const left=xs[col],top=ys[row],width=xs[col+1]-left,height=ys[row+1]-top;
  const input=await sharp(file).extract({left,top,width,height}).ensureAlpha().png().toBuffer();out.push({row,col,input,sourceRect:{left,top,width,height},bounds:await bounds(input)});
 }return out;
}
async function compose(w,h,inputs,bg='#26312b'){return sharp({create:{width:w,height:h,channels:4,background:bg}}).composite(inputs).png().toBuffer();}
const label=(text,w=480,h=30)=>Buffer.from(`<svg width="${w}" height="${h}"><text x="8" y="22" fill="#dce3d3" font-size="16" font-family="Arial">${text}</text></svg>`);
async function build(){
 const m={version:1,tool:'built-in image_gen',kind:'static-directional-animal-visuals',plannedSpecies:catalog.length,speciesCount:0,designs:0,spriteCount:0,variantsPerSpecies:3,directions:dirs,animated:false,notes:['Static idle turnarounds only; no walk/run/attack animations or animal AI.','One common export scale per species, with bottom-center placement for each static pose.','Display sizes are proposed game settings; engine integration has not been tested.'],species:[],missing:[]};
 await fs.mkdir(path.join(OUT,'sprites'),{recursive:true});
 for(const [id,name,subject,canvas,worldHeight] of catalog){
  let source='sources/'+id+'.png';try{await fs.access(path.join(OUT,source));}catch{m.missing.push(id);continue;}
  try{await fs.access(path.join(OUT,'sources/'+id+'-v2.png'));source='sources/'+id+'-v2.png';}catch{}
  const cells=await sourceCells(path.join(OUT,source)),maxW=Math.max(...cells.map(c=>c.bounds.width)),maxH=Math.max(...cells.map(c=>c.bounds.height)),scale=Math.min((canvas-8)/maxW,(canvas-8)/maxH),folder=path.join(OUT,'sprites',id);
  await fs.mkdir(folder,{recursive:true});const animal={id,name,subject,canvas,suggestedWorldHeight:worldHeight,source,scale,variants:[],warnings:[]};
  if(cells.some(c=>c.bounds.transparentPixels===0))animal.warnings.push('Inspect source transparency.');
  if(cells.some(c=>c.bounds.edge>4))animal.warnings.push('Source pixels touch a grid boundary; inspect small tips and tails.');
  const images=[];
  for(let row=0;row<3;row++){
   const v=variants[row],key=id+'_'+v,entry={id:key,variant:v.toUpperCase(),origin:{x:.5,y:1},files:{},sha256:{},atlas:'sprites/'+id+'/'+key+'-atlas.json',sheet:'sprites/'+id+'/'+key+'-sheet.png'},sheetFrames=[],atlas={frames:{},meta:{image:key+'-sheet.png',size:{w:canvas*4,h:canvas},scale:'1'}};
   for(let col=0;col<4;col++){
    const c=cells[row*4+col],b=c.bounds,w=Math.max(1,Math.round(b.width*scale)),h=Math.max(1,Math.round(b.height*scale));
    const cropped=await sharp(c.input).extract({left:b.left,top:b.top,width:b.width,height:b.height}).resize(w,h,{kernel:'nearest'}).png().toBuffer();
    const input=await compose(canvas,canvas,[{input:cropped,left:Math.floor((canvas-w)/2),top:canvas-4-h}],'#00000000'),file=key+'_'+dirs[col]+'.png';
    await fs.writeFile(path.join(folder,file),input);entry.files[dirs[col]]='sprites/'+id+'/'+file;entry.sha256[dirs[col]]=hash(input);sheetFrames.push(input);images.push(input);
    atlas.frames[key+'_'+dirs[col]]={frame:{x:col*canvas,y:0,w:canvas,h:canvas},rotated:false,trimmed:false,spriteSourceSize:{x:0,y:0,w:canvas,h:canvas},sourceSize:{w:canvas,h:canvas},pivot:entry.origin};
   }
   await fs.writeFile(path.join(OUT,entry.sheet),await compose(canvas*4,canvas,sheetFrames.map((input,i)=>({input,left:i*canvas,top:0})),'#00000000'));await json(path.join(OUT,entry.atlas),atlas);animal.variants.push(entry);
  }
  await json(path.join(folder,'source-crops.json'),{source,commonScale:scale,canvas,staticPosePlacement:'bottom-center; four-pixel padding',cells:cells.map(c=>({row:c.row,col:c.col,sourceRect:c.sourceRect,crop:c.bounds}))});
  const panels=[{input:label(name,512),left:0,top:0}];for(let col=0;col<4;col++)panels.push({input:label(dirLabels[col],128),left:col*128,top:30});
  for(let i=0;i<12;i++)panels.push({input:await sharp(images[i]).resize(128,128,{kernel:'nearest'}).flatten({background:'#26312b'}).png().toBuffer(),left:i%4*128,top:60+Math.floor(i/4)*128});
  animal.overview='sprites/'+id+'/overview.png';await fs.writeFile(path.join(OUT,animal.overview),await compose(512,444,panels));
  m.species.push(animal);m.speciesCount++;m.designs+=3;m.spriteCount+=12;console.log(name+': 3 variants, 4 directions, 12 PNG');
 }
 m.selectedVariant='B';m.activeDesigns=m.speciesCount;for(const a of m.species){const v=a.variants.find(v=>v.variant==='B');a.selectedVariant='B';a.selectedFiles=v.files;a.selectedDesignId=v.id;}
 await json(path.join(OUT,'manifest.json'),m);await fs.writeFile(path.join(OUT,'manifest.js'),'window.WILDLIFE='+JSON.stringify(m)+';\n');
 await overviews(m);await readme(m);
 const planPath=path.join(OUT,'generation-plan.json');try{const p=JSON.parse(await fs.readFile(planPath,'utf8'));p.generatedSpecies=m.speciesCount;p.exportedSprites=m.spriteCount;for(const e of p.elements){const a=m.species.find(a=>a.id===e.id);e.status=a?'generated':'pending';if(a)e.selectedSource=a.source;}await json(planPath,p);}catch(e){console.warn('Plan update: '+e.message);}
 console.log(JSON.stringify({species:m.speciesCount,designs:m.designs,sprites:m.spriteCount,missing:m.missing,warnings:m.species.filter(a=>a.warnings.length).map(a=>a.id)},null,2));
}
async function overviews(m){
 if(!m.species.length)return;const inputs=[];
 for(let n=0;n<m.species.length;n++){
  const a=m.species[n],x=n%4*360,y=Math.floor(n/4)*190;inputs.push({input:label(a.name,360),left:x,top:y});
  for(let v=0;v<3;v++)inputs.push({input:await sharp(path.join(OUT,a.variants[v].files.west)).resize(112,150,{fit:'contain',kernel:'nearest',background:'#26312b'}).flatten({background:'#26312b'}).png().toBuffer(),left:x+v*120+4,top:y+32});
 }await fs.writeFile(path.join(OUT,'overview.png'),await compose(1440,Math.ceil(m.species.length/4)*190,inputs));
 for(let page=0;page<Math.ceil(m.species.length/6);page++){
  const group=m.species.slice(page*6,page*6+6),items=[];
  for(let n=0;n<group.length;n++){
   const a=group[n],x=n%3*480,y=Math.floor(n/3)*350;items.push({input:label(a.name),left:x,top:y});
   for(let v=0;v<3;v++)for(let d=0;d<4;d++)items.push({input:await sharp(path.join(OUT,a.variants[v].files[dirs[d]])).resize(112,102,{fit:'contain',kernel:'nearest',background:'#26312b'}).flatten({background:'#26312b'}).png().toBuffer(),left:x+d*120+4,top:y+32+v*105});
  }await fs.writeFile(path.join(OUT,'directions-'+String(page+1).padStart(2,'0')+'.png'),await compose(1440,Math.ceil(group.length/3)*350,items));
 }
}
async function readme(m){await fs.writeFile(path.join(OUT,'README.md'),`# Животные — статичные визуалы v1\n\nГотово ${m.speciesCount} из 20 видов, ${m.designs} обликов и ${m.spriteCount} отдельных PNG: три близких варианта A/B/C, четыре направления (south, west, east, north). Для игры выбран вариант B у всех видов; A/C сохранены как предыдущие варианты.\n\n![Обзор](overview.png)\n\n[Просмотрщик](preview.html) открывается локально двойным щелчком без сервера. На GitHub HTML показывается исходным кодом. [Все ракурсы, лист 1](directions-01.png), [лист 2](directions-02.png), [лист 3](directions-03.png), [лист 4](directions-04.png).\n\n## Состав\n\n${m.species.map(a=>'- '+a.name+' — [12 ракурсов]('+a.overview+').').join('\n')}\n\n## Файлы и происхождение\n\nГрафика создана встроенным image_gen. [Полные запросы](generation-plan.json), неизменённые исходные листы в sources, записи происхождения в records. Отдельные изображения и три горизонтальных спрайт-листа каждого животного с JSON-атласами находятся в sprites. [Манифест](manifest.json) содержит пути, размеры, контрольные суммы и предлагаемый игровой масштаб. [Проверка файлов](verification.json).\n\nНарезка сохраняет исходный альфа-канал. Один общий масштаб используется для всех 12 ракурсов вида; статичные позы расположены по нижнему центру. Увеличение/уменьшение выполняется ближайшим соседом. Виды на общем листе показаны для просмотра, а не в едином физическом масштабе.\n\n## Готовность\n\nЭто статичные ракурсы спокойной позы, а не анимации ходьбы, бега, полёта, плавания или атак. Поведение животных и подключение к игре пока не реализованы. Окончательные размеры, ориентацию, мелкие детали на границах исходной сетки и точки привязки следует проверить в движке.\n\nЭкспорт: node tools/build-wildlife-visuals.cjs\n\nПроверка: node tools/check-wildlife-visuals.cjs\n\nАрхив: node tools/build-wildlife-visuals.cjs --zip — output/wildlife-visuals-v1.zip. Эти команды экспортируют готовую графику, не генерируют новые изображения.\n`);}
async function zip(){const z=new JSZip();async function walk(dir,prefix=''){for(const f of await fs.readdir(dir,{withFileTypes:true})){const rel=prefix+f.name;if(f.isDirectory())await walk(path.join(dir,f.name),rel+'/');else z.file(rel,await fs.readFile(path.join(dir,f.name)));}}await walk(OUT);const b=await z.generateAsync({type:'nodebuffer',compression:'DEFLATE',compressionOptions:{level:6}});await JSZip.loadAsync(b,{checkCRC32:true});await fs.writeFile(path.join(ROOT,'output/wildlife-visuals-v1.zip'),b);console.log('wildlife-visuals-v1.zip: '+b.length+' bytes; CRC verified');}
(process.argv.includes('--zip')?zip():build()).catch(e=>{console.error(e);process.exitCode=1;});
