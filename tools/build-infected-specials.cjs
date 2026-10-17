const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
const sharp=require('sharp'),JSZip=require('jszip'),scan=require('./slice-sprite-components.cjs');
const ROOT=path.resolve(__dirname,'..'),BASE=path.join(ROOT,'assets/infected-animation-pack-v4'),ADD=path.join(ROOT,'assets/infected-specials-v1'),FULL=path.join(ROOT,'assets/infected-animation-pack-v5');
const DIRS=['south','west','east','north'];
const SPECS={bloater:[{state:'throw_growth',ms:150,repeat:0,events:[{frame:3,name:'projectile_release',socket:'throw_hand',effect:'growth_projectile'}]}],'rat-king':[
 {state:'charge_start',ms:150,repeat:0,events:[{frame:2,name:'charge_warning'}]},
 {state:'charge_loop',ms:85,repeat:-1,events:[]},
 {state:'charge_impact',ms:140,repeat:0,events:[{frame:2,name:'charge_contact'}]},
 {state:'heavy_combo',ms:125,repeat:0,events:[{frame:2,name:'combo_contact',hit:1},{frame:4,name:'combo_contact',hit:2}]},
 {state:'ground_slam',ms:180,repeat:0,events:[{frame:3,name:'slam_contact',effect:'slam_dust'}]},
 {state:'phase2_roar',ms:190,repeat:0,events:[{frame:3,name:'phase_transition_peak',phase:2}]},
 {state:'phase3_enrage',ms:170,repeat:0,events:[{frame:3,name:'phase_transition_peak',phase:3}]}
]};
const FX=[{id:'growth_projectile',size:32,ms:90,repeat:-1},{id:'spore_burst',size:128,ms:100,repeat:0},{id:'spore_cloud',size:128,ms:150,repeat:-1},{id:'slam_dust',size:128,ms:100,repeat:0}];
const json=async(p,v)=>fs.writeFile(p,JSON.stringify(v,null,2)+'\n'),read=async p=>JSON.parse(await fs.readFile(p,'utf8'));
const hash=b=>crypto.createHash('sha256').update(b).digest('hex'),median=a=>a.slice().sort((a,b)=>a-b)[Math.floor(a.length/2)];
async function bounds(file){const{data,info}=await sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true});let x0=9999,y0=9999,x1=-1,y1=-1;for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++)if(data[(y*info.width+x)*4+3]>64){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}return{x0,y0,x1,y1,width:x1-x0+1,height:y1-y0+1};}
async function tile(width,height,inputs){const pixels=Buffer.alloc(width*height*4);for(const{input,left,top}of inputs){const{data,info}=await sharp(input).ensureAlpha().raw().toBuffer({resolveWithObject:true});for(let y=0;y<info.height;y++)data.copy(pixels,((top+y)*width+left)*4,y*info.width*4,(y+1)*info.width*4);}return sharp(pixels,{raw:{width,height,channels:4}}).png().toBuffer();}
function rect(x,y,size,origin){return{frame:{x,y,w:size,h:size},rotated:false,trimmed:false,spriteSourceSize:{x:0,y:0,w:size,h:size},sourceSize:{w:size,h:size},pivot:origin};}
async function gif(frames,size,ms,delayLast=600){const imgs=await Promise.all(frames.map(b=>sharp(b).resize(size,size,{kernel:'nearest'}).flatten({background:'#202725'}).png().toBuffer()));const delays=Array(6).fill(ms);delays[5]+=delayLast;return sharp(imgs,{join:{animated:true}}).gif({delay:delays,loop:0,dither:0,effort:5}).toBuffer();}
async function init(){await fs.mkdir(path.join(ADD,'sources'),{recursive:true});await fs.mkdir(path.join(ADD,'references'),{recursive:true});await fs.cp(BASE,FULL,{recursive:true});for(const id of Object.keys(SPECS))await fs.copyFile(path.join(ROOT,'assets/infected-deaths-v1/references',id+'.png'),path.join(ADD,'references',id+'.png'));console.log('Initialized special add-on and combined v5');}
async function buildCharacter(id){
 const all=await Promise.all(SPECS[id].map(async spec=>({...spec,cells:await scan(path.join(ADD,'sources',id+'-'+spec.state+'.png'))})));
 for(const[row,d]of DIRS.entries()){
  const out=path.join(ADD,id,d),combined=path.join(FULL,id,d),base=path.join(BASE,id,d),old=await read(path.join(base,'animations.json')),size=old.frameWidth,origin=old.origin;
  await fs.mkdir(path.join(out,'frames'),{recursive:true});await fs.mkdir(path.join(out,'previews'),{recursive:true});
  const atlas={frames:{},meta:{app:'Infected special attacks',version:'1',image:'spritesheet.png',format:'RGBA8888',size:{w:size*6,h:size*all.length},scale:'1'}},frames=[],animations={},records=[];
  for(const[actionRow,spec]of all.entries()){
   const cells=spec.cells.filter(c=>c.row===row),first=cells[0],referenceState=['charge_loop','charge_impact','phase3_enrage'].includes(spec.state)?'run':'idle';
   const target=await bounds(path.join(base,'frames',referenceState+'_'+d+'_00.png'));
   const anchorX=(first.x0+first.x1)/2,anchorY=median(cells.map(c=>c.y1-row*256)),destX=size*.5,destY=Math.round(origin.y*size)-2;
   const requested=target.height/(first.y1-first.y0+1);
   const above=Math.max(...cells.map(c=>anchorY-(c.y0-row*256))),below=Math.max(0,...cells.map(c=>c.y1-row*256-anchorY));
   const sides=Math.max(...cells.flatMap(c=>[Math.abs(c.x0-c.col*256-anchorX),Math.abs(c.x1-c.col*256-anchorX)]));
   const scale=Math.min(requested,(destY-3)/(above+1),(size-destY-4)/(below+1),(size-6)/(2*sides+1));
   const actionFrames=[],actionRecords=[];
   for(const c of cells){
    const name=spec.state+'_'+d+'_'+String(c.col).padStart(2,'0'),w=c.x1-c.x0+1,h=c.y1-c.y0+1,width=Math.max(1,Math.round(w*scale)),height=Math.max(1,Math.round(h*scale));
    const left=Math.round(destX+(c.x0-c.col*256-anchorX)*scale),top=Math.round(destY+(c.y0-row*256-anchorY)*scale);
    if(left<1||top<1||left+width>=size||top+height>=size)throw Error('Clipping '+id+'/'+d+'/'+name);
    const pose=await sharp(c.image).resize(width,height,{kernel:'nearest'}).png().toBuffer();
    const frame=await tile(size,size,[{input:pose,left,top}]);actionFrames.push(frame);frames.push(frame);
    for(const folder of[out,combined])await fs.writeFile(path.join(folder,'frames',name+'.png'),frame);
    atlas.frames[name]=rect(c.col*size,actionRow*size,size,origin);actionRecords.push({name,sourceBounds:{x:c.x0,y:c.y0,w,h},destination:{x:left,y:top,w:width,h:height},sha256:hash(frame)});
   }
   if(new Set(actionRecords.map(r=>r.sha256)).size!==6)throw Error('Duplicate special frames '+id+'/'+spec.state+'/'+d);
   animations[spec.state]={frames:actionRecords.map(r=>r.name),durationMs:spec.ms,frameRate:1000/spec.ms,repeat:spec.repeat,rootMotion:false,events:spec.events};
   const preview=await gif(actionFrames,256,spec.ms,spec.repeat===-1?0:600);for(const folder of[out,combined])await fs.writeFile(path.join(folder,'previews',spec.state+'.gif'),preview);
   records.push({state:spec.state,source:'../../sources/'+id+'-'+spec.state+'.png',directionRow:row,referenceState,scale,requestedScale:requested,scaleRatio:scale/requested,fixedSourceAnchor:{x:anchorX,y:anchorY},fixedDestinationAnchor:{x:destX,y:destY},frames:actionRecords});
  }
  const socketPixels={south:{x:72,y:47},west:{x:19,y:49},east:{x:72,y:47},north:{x:62,y:36}};
  const sockets=id==='bloater'?{throw_hand:{frame:'throw_growth_'+d+'_03',...socketPixels[d],placement:'hand center reviewed on exported release frame'}}:{};
  const config={monster:id,direction:d,frameWidth:size,frameHeight:size,origin,animations,sockets};
  const image=await tile(size*6,size*all.length,frames.map((input,i)=>({input,left:i%6*size,top:Math.floor(i/6)*size})));
  await fs.writeFile(path.join(out,'spritesheet.png'),image);await json(path.join(out,'animations.json'),config);await json(path.join(out,'atlas.json'),atlas);await json(path.join(out,'source-crops.json'),{actions:records,frameTransformsFixed:true});
  const oldAtlas=await read(path.join(base,'atlas.json')),rows=Object.keys(old.animations).length;
  for(const[name,r]of Object.entries(atlas.frames))oldAtlas.frames[name]={...r,frame:{...r.frame,y:r.frame.y+rows*size}};
  oldAtlas.meta.version='5';oldAtlas.meta.size.h=(rows+all.length)*size;
  await fs.writeFile(path.join(combined,'spritesheet.png'),await tile(size*6,(rows+all.length)*size,[{input:path.join(base,'spritesheet.png'),left:0,top:0},{input:image,left:0,top:rows*size}]));
  await json(path.join(combined,'atlas.json'),oldAtlas);await json(path.join(combined,'animations.json'),{...old,animations:{...old.animations,...animations},sockets});
  await json(path.join(combined,'special-source-crops.json'),{sourcePack:'../../../infected-specials-v1/'+id+'/'+d+'/source-crops.json'});
  console.log(JSON.stringify({id,direction:d,animations:all.length,frames:all.length*6,minimumScaleRatio:Math.min(...records.map(r=>r.scaleRatio))}));
 }
}
async function buildEffects(){
 const source=path.join(ADD,'sources/fx-effects-v2.png'),centers={x:[145,398,644,900,1154,1408],y:[172,414,650,892]},cells=await scan(source,{minMainPixels:8,cellCenters:centers});
 const manifest={effects:[]};
 for(const[row,spec]of FX.entries()){
  const out=path.join(ADD,'fx',spec.id);await fs.mkdir(path.join(out,'frames'),{recursive:true});const frames=[],names=[],records=[];
  const effectCells=cells.filter(c=>c.row===row),side=Math.max(...effectCells.flatMap(c=>[Math.abs(c.x0-centers.x[c.col]),Math.abs(c.x1-centers.x[c.col])])),vertical=Math.max(...effectCells.flatMap(c=>[Math.abs(c.y0-centers.y[row]),Math.abs(c.y1-centers.y[row])]));
  const scale=Math.min(spec.size/256,(spec.size-4)/(2*side+1),(spec.size-4)/(2*vertical+1));
  for(let col=0;col<6;col++){
   // Component ownership preserves particles extending past imaginary grid boundaries.
   const c=effectCells[col],w=c.x1-c.x0+1,h=c.y1-c.y0+1,width=Math.max(1,Math.round(w*scale)),height=Math.max(1,Math.round(h*scale));
   const left=Math.round(spec.size*.5+(c.x0-centers.x[col])*scale),top=Math.round(spec.size*.5+(c.y0-centers.y[row])*scale);
   if(left<1||top<1||left+width>=spec.size||top+height>=spec.size)throw Error('FX clipping '+spec.id+'/'+col);
   const pose=await sharp(c.image).resize(width,height,{kernel:'nearest'}).png().toBuffer(),frame=await tile(spec.size,spec.size,[{input:pose,left,top}]);
   const name=spec.id+'_'+String(col).padStart(2,'0');names.push(name);frames.push(frame);await fs.writeFile(path.join(out,'frames',name+'.png'),frame);records.push({name,sourceBounds:{x:c.x0,y:c.y0,w,h},scale,sha256:hash(frame)});
  }
  if(new Set(records.map(r=>r.sha256)).size!==6)throw Error('Duplicate FX frames '+spec.id);
  const atlas={frames:{},meta:{app:'Infected VFX',version:'1',image:'spritesheet.png',format:'RGBA8888',size:{w:6*spec.size,h:spec.size},scale:'1'}};names.forEach((n,col)=>atlas.frames[n]=rect(col*spec.size,0,spec.size,{x:.5,y:.5}));
  const config={id:spec.id,frameWidth:spec.size,frameHeight:spec.size,origin:{x:.5,y:.5},frames:names,durationMs:spec.ms,frameRate:1000/spec.ms,repeat:spec.repeat,rootMotion:false};
  await fs.writeFile(path.join(out,'spritesheet.png'),await tile(spec.size*6,spec.size,frames.map((input,col)=>({input,left:col*spec.size,top:0}))));
  await fs.writeFile(path.join(out,'preview.gif'),await gif(frames,256,spec.ms,spec.repeat===-1?0:600));await json(path.join(out,'atlas.json'),atlas);await json(path.join(out,'animation.json'),config);await json(path.join(out,'source-crops.json'),{source:'../../sources/fx-effects-v2.png',ownership:'connected-components-nearest-calibrated-cell-center',centers,frames:records});manifest.effects.push(config);
 }
 await json(path.join(ADD,'fx/manifest.json'),manifest);await fs.cp(path.join(ADD,'fx'),path.join(FULL,'fx'),{recursive:true});console.log('Built four separate VFX animations');
}
async function assemble(){
 const old=await read(path.join(BASE,'manifest.json')),effects=(await read(path.join(ADD,'fx/manifest.json'))).effects;
 const addon={version:1,directions:DIRS,totalAnimations:32,totalFrames:192,fxAnimations:4,fxFrames:24,totalAnimationsIncludingFx:36,totalFramesIncludingFx:216,effects,monsters:[]};
 const full={...old,version:5,totalAnimations:224,totalFrames:1344,fxAnimations:4,fxFrames:24,totalAnimationsIncludingFx:228,totalFramesIncludingFx:1368,effects,monsters:[]};
 for(const m of old.monsters){const all={},extra={};for(const d of DIRS){all[d]=await read(path.join(FULL,m.id,d,'animations.json'));if(SPECS[m.id])extra[d]=await read(path.join(ADD,m.id,d,'animations.json'));}
  full.monsters.push({...m,frameOrder:Object.keys(all.south.animations),directions:all});if(SPECS[m.id])addon.monsters.push({...m,frameOrder:Object.keys(extra.south.animations),directions:extra});}
 for(const[folder,manifest]of[[ADD,addon],[FULL,full]]){await json(path.join(folder,'manifest.json'),manifest);await fs.writeFile(path.join(folder,'manifest.js'),'window.INFECTED_PACK='+JSON.stringify(manifest)+';\n');await fs.mkdir(path.join(folder,'comparisons'),{recursive:true});}
 await json(path.join(ADD,'validation.json'),{actorAnimations:32,actorFrames:192,fxAnimations:4,fxFrames:24,totalAnimations:36,totalFrames:216,directions:DIRS});
 await json(path.join(FULL,'validation.json'),{version:5,actorAnimations:224,actorFrames:1344,fxAnimations:4,fxFrames:24,totalAnimations:228,totalFrames:1368,oldActorFramesPreserved:1152,staticCorpses:24,previousPack:'infected-animation-pack-v4'});
 await fs.copyFile(path.join(ADD,'boss-phases.json'),path.join(FULL,'boss-phases.json'));
 for(const[id,specs]of Object.entries(SPECS))for(const spec of specs){const frames=[];for(let i=0;i<6;i++){const inputs=await Promise.all(DIRS.map(async(d,col)=>({input:await sharp(path.join(ADD,id,d,'frames',spec.state+'_'+d+'_'+String(i).padStart(2,'0')+'.png')).resize(192,192,{kernel:'nearest'}).png().toBuffer(),left:col*192,top:0})));frames.push(await tile(768,192,inputs));}const delay=Array(6).fill(spec.ms);if(spec.repeat!==-1)delay[5]+=600;const preview=await sharp(frames,{join:{animated:true}}).flatten({background:'#202725'}).gif({delay,loop:0,dither:0,effort:5}).toBuffer();for(const folder of[ADD,FULL])await fs.writeFile(path.join(folder,'comparisons',id+'-'+spec.state+'.gif'),preview);}
 await json(path.join(FULL,'special-provenance.json'),{sourcePack:'../infected-specials-v1',prompts:'../infected-specials-v1/generation-prompts.json',sources:'../infected-specials-v1/sources'});
 // Longer review clips preserve state boundaries of a charge and both phase transitions.
 for(const[clip,states]of[['rat-king-charge-sequence',['charge_start','charge_loop','charge_loop','charge_impact']],['rat-king-phase-transitions',['phase2_roar','phase3_enrage']]]){
  const images=[],delays=[];for(const state of states){const spec=SPECS['rat-king'].find(s=>s.state===state);for(let i=0;i<6;i++){const inputs=await Promise.all(DIRS.map(async(d,col)=>({input:await sharp(path.join(ADD,'rat-king',d,'frames',state+'_'+d+'_'+String(i).padStart(2,'0')+'.png')).resize(192,192,{kernel:'nearest'}).flatten({background:'#202725'}).png().toBuffer(),left:col*192,top:0})));images.push(await tile(768,192,inputs));delays.push(spec.ms+(i===5&&spec.repeat!==-1?350:0));}}
  const b=await sharp(images,{join:{animated:true}}).gif({delay:delays,loop:0,dither:0,effort:5}).toBuffer();for(const folder of[ADD,FULL])await fs.writeFile(path.join(folder,'comparisons',clip+'.gif'),b);
 }
 console.log('Assembled specials: 32 actor animations + 4 VFX / v5: 224 actor animations + 4 VFX');
}
async function zip(){for(const[folder,name]of[[ADD,'infected-specials-v1.zip'],[FULL,'infected-animation-pack-v5.zip']]){const z=new JSZip();async function walk(dir,prefix=''){for(const f of await fs.readdir(dir,{withFileTypes:true})){const rel=prefix+f.name;if(f.isDirectory())await walk(path.join(dir,f.name),rel+'/');else z.file(rel,await fs.readFile(path.join(dir,f.name)));}}await walk(folder);const b=await z.generateAsync({type:'nodebuffer',compression:'DEFLATE',compressionOptions:{level:6}});await fs.writeFile(path.join(ROOT,'output',name),b);console.log(name+': '+b.length+' bytes');}}
async function main(){const arg=process.argv[2];if(arg==='--init')return init();if(arg==='--effects')return buildEffects();if(arg==='--assemble')return assemble();if(arg==='--zip')return zip();if(SPECS[arg])return buildCharacter(arg);for(const id of Object.keys(SPECS))await buildCharacter(id);await buildEffects();await assemble();await zip();}
main().catch(e=>{console.error(e);process.exitCode=1;});
