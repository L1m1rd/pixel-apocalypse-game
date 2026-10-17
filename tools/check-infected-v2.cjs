const fs=require('node:fs/promises');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const sharp=require('sharp');
const {chromium}=require('playwright');
const ROOT=path.resolve(__dirname,'..'),OUT=path.join(ROOT,'assets/infected-animation-pack-v2');
async function main(){
 const manifest=JSON.parse(await fs.readFile(path.join(OUT,'manifest.json'),'utf8'));
 const ids=new Set(),directions=['south','west','east','north'];let frameCount=0,gifCount=0;
 for(const m of manifest.monsters){
  if(ids.has(m.id))throw Error('Duplicate monster');ids.add(m.id);
  let origin;
  for(const d of directions){
   const config=m.directions[d],dir=path.join(OUT,m.id,d),atlas=JSON.parse(await fs.readFile(path.join(dir,'atlas.json'),'utf8'));
   const sheet=await sharp(path.join(dir,'spritesheet.png')).metadata();
   if(!sheet.hasAlpha||sheet.width!==m.frameSize*6||sheet.height!==m.frameSize*4)throw Error('Bad atlas '+m.id+'/'+d);
   const o=JSON.stringify(config.origin);if(origin&&origin!==o)throw Error('Origin changes across directions');origin=o;
   for(const [row,state] of manifest.frameOrder.entries()){
    const a=config.animations[state];if(a.frames.length!==6||a.repeat!==(state==='attack'?0:-1))throw Error('Bad animation config');
    const meta=await sharp(path.join(dir,'previews',state+'.gif'),{animated:true}).metadata();if(meta.pages!==6)throw Error('Bad GIF');gifCount++;
    for(const [col,f] of a.frames.entries()){
     if(!f.includes('_'+d+'_'))throw Error('Wrong directional frame name');
     const rect=atlas.frames[f].frame;if(rect.x!==col*m.frameSize||rect.y!==row*m.frameSize)throw Error('Wrong atlas rect');
     const png=sharp(path.join(dir,'frames',f+'.png')),info=await png.metadata(),stats=await png.stats();
     if(info.width!==m.frameSize||info.height!==m.frameSize||!info.hasAlpha||stats.channels[3].min!==0||stats.channels[3].max<128)throw Error('Bad transparent frame '+f);
     frameCount++;
    }
   }
  }
 }
 if(frameCount!==576||gifCount!==96)throw Error('Wrong total assets');
 const module=await import(pathToFileURL(path.join(OUT,'phaser-infected.js')).href);
 const registrations=[],loadCalls=[],cache=new Map();
 for(const m of manifest.monsters)for(const d of directions)cache.set(`infected-${m.id}-${d}-config`,m.directions[d]);
 const scene={load:{atlas:(...a)=>loadCalls.push(['atlas',...a]),json:(...a)=>loadCalls.push(['json',...a])},cache:{json:{get:key=>cache.get(key)}},anims:{exists:()=>false,create:a=>registrations.push(a)}};
 module.preloadInfected(scene);module.createInfectedAnimations(scene);
 if(registrations.length!==96||loadCalls.length!==48)throw Error('Wrong Phaser registrations');
 if(module.directionFromVelocity(-1,0)!=='west'||module.directionFromVelocity(0,-1)!=='north'||module.directionFromVelocity(0,0,'east')!=='east')throw Error('Wrong velocity mapping');
 const browser=await chromium.launch({headless:true,channel:'msedge'});const errors=[];
 try{
  const page=await browser.newPage({viewport:{width:1280,height:1000},deviceScaleFactor:1});page.on('pageerror',e=>errors.push(e.message));
  await page.goto(pathToFileURL(path.join(OUT,'preview.html')).href);
  await page.waitForFunction(()=>document.querySelector('#status').textContent==='24/24 листов загружено');
  if(await page.locator('canvas').count()!==16)throw Error('Wrong canvas count');
  const before=await page.locator('canvas[data-state="run"][data-direction="east"]').screenshot();await page.waitForTimeout(180);
  if(before.equals(await page.locator('canvas[data-state="run"][data-direction="east"]').screenshot()))throw Error('Animation does not advance');
  await page.locator('#pause').click();const paused=await page.locator('canvas').first().screenshot();await page.waitForTimeout(200);
  if(!paused.equals(await page.locator('canvas').first().screenshot()))throw Error('Pause failed');
  await page.locator('#background').click();
  const qaDir=path.join(ROOT,'output/qa-v2');await fs.mkdir(qaDir,{recursive:true});
  for(const m of manifest.monsters){await page.selectOption('#monster',m.id);await page.waitForTimeout(50);await page.screenshot({path:path.join(qaDir,m.id+'.png'),fullPage:true});}
  await page.selectOption('#monster','runner');await page.locator('#step').click();
  await page.waitForFunction(()=>document.querySelector('.frame').textContent.includes('2/6'));
  if(errors.length)throw Error(errors.join('\n'));
 }finally{await browser.close();}
 const report={frames:frameCount,gifs:gifCount,loadedSheets:24,phaserRegistrations:registrations.length,consistentOrigins:true,allPngsTransparent:true,previewAnimationAdvances:true,pauseWorks:true,stepWorks:true,pageErrors:errors,fullGameIntegrationTested:false};
 await fs.writeFile(path.join(OUT,'verification.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
