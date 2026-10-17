// Generated death poses -> native PNGs, terminal corpses, Phaser atlases and GIF previews.
const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
const sharp=require('sharp'),JSZip=require('jszip'),scan=require('./slice-sprite-components.cjs');
const ROOT=path.resolve(__dirname,'..'),BASE=path.join(ROOT,'assets/infected-animation-pack-v3');
const ADD=path.join(ROOT,'assets/infected-deaths-v1'),FULL=path.join(ROOT,'assets/infected-animation-pack-v4');
const IDS=['runner','stalker','clicker','bloater','shambler','rat-king'],DIRS=['south','west','east','north'];
const TIMES={runner:130,stalker:140,clicker:160,bloater:210,shambler:190,'rat-king':250};
const json=async(p,v)=>fs.writeFile(p,JSON.stringify(v,null,2)+'\n');
const read=async p=>JSON.parse(await fs.readFile(p,'utf8'));
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
async function tileImages(width,height,inputs){
 const pixels=Buffer.alloc(width*height*4);
 for(const {input,left,top}of inputs){const{data,info}=await sharp(input).ensureAlpha().raw().toBuffer({resolveWithObject:true});for(let y=0;y<info.height;y++)data.copy(pixels,((top+y)*width+left)*4,y*info.width*4,(y+1)*info.width*4);}
 return sharp(pixels,{raw:{width,height,channels:4}}).png().toBuffer();
}
async function bounds(file){const {data,info}=await sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true});let x0=info.width,y0=info.height,x1=-1,y1=-1;for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++)if(data[(y*info.width+x)*4+3]>64){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}return{x0,y0,x1,y1,width:x1-x0+1,height:y1-y0+1};}
async function init(){await fs.mkdir(FULL,{recursive:true});await fs.cp(BASE,FULL,{recursive:true,filter:s=>s!==path.join(BASE,'sources')});console.log('Initialized combined v4 from approved v3');}
async function build(id){
 const cells=await scan(path.join(ADD,'sources',id+'.png'));
 for(const [row,dir]of DIRS.entries()){
  const out=path.join(ADD,id,dir),base=path.join(BASE,id,dir),combined=path.join(FULL,id,dir);
  await fs.mkdir(path.join(out,'frames'),{recursive:true});await fs.mkdir(path.join(out,'previews'),{recursive:true});
  const old=await read(path.join(base,'animations.json')),size=old.frameWidth,origin=old.origin;
  const target=await bounds(path.join(base,'frames','idle_'+dir+'_00.png'));
  const poses=cells.filter(c=>c.row===row),first=poses[0];
  // One fixed transform for the WHOLE fall. Do not bottom-align or recenter each pose.
  const anchor={x:(first.x0+first.x1)/2,y:first.y1-row*256};
  const scale=target.height/(first.y1-first.y0+1),destX=(target.x0+target.x1)/2,destY=target.y1;
  const records=[],frames=[],atlas={frames:{},meta:{app:'Infected death animation',version:'1',image:'spritesheet.png',format:'RGBA8888',size:{w:size*6,h:size},scale:'1'}};
  for(const c of poses){
   const name='death_'+dir+'_'+String(c.col).padStart(2,'0'),w=c.x1-c.x0+1,h=c.y1-c.y0+1;
   const width=Math.max(1,Math.round(w*scale)),height=Math.max(1,Math.round(h*scale));
   const left=Math.round(destX+(c.x0-c.col*256-anchor.x)*scale),top=Math.round(destY+(c.y0-row*256-anchor.y)*scale);
   if(left<1||top<1||left+width>=size||top+height>=size)throw Error('Clipping '+id+'/'+dir+'/'+c.col+': '+JSON.stringify({left,top,width,height,size}));
   const pose=await sharp(c.image).resize(width,height,{kernel:'nearest'}).png().toBuffer();
   const frame=await sharp({create:{width:size,height:size,channels:4,background:'#00000000'}}).composite([{input:pose,left,top}]).png().toBuffer();
   frames.push(frame);await fs.writeFile(path.join(out,'frames',name+'.png'),frame);await fs.writeFile(path.join(combined,'frames',name+'.png'),frame);
   atlas.frames[name]={frame:{x:c.col*size,y:0,w:size,h:size},rotated:false,trimmed:false,spriteSourceSize:{x:0,y:0,w:size,h:size},sourceSize:{w:size,h:size},pivot:origin};
   records.push({name,sourceBounds:{x:c.x0,y:c.y0,w,h},destination:{x:left,y:top,w:width,h:height},sha256:sha(frame)});
  }
  if(new Set(records.map(r=>r.sha256)).size!==6)throw Error('Repeated death poses '+id+'/'+dir);
  const corpse={frame:records[5].name,image:'corpse.png',static:true,origin,rootMotion:false};
  const death={frames:records.map(r=>r.name),durationMs:TIMES[id],frameRate:1000/TIMES[id],repeat:0,rootMotion:false,terminalFrame:corpse.frame,holdLastFrame:true};
  const config={monster:id,direction:dir,frameWidth:size,frameHeight:size,origin,animations:{death},corpse};
  const sheet=await tileImages(size*6,size,frames.map((input,col)=>({input,left:col*size,top:0})));
  await fs.writeFile(path.join(out,'spritesheet.png'),sheet);
  const previews=await Promise.all(frames.map(f=>sharp(f).resize(256,256,{kernel:'nearest'}).flatten({background:'#202725'}).png().toBuffer()));
  const delays=Array(6).fill(TIMES[id]);delays[5]=2200;
  const gif=await sharp(previews,{join:{animated:true}}).gif({delay:delays,loop:0,dither:0,effort:5}).toBuffer();
  for(const folder of[out,combined]){await fs.writeFile(path.join(folder,'corpse.png'),frames[5]);await fs.writeFile(path.join(folder,'previews/death.gif'),gif);}
  await json(path.join(out,'animations.json'),config);await json(path.join(out,'atlas.json'),atlas);
  const fullAtlas=await read(path.join(base,'atlas.json'));for(const[name,value]of Object.entries(atlas.frames))fullAtlas.frames[name]={...value,frame:{...value.frame,y:size*7}};
  fullAtlas.meta.version='4';fullAtlas.meta.size.h=size*8;
  await fs.writeFile(path.join(combined,'spritesheet.png'),await tileImages(size*6,size*8,[{input:path.join(base,'spritesheet.png'),left:0,top:0},{input:sheet,left:0,top:size*7}]));
  await json(path.join(combined,'atlas.json'),fullAtlas);await json(path.join(combined,'animations.json'),{...old,animations:{...old.animations,death},corpse});
  const crops={source:'../../sources/'+id+'.png',directionRow:row,fixedSourceAnchor:anchor,fixedDestinationAnchor:{x:destX,y:destY},scale,targetHeight:target.height,frameTransformsFixed:true,frames:records};
  await json(path.join(out,'source-crops.json'),crops);
  await json(path.join(combined,'source-crops.json'),{previousPack:'../../../infected-animation-pack-v3/'+id+'/'+dir+'/source-crops.json',death:{...crops,source:'../../../infected-deaths-v1/sources/'+id+'.png'}});
  const validation={id,direction:dir,frameSize:size,deathFrames:6,deathAnimations:1,staticCorpses:1,uniqueFrames:6,repeat:0,rootMotion:false,fixedTransform:true,corpseEqualsLastFrame:true,originMatchesV3:true};
  for(const folder of[out,combined])await json(path.join(folder,'validation.json'),validation);
  console.log(JSON.stringify(validation));
 }
}
async function assemble(){
 const old=await read(path.join(BASE,'manifest.json'));
 const addon={version:1,directions:DIRS,frameOrder:['death'],totalAnimations:24,totalFrames:144,totalCorpses:24,monsters:[]};
 const full={...old,version:4,frameOrder:[...old.frameOrder,'death'],totalAnimations:192,totalFrames:1152,totalCorpses:24,monsters:[]};
 for(const m of old.monsters){const directions={},all={};for(const d of DIRS){directions[d]=await read(path.join(ADD,m.id,d,'animations.json'));all[d]=await read(path.join(FULL,m.id,d,'animations.json'));}addon.monsters.push({...m,directions});full.monsters.push({...m,directions:all});}
 for(const[folder,manifest]of[[ADD,addon],[FULL,full]]){await json(path.join(folder,'manifest.json'),manifest);await fs.writeFile(path.join(folder,'manifest.js'),'window.INFECTED_PACK='+JSON.stringify(manifest)+';\n');await fs.mkdir(path.join(folder,'comparisons'),{recursive:true});}
 await json(path.join(ADD,'validation.json'),{deathAnimations:24,deathFrames:144,staticCorpses:24,framesPerAnimation:6,directions:DIRS,repeat:0,corpseEqualsLastFrame:true});
 await json(path.join(FULL,'validation.json'),{version:4,totalAnimations:192,totalFrames:1152,staticCorpses:24,newAnimations:24,newFrames:144,previousPack:'infected-animation-pack-v3',oldFramesPreserved:1008});
 await json(path.join(FULL,'death-provenance.json'),{tool:'built-in image_gen',sourcePack:'../infected-deaths-v1',prompts:'../infected-deaths-v1/generation-prompts.json',sources:'../infected-deaths-v1/sources',references:'../infected-deaths-v1/references'});
 for(const id of IDS){
  const previews=[];
  for(let i=0;i<6;i++){
   const inputs=await Promise.all(DIRS.map(async(d,col)=>({input:await sharp(path.join(ADD,id,d,'frames','death_'+d+'_'+String(i).padStart(2,'0')+'.png')).resize(192,192,{kernel:'nearest'}).png().toBuffer(),left:col*192,top:0})));
   previews.push(await sharp({create:{width:768,height:192,channels:4,background:'#202725'}}).composite(inputs).png().toBuffer());
  }
  const delay=Array(6).fill(TIMES[id]);delay[5]=2200;
  const gif=await sharp(previews,{join:{animated:true}}).gif({delay,loop:0,dither:0,effort:5}).toBuffer();
  for(const folder of[ADD,FULL])await fs.writeFile(path.join(folder,'comparisons',id+'-death.gif'),gif);
 }
 // A labeled overview for inspection: static bodies, not an additional animation.
 const inputs=[],labels=[];
 for(const[row,id]of IDS.entries())for(const[col,d]of DIRS.entries()){
  inputs.push({input:await sharp(path.join(ADD,id,d,'corpse.png')).resize(192,192,{kernel:'nearest'}).png().toBuffer(),left:col*240+40,top:row*210+40});
  if(row===0)labels.push(`<text x="${col*240+130}" y="28" text-anchor="middle">${d}</text>`);
  if(col===0)labels.push(`<text x="8" y="${row*210+68}" font-size="12">${id}</text>`);
 }
 inputs.push({input:Buffer.from(`<svg width="1000" height="1320"><g fill="#d8c18e" font-family="monospace" font-size="16">${labels.join('')}</g></svg>`),left:0,top:0});
 await sharp({create:{width:1000,height:1320,channels:4,background:'#17211b'}}).composite(inputs).png().toFile(path.join(ADD,'corpses-overview.png'));
 console.log('Assembled: 24 death animations / 144 frames / 24 static corpses; v4 192 animations / 1152 frames');
}
async function zip(){for(const[folder,name]of[[ADD,'infected-deaths-v1.zip'],[FULL,'infected-animation-pack-v4.zip']]){
 const zip=new JSZip();async function add(dir,prefix=''){for(const f of await fs.readdir(dir,{withFileTypes:true})){const rel=prefix+f.name;if(f.isDirectory())await add(path.join(dir,f.name),rel+'/');else zip.file(rel,await fs.readFile(path.join(dir,f.name)));}}await add(folder);
 const buffer=await zip.generateAsync({type:'nodebuffer',compression:'DEFLATE',compressionOptions:{level:6}});await fs.writeFile(path.join(ROOT,'output',name),buffer);console.log(name+': '+buffer.length+' bytes');
}}
async function main(){const arg=process.argv[2];if(arg==='--init')return init();if(arg==='--assemble')return assemble();if(arg==='--zip')return zip();if(IDS.includes(arg))return build(arg);for(const id of IDS)await build(id);await assemble();await zip();}
main().catch(e=>{console.error(e);process.exitCode=1;});
