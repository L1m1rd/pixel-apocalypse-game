const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
const {pathToFileURL}=require('node:url');const sharp=require('sharp'),{chromium}=require('playwright');
const ROOT=path.resolve(__dirname,'..'),BASE=path.join(ROOT,'assets/infected-animation-pack-v2'),ADD=path.join(ROOT,'assets/infected-reactions-v1'),FULL=path.join(ROOT,'assets/infected-animation-pack-v3');
const read=async p=>JSON.parse(await fs.readFile(p,'utf8')),hash=b=>crypto.createHash('sha256').update(b).digest('hex');
async function main(){
 const manifest=await read(path.join(FULL,'manifest.json'));let newFrames=0,oldFrames=0,gifs=0;const sourceHashes=new Set();
 const scales=[];
 for(const m of manifest.monsters)for(const d of manifest.directions){
  const config=m.directions[d],old=await read(path.join(BASE,m.id,d,'animations.json'));
  if(JSON.stringify(config.origin)!==JSON.stringify(old.origin))throw Error('Origin changed');
  const atlas=await read(path.join(FULL,m.id,d,'atlas.json')),sheet=await sharp(path.join(FULL,m.id,d,'spritesheet.png')).metadata();
  if(sheet.width!==m.frameSize*6||sheet.height!==m.frameSize*7||!sheet.hasAlpha)throw Error('Bad combined sheet');
  const crop=await read(path.join(ADD,m.id,d,'source-crops.json'));if(crop.scaleRatio<.85)throw Error('Reaction changes scale too much: '+m.id+'/'+d+' '+crop.scaleRatio);scales.push(crop.scaleRatio);
  const sourceHash=hash(await fs.readFile(path.join(ADD,'sources',m.id+'-'+d+'.png')));if(sourceHashes.has(sourceHash))throw Error('Duplicated directional source');sourceHashes.add(sourceHash);
  for(const [row,state]of manifest.frameOrder.entries()){
   const a=config.animations[state],isNew=['hurt','stunned','knockback'].includes(state);
   if(a.frames.length!==6)throw Error('Wrong frame count');
   if(isNew&&(a.rootMotion!==false||a.repeat!==(state==='stunned'?-1:0)))throw Error('Bad reaction semantics');
   if(!isNew&&JSON.stringify(a)!==JSON.stringify(old.animations[state]))throw Error('Old configuration changed');
   const frameHashes=[];
   for(const [col,name]of a.frames.entries()){
    const file=path.join(FULL,m.id,d,'frames',name+'.png'),buf=await fs.readFile(file),rect=atlas.frames[name].frame;
    if(rect.x!==col*m.frameSize||rect.y!==row*m.frameSize||rect.w!==m.frameSize||rect.h!==m.frameSize)throw Error('Wrong atlas rect '+name);
    const png=sharp(buf),meta=await png.metadata(),stats=await png.stats();
    if(meta.width!==m.frameSize||meta.height!==m.frameSize||!meta.hasAlpha||stats.channels[3].min!==0||stats.channels[3].max<128)throw Error('Blank or nontransparent frame '+name);
    if(isNew){if(!buf.equals(await fs.readFile(path.join(ADD,m.id,d,'frames',name+'.png'))))throw Error('Addon mismatch');newFrames++;}
    else {if(!buf.equals(await fs.readFile(path.join(BASE,m.id,d,'frames',name+'.png'))))throw Error('Old frame changed');oldFrames++;}
    frameHashes.push(hash(buf));
   }
   if(isNew&&new Set(frameHashes).size<5)throw Error('Repeated reaction frames');
   const gif=await sharp(path.join(FULL,m.id,d,'previews',state+'.gif'),{animated:true}).metadata();if(gif.pages!==6)throw Error('Invalid animated GIF');gifs++;
  }
 }
 if(newFrames!==432||oldFrames!==576||gifs!==168)throw Error('Asset total mismatch');
 const mod=await import(pathToFileURL(path.join(FULL,'phaser-infected.js')).href),registrations=[],cached=new Map();
 for(const m of manifest.monsters)for(const d of manifest.directions)cached.set(`infected-${m.id}-${d}-config`,m.directions[d]);
 const scene={cache:{json:{get:k=>cached.get(k)}},anims:{exists:()=>false,create:a=>registrations.push(a)}};
 mod.createInfectedAnimations(scene);if(registrations.length!==168)throw Error('Wrong registration count');
 const browser=await chromium.launch({headless:true,channel:'msedge'}),errors=[];
 try{
  const page=await browser.newPage({viewport:{width:1280,height:1000},deviceScaleFactor:1});page.on('pageerror',e=>errors.push(e.message));
  await page.goto(pathToFileURL(path.join(FULL,'preview.html')).href);
  await page.waitForFunction(()=>document.querySelector('#status').textContent==='24/24 листов загружено');
  if(await page.locator('canvas').count()!==12)throw Error('Default preview must show 12 reactions');
  const target=page.locator('canvas[data-state="hurt"][data-direction="east"]'),before=await target.screenshot();await page.waitForTimeout(120);
  if(before.equals(await target.screenshot()))throw Error('Reaction is not animating');
  await page.locator('#pause').click();const paused=await target.screenshot();await page.waitForTimeout(200);if(!paused.equals(await target.screenshot()))throw Error('Pause failed');
  await page.locator('#background').click();const qa=path.join(ROOT,'output/qa-reactions');await fs.mkdir(qa,{recursive:true});
  for(const m of manifest.monsters){await page.selectOption('#monster',m.id);await page.locator('#step').click();await page.locator('#step').click();await page.locator('#step').click();await page.waitForFunction(()=>document.querySelector('.frame').textContent.includes('4/6'));await page.screenshot({path:path.join(qa,m.id+'.png'),fullPage:true});}
  await page.selectOption('#filter','all');if(await page.locator('canvas').count()!==28)throw Error('Combined preview must show 28 states');
  await page.goto(pathToFileURL(path.join(ADD,'preview.html')).href);await page.waitForFunction(()=>document.querySelector('#status').textContent==='24/24 листов загружено');if(await page.locator('canvas').count()!==12)throw Error('Addon viewer failed');
  if(errors.length)throw Error(errors.join('\n'));
 }finally{await browser.close();}
 const report={newAnimations:72,newFrames,oldFramesPreserved:oldFrames,totalAnimations:168,totalFrames:1008,gifPreviews:gifs,directionalSources:sourceHashes.size,minimumScaleRatio:Math.min(...scales),consistentOrigins:true,phaserRegistrations:registrations.length,viewersVerified:true,pageErrors:errors,worldPhysicsImplemented:false,fullGameIntegrationTested:false};
 await fs.writeFile(path.join(FULL,'verification.json'),JSON.stringify(report,null,2)+'\n');await fs.writeFile(path.join(ADD,'verification.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
