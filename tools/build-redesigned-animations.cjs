// Exports generated artwork only. No gameplay, AI, damage, physics or networking.
const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
const sharp=require('sharp'),JSZip=require('jszip'),scan=require('./slice-sprite-components.cjs');
const ROOT=path.resolve(__dirname,'..'),OUT=path.join(ROOT,'assets/infected-redesign-animations-v1');
const read=async f=>JSON.parse(await fs.readFile(f,'utf8')),json=async(f,v)=>fs.writeFile(f,JSON.stringify(v,null,2)+'\n'),hash=b=>crypto.createHash('sha256').update(b).digest('hex'),median=a=>a.slice().sort((a,b)=>a-b)[Math.floor(a.length/2)];
async function tile(w,h,inputs){const pixels=Buffer.alloc(w*h*4);for(const v of inputs){const{data,info}=await sharp(v.input).ensureAlpha().raw().toBuffer({resolveWithObject:true});for(let y=0;y<info.height;y++)data.copy(pixels,((v.top+y)*w+v.left)*4,y*info.width*4,(y+1)*info.width*4);}return sharp(pixels,{raw:{width:w,height:h,channels:4}}).png().toBuffer();}
async function display(input,size,card=256){const factor=Math.max(1,Math.floor(card/size)),side=size*factor,pad=Math.floor((card-side)/2);return tile(card,card,[{input:await sharp(input).resize(side,side,{kernel:'nearest'}).png().toBuffer(),left:pad,top:pad}]);}
async function gif(frames,ms,hold=0){const images=await Promise.all(frames.map(b=>sharp(b).flatten({background:'#26332c'}).png().toBuffer()));return sharp(images,{join:{animated:true}}).gif({delay:images.map((_,i)=>ms+(i===images.length-1?hold:0)),loop:0,dither:0,effort:5}).toBuffer();}
async function character(c,plan){
 const size=c.frameSize,origin=c.origin,groups=[];
 for(const state of c.frameOrder){const source=path.join(OUT,'sources',c.id+'-'+state+'.png'),cells=await scan(source);for(const[row,dir]of plan.directions.entries()){
  const cc=cells.filter(k=>k.row===row),first=cc[0];const anchorX=state==='death'?(first.x0+first.x1)/2:median(cc.map(k=>(k.x0+k.x1)/2-k.col*256)),anchorY=state==='death'?first.y1-row*256:median(cc.map(k=>k.y1-row*256));groups.push({state,row,dir,cells:cc,anchorX,anchorY});
 }}
 const idleHeight=median(groups.filter(g=>g.state==='idle').flatMap(g=>g.cells.map(k=>k.y1-k.y0+1)));let scale=size*.75/idleHeight;
 const foot=Math.round(size*origin.y),destX=Math.round(size*.5);
 for(const g of groups)for(const k of g.cells){const side=Math.max(Math.abs(k.x0-k.col*256-g.anchorX),Math.abs(k.x1-k.col*256-g.anchorX)),above=g.anchorY-(k.y0-g.row*256),below=k.y1-g.row*256-g.anchorY;scale=Math.min(scale,(size-8)/(2*side+2),(foot-4)/(above+1),(size-foot-4)/(Math.max(0,below)+1));}
 const built=[];
 for(const dir of plan.directions){
  const folder=path.join(OUT,c.id,dir);await fs.mkdir(path.join(folder,'frames'),{recursive:true});await fs.mkdir(path.join(folder,'previews'),{recursive:true});const inputs=[],atlas={frames:{},meta:{app:'Redesigned infected animation review',version:'1',image:'spritesheet.png',format:'RGBA8888',size:{w:size*6,h:size*c.frameOrder.length},scale:'1'}},animations={},records=[];
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
async function assemble(plan){
 const approved=await read(path.join(OUT,'publication-status.json')).then(v=>v.approved).catch(()=>false);
 const manifest={...plan,status:approved?'approved for GitHub publication':'local review only; NOT uploaded; awaiting user approval',staticCorpses:72,effectsPolicy:'All existing blood, spore and particle packs preserved byte-for-byte; no effect art regenerated.',characters:[]};
 for(const c of plan.characters){const directions={};for(const dir of plan.directions)directions[dir]=await read(path.join(OUT,c.id,dir,'animations.json'));manifest.characters.push({...c,directions});}
 await json(path.join(OUT,'manifest.json'),manifest);await fs.writeFile(path.join(OUT,'manifest.js'),'window.REDESIGNED_INFECTED='+JSON.stringify(manifest)+';\n');await fs.mkdir(path.join(OUT,'families'),{recursive:true});
 for(const type of [...new Set(plan.characters.map(c=>c.type))]){
  const chars=plan.characters.filter(c=>c.type===type),states=chars[0].frameOrder;
  const label=[];for(const c of chars){label.push(await sharp(Buffer.from(`<svg width="512" height="32" xmlns="http://www.w3.org/2000/svg"><rect width="512" height="32" fill="#18231b"/><text x="12" y="23" fill="#e2e7d9" font-family="Arial" font-size="18">${c.id} · ${c.name} · класс ${c.grade} — ${c.strength}</text></svg>`)).png().toBuffer());}
  for(const state of states){const frames=[];for(let i=0;i<6;i++){const inputs=[];for(const[row,c]of chars.entries()){for(const[col,dir]of plan.directions.entries())inputs.push({input:await display(path.join(OUT,c.id,dir,'frames',state+'_'+dir+'_'+String(i).padStart(2,'0')+'.png'),c.frameSize,128),left:col*128,top:row*160});inputs.push({input:label[row],left:0,top:row*160+128});}frames.push(await tile(512,480,inputs));}await fs.writeFile(path.join(OUT,'families',type+'-'+state+'.gif'),await gif(frames,chars[0].actions[state].durationMs,chars[0].actions[state].repeat===-1?0:650));}
 }
 console.log('Assembled 18 characters, 672 animations, 4032 frames and 72 bodies');
}
async function zip(plan){
 await fs.mkdir(path.join(ROOT,'output/redesigned-animation-review'),{recursive:true});
 for(const type of ['all',...new Set(plan.characters.map(c=>c.type))]){
  const chars=type==='all'?plan.characters:plan.characters.filter(c=>c.type===type),ids=chars.map(c=>c.id),z=new JSZip();
  async function walk(dir,prefix=''){for(const e of await fs.readdir(dir,{withFileTypes:true})){const rel=prefix+e.name;if(e.isDirectory())await walk(path.join(dir,e.name),rel+'/');else z.file(rel,await fs.readFile(path.join(dir,e.name)));}}
  for(const id of ids)await walk(path.join(OUT,id),id+'/');for(const id of ids)z.file('references/'+id+'.png',await fs.readFile(path.join(OUT,'references',id+'.png')));
  for(const folder of ['comparisons','families'])for(const file of await fs.readdir(path.join(OUT,folder)))if(type==='all'||(folder==='comparisons'?ids.some(id=>file.startsWith(id+'-')):file.startsWith(type+'-')))z.file(folder+'/'+file,await fs.readFile(path.join(OUT,folder,file)));
  const manifest=await read(path.join(OUT,'manifest.json'));manifest.characters=manifest.characters.filter(c=>ids.includes(c.id));manifest.totalCharacters=chars.length;manifest.totalAnimations=chars.reduce((n,c)=>n+c.frameOrder.length*4,0);manifest.totalFrames=manifest.totalAnimations*6;manifest.staticCorpses=chars.length*4;
  z.file('manifest.json',JSON.stringify(manifest,null,2));z.file('manifest.js','window.REDESIGNED_INFECTED='+JSON.stringify(manifest)+';\n');
  for(const f of ['preview.html','verification.json','unchanged-effects-before.json'])z.file(f,await fs.readFile(path.join(OUT,f)));
  const readme=await fs.readFile(path.join(OUT,'README.md'),'utf8');z.file('README.md',(type==='all'?'':`Этот архив содержит только вид ${type}: ${chars.length} образа, ${manifest.totalAnimations} анимаций, ${manifest.totalFrames} кадров и ${manifest.staticCorpses} тел. Ниже описан весь общий набор.\n\n`)+readme);
  z.file('ARCHIVE-NOTE.txt','Review export. Original generation sheets are retained in the project sources/ folder and omitted from this smaller ZIP. Existing effect images are unchanged and remain in their previous packs. This archive includes no game code.\n');
  const b=await z.generateAsync({type:'nodebuffer',compression:'DEFLATE',compressionOptions:{level:6}});await JSZip.loadAsync(b,{checkCRC32:true});await fs.writeFile(path.join(ROOT,'output/redesigned-animation-review',type+'-review.zip'),b);console.log(type+'-review.zip: '+b.length+' bytes, CRC verified');
 }
}
async function main(){const plan=await read(path.join(OUT,'build-plan.json')),arg=process.argv[2];if(arg==='--assemble')return assemble(plan);if(arg==='--zip')return zip(plan);for(const c of plan.characters)if(!arg||arg===c.id)await character(c,plan);if(!arg)await assemble(plan);}
module.exports={tile,display};if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=1;});
