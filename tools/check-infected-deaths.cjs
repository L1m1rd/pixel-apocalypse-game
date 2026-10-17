const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url'),sharp=require('sharp'),{chromium}=require('playwright');
const ROOT=path.resolve(__dirname,'..'),BASE=path.join(ROOT,'assets/infected-animation-pack-v3'),ADD=path.join(ROOT,'assets/infected-deaths-v1'),FULL=path.join(ROOT,'assets/infected-animation-pack-v4');
const read=async p=>JSON.parse(await fs.readFile(p,'utf8'));
async function main(){
 const manifest=await read(path.join(FULL,'manifest.json'));let oldFrames=0,newFrames=0,corpses=0,gifs=0;
 for(const m of manifest.monsters)for(const d of manifest.directions){
  const config=m.directions[d],old=await read(path.join(BASE,m.id,d,'animations.json')),atlas=await read(path.join(FULL,m.id,d,'atlas.json'));
  assert.deepEqual(config.origin,old.origin);assert.equal(config.animations.death.repeat,0);assert.equal(config.animations.death.holdLastFrame,true);assert.equal(config.animations.death.rootMotion,false);
  const sheet=await sharp(path.join(FULL,m.id,d,'spritesheet.png')).metadata();assert.equal(sheet.width,m.frameSize*6);assert.equal(sheet.height,m.frameSize*8);assert(sheet.hasAlpha);
  const oldSheet=await sharp(path.join(BASE,m.id,d,'spritesheet.png')).ensureAlpha().raw().toBuffer(),retained=await sharp(path.join(FULL,m.id,d,'spritesheet.png')).extract({left:0,top:0,width:m.frameSize*6,height:m.frameSize*7}).ensureAlpha().raw().toBuffer();assert(oldSheet.equals(retained),'Existing atlas artwork changed');
  const crops=await read(path.join(ADD,m.id,d,'source-crops.json'));assert(crops.frameTransformsFixed);
  for(const[row,state]of manifest.frameOrder.entries()){
   const a=config.animations[state];assert.equal(a.frames.length,6);if(state!=='death')assert.deepEqual(a,old.animations[state]);
   const hashes=[];
   for(const[col,name]of a.frames.entries()){
    const buf=await fs.readFile(path.join(FULL,m.id,d,'frames',name+'.png'));hashes.push(buf.toString('base64'));
    const png=sharp(buf),meta=await png.metadata(),stats=await png.stats();assert.equal(meta.width,m.frameSize);assert.equal(meta.height,m.frameSize);assert(meta.hasAlpha);assert.equal(stats.channels[3].min,0);assert(stats.channels[3].max>128);
    assert.deepEqual(atlas.frames[name].frame,{x:col*m.frameSize,y:row*m.frameSize,w:m.frameSize,h:m.frameSize});
    if(state==='death'){
     const atlasPixels=await sharp(path.join(FULL,m.id,d,'spritesheet.png')).extract({left:col*m.frameSize,top:row*m.frameSize,width:m.frameSize,height:m.frameSize}).raw().toBuffer();assert((await sharp(buf).raw().toBuffer()).equals(atlasPixels),'Death atlas differs '+m.id+'/'+d+'/'+name);
     assert(buf.equals(await fs.readFile(path.join(ADD,m.id,d,'frames',name+'.png'))));newFrames++;
     const {data,info}=await sharp(buf).raw().toBuffer({resolveWithObject:true});
     for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++)if(x===0||y===0||x===info.width-1||y===info.height-1)assert.equal(data[(y*info.width+x)*4+3],0,'Clipped edge '+m.id+'/'+d+'/'+name);
    }else{assert(buf.equals(await fs.readFile(path.join(BASE,m.id,d,'frames',name+'.png'))));oldFrames++;}
   }
   if(state==='death')assert.equal(new Set(hashes).size,6);
   const gif=await sharp(path.join(FULL,m.id,d,'previews',state+'.gif'),{animated:true}).metadata();assert.equal(gif.pages,6);if(state==='death')assert.equal(gif.delay[5],2200);gifs++;
  }
  const body=await fs.readFile(path.join(FULL,m.id,d,'corpse.png')),last=await fs.readFile(path.join(FULL,m.id,d,'frames',config.corpse.frame+'.png'));
  assert(body.equals(last));assert(body.equals(await fs.readFile(path.join(ADD,m.id,d,'corpse.png'))));assert(config.corpse.static);assert.equal(config.corpse.frame,config.animations.death.frames[5]);corpses++;
 }
 assert.equal(oldFrames,1008);assert.equal(newFrames,144);assert.equal(corpses,24);assert.equal(gifs,192);
 const code=await fs.readFile(path.join(FULL,'phaser-infected.js'),'utf8'),mod=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
 const cached=new Map(),registrations=[];for(const m of manifest.monsters)for(const d of manifest.directions)cached.set(`infected-${m.id}-${d}-config`,m.directions[d]);
 const scene={cache:{json:{get:k=>cached.get(k)}},anims:{exists:()=>false,create:a=>registrations.push(a)}};mod.createInfectedAnimations(scene);assert.equal(registrations.length,192);
 // Exercise one-shot completion and persistent corpse restore separately.
 for(const m of manifest.monsters)for(const d of manifest.directions){
  const data=new Map(),events=new Map(),plays=[];let stopped=0,texture,frame;
  const sprite={scene,anims:{stop:()=>stopped++},getData:k=>data.get(k),setData(k,v){data.set(k,v);return this;},once(k,fn){events.set(k,fn);return this;},setOrigin(){return this;},setFlipX(){return this;},play(k){plays.push(k);return this;},setTexture(k,f){texture=k;frame=f;return this;}};
  mod.playInfectedDeath(sprite,m.id,d);mod.playInfectedDeath(sprite,m.id,d);assert.equal(plays.length,1);
  events.get('animationcomplete-'+m.id+'-death-'+d)();assert.equal(stopped,1);assert.equal(texture,'infected-'+m.id+'-'+d);assert.equal(frame,m.directions[d].corpse.frame);
  mod.showInfectedCorpse(sprite,m.id,d);assert.equal(plays.length,1);assert.equal(stopped,2);
 }
 // Read back local-file canvas pixels in this isolated test browser only.
 const browser=await chromium.launch({headless:true,channel:'msedge',args:['--allow-file-access-from-files']}),errors=[];let screenshotCount=0;
 try{
  const page=await browser.newPage({viewport:{width:1280,height:1000}});page.on('pageerror',e=>errors.push(e.message));
  await page.goto(pathToFileURL(path.join(FULL,'preview.html')).href);await page.waitForFunction(()=>document.querySelector('#status').textContent==='24/24 листов загружено');assert.equal(await page.locator('canvas').count(),8);
  await page.locator('#restart').click();await page.waitForFunction(()=>document.querySelector('.frame').textContent.includes('финальный'));
  const target=page.locator('canvas[data-state="death"][data-direction="south"]');const final=await target.screenshot();await page.waitForTimeout(400);assert(final.equals(await target.screenshot()),'Death restarted after completion');
  assert.equal(await target.evaluate(c=>c.toDataURL()),await page.locator('canvas[data-state="corpse"][data-direction="south"]').evaluate(c=>c.toDataURL()),'Corpse canvas differs from terminal frame');
  await page.locator('#restart').click();await page.locator('#pause').click();
  const paused=await target.screenshot();await page.waitForTimeout(250);assert(paused.equals(await target.screenshot()));
  await page.locator('#background').click();const qa=path.join(ROOT,'output/qa-deaths');await fs.mkdir(qa,{recursive:true});
  for(const m of manifest.monsters){await page.selectOption('#monster',m.id);for(let i=0;i<5;i++)await page.locator('#step').click();await page.waitForFunction(()=>document.querySelector('.frame').textContent.includes('финальный'));await page.screenshot({path:path.join(qa,m.id+'.png'),fullPage:true});screenshotCount++;}
  await page.selectOption('#filter','all');assert.equal(await page.locator('canvas').count(),36);
  await page.goto(pathToFileURL(path.join(ADD,'preview.html')).href);await page.waitForFunction(()=>document.querySelector('#status').textContent==='24/24 листов загружено');assert.equal(await page.locator('canvas').count(),8);
  assert.deepEqual(errors,[]);
 }finally{await browser.close();}
 const report={newAnimations:24,newFrames,staticCorpses:corpses,oldFramesPreserved:oldFrames,totalAnimations:192,totalFrames:1152,gifPreviews:gifs,consistentOrigins:true,atlasPixelsVerified:true,transparentUnclippedEdges:true,fixedFallTransforms:true,corpseEqualsTerminalFrame:true,oneShotCompletionTested:true,persistentCorpseRestoreTested:true,viewerHoldsDeathFrame:true,viewerScreenshots:screenshotCount,pageErrors:errors,gameIntegrationTested:false};
 for(const folder of[FULL,ADD])await fs.writeFile(path.join(folder,'verification.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
