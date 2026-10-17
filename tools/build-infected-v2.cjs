const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const sharp = require('sharp');
const JSZip = require('jszip');
const ROOT=path.resolve(__dirname,'..');
const OUT=path.join(ROOT,'assets/infected-animation-pack-v2');
const IDS=['runner','stalker','clicker','bloater','shambler','rat-king'];
const NAMES=['Бегун','Сталкер','Щелкун','Топляк','Шаркун','Крысиный король'];
const DIRS=['south','west','east','north'];
const STATES=['idle','walk','run','attack'];
const TIMES={runner:[200,150,90,110],stalker:[240,170,85,110],clicker:[260,200,110,130],bloater:[300,240,150,160],shambler:[280,230,160,160],'rat-king':[320,260,160,180]};
const median=a=>[...a].sort((a,b)=>a-b)[Math.floor(a.length/2)];
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const json=async(f,v)=>fs.writeFile(f,JSON.stringify(v,null,2)+'\n');
function cut(counts,ideal,radius){let best=ideal,score=Infinity;for(let i=Math.max(1,ideal-radius);i<Math.min(counts.length-1,ideal+radius);i++){const s=(counts[i-1]+counts[i]+counts[i+1])*1000+Math.abs(i-ideal);if(s<score){score=s;best=i;}}return best;}
async function rectangularScan(source){
 const {data,info}=await sharp(source).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const W=info.width,H=info.height;
 if(W!==1536||H!==1024)throw Error(source+': invalid sheet dimensions '+W+'x'+H);
 const opaque=(x,y)=>x>=0&&x<W&&y>=0&&y<H&&data[(y*W+x)*4+3]>64;
 const rows=Array(H).fill(0);
 for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(opaque(x,y))rows[y]++;
 const ys=[0,...[1,2,3].map(r=>cut(rows,r*256,65)),H],cells=[];
 for(let row=0;row<4;row++){
  const cols=Array(W).fill(0);for(let y=ys[row];y<ys[row+1];y++)for(let x=0;x<W;x++)if(opaque(x,y))cols[x]++;
  const xs=[0,...[1,2,3,4,5].map(c=>cut(cols,c*256,55)),W];
  for(let col=0;col<6;col++){
   const localRows=Array(H).fill(0);for(let y=0;y<H;y++)for(let x=xs[col];x<xs[col+1];x++)if(opaque(x,y))localRows[y]++;
   const ya=row===0?0:cut(localRows,row*256,75),yb=row===3?H:cut(localRows,(row+1)*256,75);
   let x0=W,y0=H,x1=-1,y1=-1,n=0,severedPixels=0;
   for(let y=ya;y<yb;y++)for(let x=xs[col];x<xs[col+1];x++)if(opaque(x,y)){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);n++;}
   if(n<100)throw Error(source+': empty '+row+'/'+col);
   for(let y=ya;y<yb;y++){if(opaque(xs[col]-1,y)&&opaque(xs[col],y))severedPixels++;if(opaque(xs[col+1]-1,y)&&opaque(xs[col+1],y))severedPixels++;}
   for(let x=xs[col];x<xs[col+1];x++){if(opaque(x,ya-1)&&opaque(x,ya))severedPixels++;if(opaque(x,yb-1)&&opaque(x,yb))severedPixels++;}
   x0=Math.max(xs[col],x0-1);x1=Math.min(xs[col+1]-1,x1+1);y0=Math.max(ya,y0-1);y1=Math.min(yb-1,y1+1);
   cells.push({row,col,x0,y0,x1,y1,severedPixels});
  }
 }
 return cells;
}
const scanComponents=require('./slice-sprite-components.cjs');
const scanCache=new Map();
async function scan(source){if(!scanCache.has(source))scanCache.set(source,scanComponents(source));return scanCache.get(source);}
function geometry(cells,size){
 const anchors=STATES.map((_,r)=>median(cells.filter(c=>c.row===r).map(c=>c.y1)));
 const above=Math.max(...cells.map(c=>anchors[c.row]-c.y0));
 const below=Math.max(0,...cells.map(c=>c.y1-anchors[c.row]));
 const side=Math.max(...cells.flatMap(c=>[Math.abs(c.x0-(c.col*256+128)),Math.abs(c.x1-(c.col*256+128))]));
 const idleHeight=median(cells.filter(c=>c.row===0).map(c=>c.y1-c.y0+1));
 const footY=Math.round(size*.875);
 const fit=Math.min((footY-3)/(above+1),(size-footY-4)/(below+1),(size-8)/(2*side+1));
 return {anchors,idleHeight,footY,fit};
}
async function buildSheet(id,direction,size){
 const dest=path.join(OUT,id,direction),source=path.join(OUT,'sources',id+'-'+direction+'.png');
 await fs.mkdir(path.join(dest,'frames'),{recursive:true});await fs.mkdir(path.join(dest,'previews'),{recursive:true});
 const cells=await scan(source),{anchors,idleHeight,footY,fit}=geometry(cells,size);
 let commonHeight=Math.min(size*.72,idleHeight*fit);
 for(const d of DIRS){const p=path.join(OUT,'sources',id+'-'+d+'.png');try{await fs.access(p);}catch{continue;}const g=geometry(await scan(p),size);commonHeight=Math.min(commonHeight,g.idleHeight*g.fit);}
 const scale=commonHeight/idleHeight;
 const origin={x:.5,y:footY/size},frames=[],records=[];
 const atlas={frames:{},meta:{app:'Infected animation pack',version:'2',image:'spritesheet.png',format:'RGBA8888',size:{w:size*6,h:size*4},scale:'1'}};
 for(const c of cells){
  const name=STATES[c.row]+'_'+direction+'_'+String(c.col).padStart(2,'0');
  const w=c.x1-c.x0+1,h=c.y1-c.y0+1,dw=Math.max(1,Math.round(w*scale)),dh=Math.max(1,Math.round(h*scale));
  const left=Math.round(size/2+(c.x0-(c.col*256+128))*scale),top=Math.round(footY+(c.y0-anchors[c.row])*scale);
  if(left<1||top<1||left+dw>=size||top+dh>=size)throw Error(id+'/'+direction+': clipping '+name);
  const sprite=await sharp(c.image).resize(dw,dh,{kernel:'nearest'}).png().toBuffer();
  const frame=await sharp({create:{width:size,height:size,channels:4,background:'#00000000'}}).composite([{input:sprite,left,top}]).png().toBuffer();
  await fs.writeFile(path.join(dest,'frames',name+'.png'),frame);frames.push(frame);
  atlas.frames[name]={frame:{x:c.col*size,y:c.row*size,w:size,h:size},rotated:false,trimmed:false,spriteSourceSize:{x:0,y:0,w:size,h:size},sourceSize:{w:size,h:size},pivot:origin};
  records.push({name,sourceBounds:{x:c.x0,y:c.y0,w,h},severedPixels:c.severedPixels,sha256:hash(frame)});
 }
 const animations={};
 await sharp({create:{width:size*6,height:size*4,channels:4,background:'#00000000'}}).composite(frames.map((input,i)=>({input,left:i%6*size,top:Math.floor(i/6)*size}))).png().toFile(path.join(dest,'spritesheet.png'));
 for(let row=0;row<4;row++){
  const state=STATES[row],durationMs=TIMES[id][row];
  const names=records.slice(row*6,row*6+6).map(r=>r.name);
  const hashes=records.slice(row*6,row*6+6).map(r=>r.sha256);
  if(new Set(hashes).size<5)throw Error(id+'/'+direction+'/'+state+': repeated frames');
  animations[state]={frames:names,durationMs,frameRate:1000/durationMs,repeat:state==='attack'?0:-1,...(state==='attack'?{event:{name:id==='shambler'?'spore-release':'hit',frame:3}}:{})};
  const gifFrames=await Promise.all(frames.slice(row*6,row*6+6).map(f=>sharp(f).resize(256,256,{kernel:'nearest'}).flatten({background:'#202725'}).png().toBuffer()));
  await sharp(gifFrames,{join:{animated:true}}).gif({delay:durationMs,loop:0,dither:0,effort:5}).toFile(path.join(dest,'previews',state+'.gif'));
  const meta=await sharp(path.join(dest,'previews',state+'.gif'),{animated:true}).metadata();if(meta.pages!==6)throw Error('Invalid GIF frame count');
 }
 const walkHashes=records.slice(6,12).map(r=>r.sha256),runHashes=records.slice(12,18).map(r=>r.sha256);
 if(walkHashes.every((h,i)=>h===runHashes[i]))throw Error(id+'/'+direction+': walk equals run');
 const config={monster:id,direction,frameWidth:size,frameHeight:size,origin,animations};
 await json(path.join(dest,'atlas.json'),atlas);await json(path.join(dest,'animations.json'),config);
 await json(path.join(dest,'source-crops.json'),{source:'../../sources/'+id+'-'+direction+'.png',scale,groundAnchors:anchors,frames:records});
 const validation={id,direction,frames:24,gifs:4,frameSize:size,cutCrossings:records.filter(r=>r.severedPixels>0).map(r=>({frame:r.name,pixels:r.severedPixels})),distinctWalkRun:true};
 await json(path.join(dest,'validation.json'),validation);
 console.log(JSON.stringify(validation));return {config,validation};
}
async function assemble(){
 const manifest={version:2,directions:DIRS,frameOrder:STATES,totalAnimations:96,totalFrames:576,monsters:[]},checks=[];
 for(let mi=0;mi<IDS.length;mi++){
  const id=IDS[mi],directions={};
  for(const direction of DIRS){const dir=path.join(OUT,id,direction);directions[direction]=await readJson(path.join(dir,'animations.json'));checks.push(await readJson(path.join(dir,'validation.json')));}
  manifest.monsters.push({id,name:NAMES[mi],frameSize:mi<3?64:mi<5?96:128,directions});
 }
 if(checks.some(c=>c.cutCrossings.length))throw Error('Unresolved source crop crossings; inspect validation.json in each direction');
 await json(path.join(OUT,'manifest.json'),manifest);await fs.writeFile(path.join(OUT,'manifest.js'),'window.INFECTED_PACK='+JSON.stringify(manifest)+';\n');
 await json(path.join(OUT,'validation.json'),{totalFrames:576,totalAnimations:96,checks});
 // Side-by-side animated direction comparisons for each creature/state.
 await fs.mkdir(path.join(OUT,'comparisons'),{recursive:true});
 for(const m of manifest.monsters)for(const state of STATES){
  const frames=[];
  for(let i=0;i<6;i++){
   const pieces=[];
   for(let d=0;d<4;d++){
    const file=path.join(OUT,m.id,DIRS[d],'frames',state+'_'+DIRS[d]+'_'+String(i).padStart(2,'0')+'.png');
    const input=await sharp(file).resize(192,192,{kernel:'nearest'}).png().toBuffer();pieces.push({input,left:d*192,top:0});
   }
   frames.push(await sharp({create:{width:768,height:192,channels:4,background:'#202725'}}).composite(pieces).png().toBuffer());
  }
  await sharp(frames,{join:{animated:true}}).gif({delay:TIMES[m.id][STATES.indexOf(state)],loop:0,dither:0,effort:5}).toFile(path.join(OUT,'comparisons',m.id+'-'+state+'.gif'));
 }
 console.log('Assembled 96 animations, 576 frames, 24 comparison GIFs');
}
async function readJson(f){return JSON.parse(await fs.readFile(f,'utf8'));}
async function zip(){
 const zip=new JSZip();async function add(dir,prefix=''){for(const f of await fs.readdir(dir,{withFileTypes:true})){const rel=prefix+f.name;if(f.isDirectory())await add(path.join(dir,f.name),rel+'/');else zip.file(rel,await fs.readFile(path.join(dir,f.name)));}}await add(OUT);
 await fs.writeFile(path.join(ROOT,'output/infected-animation-pack-v2.zip'),await zip.generateAsync({type:'nodebuffer',compression:'DEFLATE',compressionOptions:{level:6}}));console.log('ZIP ready');
}
async function main(){
 const args=process.argv.slice(2);
 if(args[0]==='--assemble')return assemble();if(args[0]==='--zip')return zip();
 if(args[0]==='--scan'){console.log(JSON.stringify((await scan(args[1])).filter(c=>c.severedPixels),null,2));return;}
 if(args.length===2){const mi=IDS.indexOf(args[0]);if(mi<0||!DIRS.includes(args[1]))throw Error('Unknown id/direction');return buildSheet(args[0],args[1],mi<3?64:mi<5?96:128);}
 for(let mi=0;mi<IDS.length;mi++)for(const direction of DIRS)await buildSheet(IDS[mi],direction,mi<3?64:mi<5?96:128);
 await assemble();await zip();
}
main().catch(e=>{console.error(e);process.exitCode=1;});
