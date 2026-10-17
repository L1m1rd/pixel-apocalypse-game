// Slices generated poses and packages them; does not synthesize or redraw animation.
const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
function dep(n){try{return require(n);}catch{return require(path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules',n));}}
const sharp=dep('sharp'),ROOT=path.resolve(__dirname,'..'),OUT=path.join(ROOT,'assets/weapon-animations-v1');
process.env.NODE_PATH=[process.env.NODE_PATH,path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules')].filter(Boolean).join(path.delimiter);require('node:module').Module._initPaths();
const scan=require('./slice-sprite-components.cjs');
const read=async p=>JSON.parse(await fs.readFile(path.join(OUT,p),'utf8')),json=async(p,v)=>fs.writeFile(path.join(OUT,p),JSON.stringify(v,null,2)+'\n');
async function compose(w,h,items){const b=Buffer.alloc(w*h*4);for(const i of items){const{data,info}=await sharp(i.input).ensureAlpha().raw().toBuffer({resolveWithObject:true});if(i.left<0||i.top<0||i.left+info.width>w||i.top+info.height>h)throw Error('Frame clipped');for(let y=0;y<info.height;y++)data.copy(b,((y+i.top)*w+i.left)*4,y*info.width*4,(y+1)*info.width*4);}return sharp(b,{raw:{width:w,height:h,channels:4}}).png().toBuffer();}
async function main(){
 const plan=await read('build-plan.json'),wanted=process.argv[2],weapons=[];
 for(const w of plan.weapons){
  const folder=path.join(OUT,w.id);await fs.mkdir(path.join(folder,'frames'),{recursive:true});
  if(wanted&&wanted!==w.id){try{weapons.push(await read(w.id+'/animations.json'));}catch{}continue;}
  try{await fs.access(path.join(OUT,w.source));}catch{continue;}
  const source=await sharp(path.join(OUT,w.source)).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  if(source.info.width!==1536||source.info.height!==1024)throw Error(w.id+': expected 1536×1024 source');
  let zero=0;for(let p=3;p<source.data.length;p+=4)if(source.data[p]===0)zero++;
  if(zero<source.info.width*source.info.height*.25)throw Error(w.id+': source has no true transparent background');
  const extracted=await scan(path.join(OUT,w.source),{minMainPixels:200});
  const bounds=extracted.reduce((b,c)=>({x0:Math.min(b.x0,c.x0-c.col*256),x1:Math.max(b.x1,c.x1-c.col*256),y0:Math.min(b.y0,c.y0-c.row*256),y1:Math.max(b.y1,c.y1-c.row*256)}),{x0:0,x1:255,y0:0,y1:255});
  const scale=Math.min(180/(bounds.x1-bounds.x0+1),180/(bounds.y1-bounds.y0+1)),offsetX=Math.round((192-(bounds.x1-bounds.x0+1)*scale)/2-bounds.x0*scale),offsetY=Math.round((192-(bounds.y1-bounds.y0+1)*scale)/2-bounds.y0*scale);
  const cells=[];
  for(let k=0;k<24;k++){
   const col=k%6,row=Math.floor(k/6),pixels=Buffer.alloc(256*256*4);
   for(let y=0;y<256;y++)source.data.copy(pixels,y*256*4,((row*256+y)*1536+col*256)*4,((row*256+y)*1536+col*256+256)*4);
   let visible=0,border=0;for(let y=0;y<256;y++)for(let x=0;x<256;x++){const a=pixels[(y*256+x)*4+3];if(a>64){visible++;if(x<2||y<2||x>253||y>253)border++;}}
   if(visible<200)throw Error(w.id+': empty source cell '+k);
   // A few particles may touch an edge. Main-weapon clipping is checked visually.
   const c=extracted[k],scaled=await sharp(c.image).resize(Math.max(1,Math.round((c.x1-c.x0+1)*scale)),Math.max(1,Math.round((c.y1-c.y0+1)*scale)),{kernel:'nearest'}).png().toBuffer();
   const frame=await compose(192,192,[{input:scaled,left:Math.round(offsetX+(c.x0-col*256)*scale),top:Math.round(offsetY+(c.y0-row*256)*scale)}]);cells.push({frame,visible,border});
  }
  const atlas={frames:{},meta:{image:'spritesheet.png',format:'RGBA8888',size:{w:192*6,h:192*4},scale:'1'}},items=[],animations={};
  for(const[action,spec]of Object.entries(w.actions)){
   const frames=[],images=[];
   for(const[i,k]of spec.cells.entries()){
    const name=action+'_'+String(i).padStart(2,'0');frames.push(name);images.push(cells[k].frame);await fs.writeFile(path.join(folder,'frames',name+'.png'),cells[k].frame);
    const rect={x:(k%6)*192,y:Math.floor(k/6)*192,w:192,h:192};atlas.frames[name]={frame:rect};items.push({input:cells[k].frame,left:rect.x,top:rect.y});
   }
   const durationMs=spec.frameDurationMs.reduce((a,b)=>a+b,0);
   animations[action]={frames,frameDurationMs:spec.frameDurationMs,durationMs,repeat:0,rootMotion:false,holdLastFrame:false,returnTo:'idle'};
   const preview=await Promise.all(images.map(b=>sharp(b).flatten({background:'#26312e'}).resize(384,384,{kernel:'nearest'}).png().toBuffer()));
   const delays=spec.frameDurationMs.slice();delays[delays.length-1]+=650;
   await fs.writeFile(path.join(folder,action+'.gif'),await sharp(preview,{join:{animated:true}}).gif({delay:delays,loop:0,dither:0,effort:5}).toBuffer());
   await fs.writeFile(path.join(folder,action+'-sheet.png'),await compose(192*6,192*Math.ceil(images.length/6),images.map((b,i)=>({input:b,left:i%6*192,top:Math.floor(i/6)*192}))));
  }
  await fs.writeFile(path.join(folder,'spritesheet.png'),await compose(1152,768,items));await fs.writeFile(path.join(folder,'idle.png'),cells[0].frame);await fs.writeFile(path.join(folder,'atlas.json'),JSON.stringify(atlas,null,2)+'\n');
  const result={id:w.id,name:w.name,type:w.type,direction:'east',frameWidth:192,frameHeight:192,origin:{x:(offsetX+105*scale)/192,y:(offsetY+144*scale)/192},source:w.source,reference:w.reference,animations,events:{fire:[{frame:1,event:'visual_muzzle_flash'}],reload:[{frame:17,event:'visual_reload_complete'}]},gameplayEventsAuthoritative:false};
  await fs.writeFile(path.join(folder,'animations.json'),JSON.stringify(result,null,2)+'\n');await fs.writeFile(path.join(folder,'source-audit.json'),JSON.stringify({sourceSha256:crypto.createHash('sha256').update(await fs.readFile(path.join(OUT,w.source))).digest('hex'),sourceTransparency:zero/(1536*1024),cells:cells.map(({visible,border},i)=>({index:i,visiblePixels:visible,borderPixels:border})),scale,offsetX,offsetY,extraction:'connected-component ownership; common source-cell pivot and scale; no per-frame recentering'},null,2)+'\n');
  weapons.push(result);console.log(w.id+': 2 animations, 24 frames');
 }
 const manifest={status:weapons.length===24?'complete-visual-prototype':'in-progress',tool:'built-in image_gen',totalWeapons:weapons.length,totalAnimations:weapons.length*2,totalFrames:weapons.length*24,directions:['east'],frameSize:192,notes:['Weapon-only side-profile overlays, no player hands or character animations.','One direction only; attachment pivots require visual calibration in the game.','Preview GIFs loop with a pause; runtime actions are one-shot.','Flash is baked into fire frames; do not add duplicate muzzle flash.','No ammunition, damage, audio or multiplayer gameplay implementation.'],weapons};
 await json('manifest.json',manifest);await fs.writeFile(path.join(OUT,'manifest.js'),'window.WEAPON_ANIMATIONS='+JSON.stringify(manifest)+';\n');
 console.log(JSON.stringify({weapons:weapons.length,animations:weapons.length*2,frames:weapons.length*24}));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
