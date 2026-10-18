// Exports generated artwork only. No gameplay, AI, damage, physics or networking.
const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
const originalWrite=fs.writeFile.bind(fs);fs.writeFile=async(...args)=>{for(let attempt=0;;attempt++){try{return await originalWrite(...args);}catch(e){if(attempt>=12)throw e;await new Promise(r=>setTimeout(r,200+attempt*150));}}};
const sharp=require('sharp'),JSZip=require('jszip'),scan=require('./slice-sprite-components.cjs');
const ROOT=path.resolve(__dirname,'..'),OUT=path.join(ROOT,'assets/survivor-friends-animations-v1');
const read=async f=>JSON.parse(await fs.readFile(f,'utf8')),json=async(f,v)=>fs.writeFile(f,JSON.stringify(v,null,2)+'\n'),hash=b=>crypto.createHash('sha256').update(b).digest('hex'),median=a=>a.slice().sort((a,b)=>a-b)[Math.floor(a.length/2)];
async function tile(w,h,inputs){const pixels=Buffer.alloc(w*h*4);for(const v of inputs){const{data,info}=await sharp(v.input).ensureAlpha().raw().toBuffer({resolveWithObject:true});for(let y=0;y<info.height;y++)data.copy(pixels,((v.top+y)*w+v.left)*4,y*info.width*4,(y+1)*info.width*4);}return sharp(pixels,{raw:{width:w,height:h,channels:4}}).png().toBuffer();}
async function display(input,size,card=256){const factor=Math.max(1,Math.floor(card/size)),side=size*factor,pad=Math.floor((card-side)/2);return tile(card,card,[{input:await sharp(input).resize(side,side,{kernel:'nearest'}).png().toBuffer(),left:pad,top:pad}]);}
async function gif(frames,ms,hold=0){const images=await Promise.all(frames.map(b=>sharp(b).flatten({background:'#26332c'}).png().toBuffer()));return sharp(images,{join:{animated:true}}).gif({delay:images.map((_,i)=>ms+(i===images.length-1?hold:0)),loop:0,dither:0,effort:5}).toBuffer();}
async function character(c,plan){
 const size=c.frameSize,origin=c.origin,groups=[];
 for(const state of c.frameOrder){const source=path.join(OUT,'sources',c.id+'-'+state+'.png'),cells=await scan(source);for(const[row,dir]of plan.directions.entries()){
  const sourceRow=c.sourceDirectionRows?.[state]?.[dir]??row;const cc=cells.filter(k=>k.row===sourceRow),first=cc[0];const anchorX=state==='death'?(first.x0+first.x1)/2:median(cc.map(k=>(k.x0+k.x1)/2-k.col*256)),anchorY=state==='death'?first.y1-row*256:median(cc.map(k=>k.y1-sourceRow*256));groups.push({state,row:sourceRow,dir,cells:cc,anchorX,anchorY});
 }}
 const idleHeight=median(groups.filter(g=>g.state==='idle').flatMap(g=>g.cells.map(k=>k.y1-k.y0+1)));let scale=56/idleHeight;
 const foot=Math.round(size*origin.y),destX=Math.round(size*.5);
 for(const g of groups)for(const k of g.cells){const side=Math.max(Math.abs(k.x0-k.col*256-g.anchorX),Math.abs(k.x1-k.col*256-g.anchorX)),above=g.anchorY-(k.y0-g.row*256),below=k.y1-g.row*256-g.anchorY;scale=Math.min(scale,(size-8)/(2*side+2),(foot-4)/(above+1),(size-foot-4)/(Math.max(0,below)+1));}
 const built=[];
 for(const dir of plan.directions){
  const folder=path.join(OUT,c.id,dir);await fs.mkdir(path.join(folder,'frames'),{recursive:true});await fs.mkdir(path.join(folder,'previews'),{recursive:true});const inputs=[],atlas={frames:{},meta:{app:'Friends survivor animation review',version:'1',image:'spritesheet.png',format:'RGBA8888',size:{w:size*6,h:size*c.frameOrder.length},scale:'1'}},animations={},records=[];
  for(const[row,state]of c.frameOrder.entries()){
   const g=groups.find(g=>g.dir===dir&&g.state===state),frames=[],names=[];
   for(const k of g.cells){const w=k.x1-k.x0+1,h=k.y1-k.y0+1,width=Math.max(1,Math.round(w*scale)),height=Math.max(1,Math.round(h*scale)),left=Math.round(destX+(k.x0-k.col*256-g.anchorX)*scale),top=Math.round(foot+(k.y0-g.row*256-g.anchorY)*scale);
    if(left<1||top<1||left+width>=size||top+height>=size)throw Error('Clipping '+c.id+'/'+dir+'/'+state+'/'+k.col);
    const pose=await sharp(k.image).resize(width,height,{kernel:'nearest'}).png().toBuffer(),b=await tile(size,size,[{input:pose,left,top}]),name=state+'_'+dir+'_'+String(k.col).padStart(2,'0');await fs.writeFile(path.join(folder,'frames',name+'.png'),b);names.push(name);frames.push(b);inputs.push({input:b,left:k.col*size,top:row*size});
    atlas.frames[name]={frame:{x:k.col*size,y:row*size,w:size,h:size},rotated:false,trimmed:false,spriteSourceSize:{x:0,y:0,w:size,h:size},sourceSize:{w:size,h:size},pivot:origin};records.push({name,source:'../../sources/'+c.id+'-'+state+'.png',sourceBounds:{x:k.x0,y:k.y0,w,h},fixedSourceAnchor:{x:g.anchorX,y:g.anchorY},destination:{x:left,y:top,w:width,h:height},sha256:hash(b)});
   }
   const hashes=records.slice(-6).map(r=>r.sha256);if(new Set(hashes).size!==6)throw Error('Duplicate frame '+c.id+'/'+state+'/'+dir);
   animations[state]={...c.actions[state],frames:names};if(state==='death'){animations[state].terminalFrame=names[5];await fs.writeFile(path.join(folder,'corpse.png'),frames[5]);}
   await fs.writeFile(path.join(folder,'previews',state+'.gif'),await gif(await Promise.all(frames.map(b=>display(b,size))),c.actions[state].durationMs,c.actions[state].repeat===-1?0:650));
  }
  await fs.writeFile(path.join(folder,'spritesheet.png'),await tile(size*6,size*c.frameOrder.length,inputs));await json(path.join(folder,'atlas.json'),atlas);await json(path.join(folder,'animations.json'),{character:c.id,name:c.name,grade:c.grade,direction:dir,frameWidth:size,frameHeight:size,origin,animations,corpse:{image:'corpse.png',frame:'death_'+dir+'_05',static:true}});await json(path.join(folder,'source-crops.json'),{sharedCharacterScale:scale,allActionsSameScale:true,frames:records});built.push(dir);
 }
 await fs.mkdir(path.join(OUT,'comparisons'),{recursive:true});
 for(const state of c.frameOrder){const frames=[];for(let i=0;i<6;i++)frames.push(await tile(512,128,await Promise.all(plan.directions.map(async(dir,col)=>({input:await display(path.join(OUT,c.id,dir,'frames',state+'_'+dir+'_'+String(i).padStart(2,'0')+'.png'),size,128),left:col*128,top:0})))));await fs.writeFile(path.join(OUT,'comparisons',c.id+'-'+state+'.gif'),await gif(frames,c.actions[state].durationMs,c.actions[state].repeat===-1?0:650));}
 // Review-only compound clips reproduce the previous charge and phase-transition clips.
 if(c.type==='06-boss')for(const[name,states]of[['charge-sequence',['charge_start','charge_loop','charge_loop','charge_impact']],['phase-transitions',['phase2_roar','phase3_enrage']]]){
  const frames=[],delays=[];for(const state of states)for(let i=0;i<6;i++){frames.push(await tile(512,128,await Promise.all(plan.directions.map(async(dir,col)=>({input:await display(path.join(OUT,c.id,dir,'frames',state+'_'+dir+'_'+String(i).padStart(2,'0')+'.png'),size,128),left:col*128,top:0})))));delays.push(c.actions[state].durationMs+(i===5&&c.actions[state].repeat!==-1?350:0));}const imgs=await Promise.all(frames.map(b=>sharp(b).flatten({background:'#26332c'}).png().toBuffer()));await fs.writeFile(path.join(OUT,'comparisons',c.id+'-'+name+'.gif'),await sharp(imgs,{join:{animated:true}}).gif({delay:delays,loop:0,dither:0,effort:5}).toBuffer());
 }
 console.log(JSON.stringify({character:c.id,animations:c.frameOrder.length*4,frames:c.frameOrder.length*24,sharedScale:scale}));
}
async function main(){const plan=await read(path.join(OUT,'build-plan.json'));const id=process.argv[2];for(const c of plan.characters)if(!id||id===c.id)await character(c,plan);}main().catch(e=>{console.error(e);process.exitCode=1;});
