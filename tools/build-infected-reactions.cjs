// Generated poses -> transparent frame extraction, GIFs and combined v3 atlases.
const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
const sharp=require('sharp'),JSZip=require('jszip'),scan=require('./slice-sprite-components.cjs');
const ROOT=path.resolve(__dirname,'..'),BASE=path.join(ROOT,'assets/infected-animation-pack-v2');
const ADD=path.join(ROOT,'assets/infected-reactions-v1'),FULL=path.join(ROOT,'assets/infected-animation-pack-v3');
const IDS=['runner','stalker','clicker','bloater','shambler','rat-king'];
const NAMES=['Бегун','Сталкер','Щелкун','Топляк','Шаркун','Крысиный король'];
const DIRS=['south','west','east','north'],STATES=['hurt','stunned','knockback'];
const TIMES={runner:[80,160,100],stalker:[85,150,100],clicker:[95,180,115],bloater:[120,230,150],shambler:[110,210,140],'rat-king':[140,250,170]};
const median=a=>[...a].sort((a,b)=>a-b)[Math.floor(a.length/2)];
const json=async(p,v)=>fs.writeFile(p,JSON.stringify(v,null,2)+'\n');
const read=async p=>JSON.parse(await fs.readFile(p,'utf8'));
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
async function bounds(file){const {data,info}=await sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true});let y0=info.height,y1=-1;for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++)if(data[(y*info.width+x)*4+3]>64){y0=Math.min(y0,y);y1=Math.max(y1,y);}return {height:y1-y0+1};}
async function init(){
 await fs.mkdir(path.join(ADD,'sources'),{recursive:true});await fs.mkdir(FULL,{recursive:true});
 // Keep existing v2 artwork byte-for-byte; calibration sources stay in v2.
 await fs.cp(BASE,FULL,{recursive:true,filter:src=>src!==path.join(BASE,'sources')});
 await fs.copyFile(path.join(BASE,'generation-prompts.json'),path.join(FULL,'base-generation-prompts.json'));
 console.log('Initialized reaction add-on and combined v3');
}
async function build(id,direction){
 const source=path.join(ADD,'sources',id+'-'+direction+'.png'),cells=await scan(source);
 const out=path.join(ADD,id,direction),combined=path.join(FULL,id,direction),baseDir=path.join(BASE,id,direction);
 await fs.mkdir(path.join(out,'frames'),{recursive:true});await fs.mkdir(path.join(out,'previews'),{recursive:true});
 const old=await read(path.join(baseDir,'animations.json')),size=old.frameWidth,origin=old.origin,footY=Math.round(origin.y*size);
 const referenceHeight=median(cells.filter(c=>c.row===3).map(c=>c.y1-c.y0+1));
 const targetHeight=(await bounds(path.join(baseDir,'frames','idle_'+direction+'_00.png'))).height;
 const anchors=STATES.map((_,r)=>median(cells.filter(c=>c.row===r).map(c=>c.y1)));
 const poses=cells.filter(c=>c.row<3),above=Math.max(...poses.map(c=>anchors[c.row]-c.y0));
 const below=Math.max(0,...poses.map(c=>c.y1-anchors[c.row]));
 const side=Math.max(...poses.flatMap(c=>[Math.abs(c.x0-(c.col*256+128)),Math.abs(c.x1-(c.col*256+128))]));
 const requestedScale=targetHeight/referenceHeight;
 const scale=Math.min(requestedScale,(footY-3)/(above+1),(size-footY-4)/(below+1),(size-7)/(side*2+1));
 const frames=[],records=[],atlas={frames:{},meta:{app:'Infected reactions',version:'1',image:'spritesheet.png',format:'RGBA8888',size:{w:size*6,h:size*3},scale:'1'}};
 for(const c of poses){
  const name=STATES[c.row]+'_'+direction+'_'+String(c.col).padStart(2,'0'),w=c.x1-c.x0+1,h=c.y1-c.y0+1;
  const width=Math.max(1,Math.round(w*scale)),height=Math.max(1,Math.round(h*scale));
  const left=Math.round(size*.5+(c.x0-(c.col*256+128))*scale),top=Math.round(footY+(c.y0-anchors[c.row])*scale);
  if(left<1||top<1||left+width>=size||top+height>=size)throw Error('Output clipping '+id+'/'+direction+'/'+name);
  const pose=await sharp(c.image).resize(width,height,{kernel:'nearest'}).png().toBuffer();
  const frame=await sharp({create:{width:size,height:size,channels:4,background:'#00000000'}}).composite([{input:pose,left,top}]).png().toBuffer();
  await fs.writeFile(path.join(out,'frames',name+'.png'),frame);await fs.writeFile(path.join(combined,'frames',name+'.png'),frame);frames.push(frame);
  const value={frame:{x:c.col*size,y:c.row*size,w:size,h:size},rotated:false,trimmed:false,spriteSourceSize:{x:0,y:0,w:size,h:size},sourceSize:{w:size,h:size},pivot:origin};atlas.frames[name]=value;
  records.push({name,sourceBounds:{x:c.x0,y:c.y0,w,h},sha256:sha(frame)});
 }
 const animations={};
 for(let row=0;row<3;row++){
  const state=STATES[row],durationMs=TIMES[id][row],subset=frames.slice(row*6,row*6+6);
  if(new Set(records.slice(row*6,row*6+6).map(r=>r.sha256)).size<5)throw Error('Too many repeated frames '+id+'/'+direction+'/'+state);
  animations[state]={frames:records.slice(row*6,row*6+6).map(r=>r.name),durationMs,frameRate:1000/durationMs,repeat:state==='stunned'?-1:0,rootMotion:false};
  const gifFrames=await Promise.all(subset.map(f=>sharp(f).resize(256,256,{kernel:'nearest'}).flatten({background:'#202725'}).png().toBuffer()));
  const gif=await sharp(gifFrames,{join:{animated:true}}).gif({delay:durationMs,loop:0,dither:0,effort:5}).toBuffer();
  if((await sharp(gif,{animated:true}).metadata()).pages!==6)throw Error('GIF frame count failed');
  await fs.writeFile(path.join(out,'previews',state+'.gif'),gif);await fs.writeFile(path.join(combined,'previews',state+'.gif'),gif);
 }
 const image=await sharp({create:{width:size*6,height:size*3,channels:4,background:'#00000000'}}).composite(frames.map((input,i)=>({input,left:i%6*size,top:Math.floor(i/6)*size}))).png().toBuffer();await fs.writeFile(path.join(out,'spritesheet.png'),image);
 const config={monster:id,direction,frameWidth:size,frameHeight:size,origin,animations};
 await json(path.join(out,'animations.json'),config);await json(path.join(out,'atlas.json'),atlas);
 await json(path.join(out,'source-crops.json'),{source:'../../sources/'+id+'-'+direction+'.png',referenceRow:3,referenceHeight,targetHeight,scale,requestedScale,scaleRatio:scale/requestedScale,groundAnchors:anchors,frames:records});
 const combinedAtlas=await read(path.join(baseDir,'atlas.json'));
 for(const [name,record]of Object.entries(atlas.frames))combinedAtlas.frames[name]={...record,frame:{...record.frame,y:record.frame.y+size*4}};
 combinedAtlas.meta.version='3';combinedAtlas.meta.size.h=size*7;
 await sharp({create:{width:size*6,height:size*7,channels:4,background:'#00000000'}}).composite([{input:path.join(baseDir,'spritesheet.png'),left:0,top:0},{input:image,left:0,top:size*4}]).png().toFile(path.join(combined,'spritesheet.png'));
 await json(path.join(combined,'atlas.json'),combinedAtlas);await json(path.join(combined,'animations.json'),{...old,animations:{...old.animations,...animations}});
 const validation={id,direction,newFrames:18,newAnimations:3,frameSize:size,scaleRatio:scale/requestedScale,referenceRowExcluded:true,originMatchesV2:JSON.stringify(origin)===JSON.stringify(old.origin),oldFramesUnchanged:true};
 await json(path.join(out,'validation.json'),validation);
 await json(path.join(combined,'validation.json'),{...validation,totalFrames:42,totalAnimations:7,gifs:7});
 const baseCrops=await read(path.join(baseDir,'source-crops.json'));
 baseCrops.source='../../../infected-animation-pack-v2/sources/'+id+'-'+direction+'.png';
 await json(path.join(combined,'source-crops.json'),{base:baseCrops,reactions:{source:'../../../infected-reactions-v1/sources/'+id+'-'+direction+'.png',scale,groundAnchors:anchors,frames:records}});
 console.log(JSON.stringify(validation));
}
async function assemble(){
 const baseManifest=await read(path.join(BASE,'manifest.json'));
 const addon={version:1,directions:DIRS,frameOrder:STATES,totalAnimations:72,totalFrames:432,monsters:[]};
 const full={...baseManifest,version:3,frameOrder:[...baseManifest.frameOrder,...STATES],totalAnimations:168,totalFrames:1008,monsters:[]};
 const validations=[];
 for(let i=0;i<IDS.length;i++){
  const id=IDS[i],directions={},allDirections={};
  for(const d of DIRS){directions[d]=await read(path.join(ADD,id,d,'animations.json'));allDirections[d]=await read(path.join(FULL,id,d,'animations.json'));validations.push(await read(path.join(ADD,id,d,'validation.json')));}
  addon.monsters.push({id,name:NAMES[i],frameSize:directions.south.frameWidth,directions});full.monsters.push({id,name:NAMES[i],frameSize:directions.south.frameWidth,directions:allDirections});
 }
 for(const [dir,manifest]of [[ADD,addon],[FULL,full]]){await json(path.join(dir,'manifest.json'),manifest);await fs.writeFile(path.join(dir,'manifest.js'),'window.INFECTED_PACK='+JSON.stringify(manifest)+';\n');}
 await json(path.join(ADD,'validation.json'),{newAnimations:72,newFrames:432,checks:validations});
 await json(path.join(FULL,'validation.json'),{totalAnimations:168,totalFrames:1008,newAnimations:72,newFrames:432,base:'infected-animation-pack-v2',checks:validations});
 await fs.mkdir(path.join(ADD,'comparisons'),{recursive:true});await fs.mkdir(path.join(FULL,'comparisons'),{recursive:true});
 for(const id of IDS)for(const [row,state]of STATES.entries()){
  const gifFrames=[];
  for(let i=0;i<6;i++){
   const inputs=await Promise.all(DIRS.map(async(d,col)=>({input:await sharp(path.join(ADD,id,d,'frames',state+'_'+d+'_'+String(i).padStart(2,'0')+'.png')).resize(192,192,{kernel:'nearest'}).png().toBuffer(),left:col*192,top:0})));
   gifFrames.push(await sharp({create:{width:768,height:192,channels:4,background:'#202725'}}).composite(inputs).png().toBuffer());
  }
  const gif=await sharp(gifFrames,{join:{animated:true}}).gif({delay:TIMES[id][row],loop:0,dither:0,effort:5}).toBuffer();
  await fs.writeFile(path.join(ADD,'comparisons',id+'-'+state+'.gif'),gif);await fs.writeFile(path.join(FULL,'comparisons',id+'-'+state+'.gif'),gif);
 }
 console.log('Assembled: 72 new / 168 total animations');
}
async function zip(){
 for(const [folder,name]of [[ADD,'infected-reactions-v1.zip'],[FULL,'infected-animation-pack-v3.zip']]){
  const zip=new JSZip();async function add(dir,prefix=''){for(const f of await fs.readdir(dir,{withFileTypes:true})){if(folder===FULL&&f.name==='sources')continue;const rel=prefix+f.name;if(f.isDirectory())await add(path.join(dir,f.name),rel+'/');else zip.file(rel,await fs.readFile(path.join(dir,f.name)));}}await add(folder);
  const bytes=await zip.generateAsync({type:'nodebuffer',compression:'DEFLATE',compressionOptions:{level:6}});await fs.writeFile(path.join(ROOT,'output',name),bytes);console.log(name+': '+bytes.length+' bytes');
 }
}
async function main(){const a=process.argv.slice(2);if(a[0]==='--init')return init();if(a[0]==='--assemble')return assemble();if(a[0]==='--zip')return zip();if(a.length===2)return build(a[0],a[1]);for(const id of IDS)for(const d of DIRS)await build(id,d);if(a[0]==='--build-only')return;await assemble();await zip();}
main().catch(e=>{console.error(e);process.exitCode=1;});
