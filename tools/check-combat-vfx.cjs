const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict'),{EventEmitter}=require('node:events'),{pathToFileURL}=require('node:url');
const sharp=require('sharp'),{chromium}=require('playwright');
const ROOT=path.resolve(__dirname,'..'),OUT=path.join(ROOT,'assets/combat-vfx-v1'),read=async p=>JSON.parse(await fs.readFile(p,'utf8'));
async function main(){
 const manifest=await read(path.join(OUT,'manifest.json'));assert.equal(manifest.effects.length,16);let count=0;
 const existing=await read(path.join(ROOT,'assets/special-vfx-v1/manifest.json'));const ids=new Set(existing.effects.map(e=>e.id));
 for(const e of manifest.effects){
  assert(!ids.has(e.id),'Effect ID collides with existing VFX');ids.add(e.id);assert.equal(e.frames.length,6);assert.deepEqual(e.origin,{x:.5,y:.5});assert.equal(e.repeat,e.persistence==='loop'?-1:0);assert.equal(e.rootMotion,false);
  const folder=path.join(OUT,'effects',e.id),atlas=await read(path.join(folder,'atlas.json')),buffers=[];
  for(const[i,n]of e.frames.entries()){
   const b=await fs.readFile(path.join(folder,'frames',n+'.png'));buffers.push(b.toString('base64'));const{data,info}=await sharp(b).ensureAlpha().raw().toBuffer({resolveWithObject:true});assert.equal(info.width,e.frameWidth);assert.equal(info.height,e.frameHeight);
   let opaque=0,transparent=0;for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){const a=data[(y*info.width+x)*4+3];if(a>64)opaque++;if(!a)transparent++;if(!x||!y||x===info.width-1||y===info.height-1)assert.equal(a,0,'Clipped '+n);}
   assert(opaque>2,'Empty frame '+n);assert(transparent>100,'No transparency '+n);const rect=atlas.frames[n].frame;assert.deepEqual(rect,{x:i*e.frameWidth,y:0,w:e.frameWidth,h:e.frameHeight});const crop=await sharp(path.join(folder,'spritesheet.png')).extract({left:rect.x,top:rect.y,width:rect.w,height:rect.h}).ensureAlpha().raw().toBuffer();assert(data.equals(crop),'Atlas pixel mismatch '+n);count++;
  }
  assert.equal(new Set(buffers).size,6,'Duplicate frames '+e.id);assert.equal((await sharp(path.join(folder,'preview.gif'),{animated:true}).metadata()).pages,6);
  if(e.persistence==='decal')assert((await fs.readFile(path.join(folder,'decal.png'))).equals(await fs.readFile(path.join(folder,'frames',e.frames[5]+'.png'))));
 }
 assert.equal(count,96);for(const name of ['spores','blood','blood-directional','impacts'])assert.equal((await sharp(path.join(OUT,'comparisons',name+'.gif'),{animated:true}).metadata()).pages,6);
 const mod=await import(pathToFileURL(path.join(OUT,'phaser-example.mjs')).href),loaded=[],registered=[];let lastSprite,lastTimer;
 class Sprite extends EventEmitter{setOrigin(x,y){this.origin={x,y};return this;}setDepth(v){this.depth=v;return this;}setFrame(v){this.frame=v;return this;}play(v){this.played=v;return this;}destroy(){if(!this.destroyed){this.destroyed=true;this.emit('destroy');}}anims={stop:()=>{this.stopped=true;}};}
 const scene={load:{atlas:(...a)=>loaded.push(a)},anims:{exists:()=>false,create:a=>registered.push(a)},add:{sprite:(x,y,key,frame)=>{lastSprite=new Sprite();Object.assign(lastSprite,{x,y,key,frame});return lastSprite;}},time:{delayedCall:(ms,cb)=>(lastTimer={ms,cb,removed:false,remove(){this.removed=true;}})}};
 mod.preloadCombatVfx(scene,manifest);mod.createCombatVfxAnimations(scene,manifest);assert.equal(loaded.length,16);assert.equal(registered.length,16);
 for(const e of manifest.effects){const s=mod.addCombatVfx(scene,manifest,e.id,11,22,{depth:5});assert.deepEqual(s.origin,e.origin);assert.equal(s.depth,5);assert.equal(s.x,11);s.emit('animationcomplete');if(e.persistence==='destroy')assert(s.destroyed);else assert(!s.destroyed);if(e.persistence==='decal')assert.equal(s.frame,e.frames[5]);s.destroy();assert.equal(s.listenerCount('animationcomplete'),0);assert.equal(s.listenerCount('destroy'),0);}
 const timed=mod.addCombatVfx(scene,manifest,'spore_cloud_dense',0,0,{lifetimeMs:2000});assert.equal(lastTimer.ms,2000);lastTimer.cb();assert(timed.destroyed);assert(lastTimer.removed);
 const early=mod.addCombatVfx(scene,manifest,'spore_trail',0,0,{lifetimeMs:3000});early.destroy();assert(lastTimer.removed);
 const decal=mod.addCombatDecal(scene,manifest,'blood_pool_form',0,0);assert(decal.stopped);assert.equal(decal.frame,'blood_pool_form_05');decal.destroy();assert.throws(()=>mod.addCombatVfx(scene,manifest,'no-such-id',0,0));assert.throws(()=>mod.addCombatVfx(scene,manifest,'hit_flesh',0,0,{lifetimeMs:-1}));
 const browser=await chromium.launch({headless:true,channel:'msedge'}),errors=[];const qa=path.join(ROOT,'output/qa-combat-vfx');await fs.mkdir(qa,{recursive:true});
 try{
  const page=await browser.newPage({viewport:{width:1360,height:1100}});page.on('pageerror',e=>errors.push(e.message));await page.goto(pathToFileURL(path.join(OUT,'preview.html')).href);await page.waitForFunction(()=>document.querySelector('#status').textContent==='16/16 листов загружено');assert.equal(await page.locator('article:visible').count(),16);
  await page.evaluate(()=>VFX_REVIEW.setTime(250));const before=await page.locator('article[data-id="hit_metal"] canvas').screenshot();await page.waitForTimeout(180);assert(before.equals(await page.locator('article[data-id="hit_metal"] canvas').screenshot()));await page.locator('#step').click();assert(!before.equals(await page.locator('article[data-id="hit_metal"] canvas').screenshot()));
  await page.evaluate(()=>VFX_REVIEW.setTime(99999));assert.equal(await page.locator('[data-id="blood_pool_form"]').getAttribute('data-frame'),'5');await page.locator('#restart').click();assert.equal(await page.locator('[data-id="blood_pool_form"]').getAttribute('data-frame'),'0');
  await page.evaluate(()=>VFX_REVIEW.setTime(250));await page.screenshot({path:path.join(qa,'all.png'),fullPage:true});
  for(const category of ['spores','blood','directional','impacts']){await page.selectOption('#category',category);assert.equal(await page.locator('article:visible').count(),4);await page.screenshot({path:path.join(qa,category+'.png'),fullPage:true});}
  await page.locator('#bg').click();await page.screenshot({path:path.join(qa,'impacts-light.png'),fullPage:true});assert.deepEqual(errors,[]);
 }finally{await browser.close();}
 const report={animations:16,frames:count,staticDecals:1,sourceBoards:4,uniqueFramesPerAnimation:6,alphaAndEdgesVerified:true,atlasPixelsVerified:true,idsCompatibleWithSpecialEffects:true,phaserRegistrations:registered.length,oneShotCleanupTested:true,loopLifetimeCleanupTested:true,staticPoolHoldTested:true,viewerFiltersAndControlsTested:true,browserErrors:errors,gameCombatImplemented:false,gameIntegrationTested:false};
 await fs.writeFile(path.join(OUT,'verification.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
