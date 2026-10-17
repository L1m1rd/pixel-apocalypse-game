const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict'),crypto=require('node:crypto'),{pathToFileURL}=require('node:url');
function dep(n){try{return require(n);}catch{return require(path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules',n));}}
const sharp=dep('sharp'),{chromium}=dep('playwright'),OUT=path.resolve(__dirname,'../assets/weapon-animations-v1'),read=async p=>JSON.parse(await fs.readFile(path.join(OUT,p),'utf8'));
async function main(){
 const m=await read('manifest.json');assert.equal(m.totalWeapons,24);assert.equal(m.totalAnimations,48);assert.equal(m.totalFrames,576);assert.equal(new Set(m.weapons.map(w=>w.id)).size,24);let frames=0,animations=0;
 for(const w of m.weapons){
  const config=await read(w.id+'/animations.json'),atlas=await read(w.id+'/atlas.json');assert.equal(config.direction,'east');
  const sheet=await sharp(path.join(OUT,w.id,'spritesheet.png')).ensureAlpha().raw().toBuffer({resolveWithObject:true});assert.equal(sheet.info.width,1152);assert.equal(sheet.info.height,768);
  for(const[action,a]of Object.entries(config.animations)){
   assert.equal(a.repeat,0);assert.equal(a.rootMotion,false);assert.equal(a.frames.length,action==='fire'?6:18);assert.equal(a.durationMs,a.frameDurationMs.reduce((x,y)=>x+y,0));const hashes=[];
   for(const f of a.frames){
    const b=await fs.readFile(path.join(OUT,w.id,'frames',f+'.png'));hashes.push(crypto.createHash('sha256').update(b).digest('hex'));const{data,info}=await sharp(b).ensureAlpha().raw().toBuffer({resolveWithObject:true});assert.equal(info.width,192);assert.equal(info.height,192);let visible=0;
    for(let y=0;y<192;y++)for(let x=0;x<192;x++){const alpha=data[(y*192+x)*4+3];if(alpha>64)visible++;if(!x||!y||x===191||y===191)assert.equal(alpha,0,w.id+'/'+f+' touches edge');}assert(visible>50);
    const r=atlas.frames[f].frame;for(let y=0;y<192;y++){const start=((r.y+y)*1152+r.x)*4;assert(data.subarray(y*192*4,(y+1)*192*4).equals(sheet.data.subarray(start,start+192*4)),w.id+'/'+f+' atlas mismatch');}frames++;
   }
   assert(new Set(hashes).size>=(action==='fire'?3:5),w.id+'/'+action+' insufficient pose changes');assert.equal((await sharp(path.join(OUT,w.id,action+'.gif'),{animated:true}).metadata()).pages,a.frames.length);animations++;
  }
 }
 const qa=path.join(OUT,'qa');await fs.mkdir(qa,{recursive:true});const browser=await chromium.launch({headless:true,channel:'msedge'}),errors=[];
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1100}});page.on('pageerror',e=>errors.push(e.message));await page.goto(pathToFileURL(path.join(OUT,'preview.html')).href);await page.waitForFunction(()=>[...WEAPON_VIEW.images.values()].every(i=>i.complete&&i.naturalWidth));await page.evaluate(()=>WEAPON_VIEW.pause());assert.equal(await page.locator('article').count(),24);
  for(const action of ['fire','reload']){
   await page.selectOption('#action',action);await page.evaluate(()=>WEAPON_VIEW.setTime(120));await page.screenshot({path:path.join(qa,'all-'+action+'.png'),fullPage:true});
   for(const w of m.weapons){await page.selectOption('#weapon',w.id);const a=w.animations[action];await page.evaluate(t=>WEAPON_VIEW.setTime(t),a.durationMs-1);assert.equal(await page.locator('article').getAttribute('data-frame'),String(a.frames.length-1));await page.locator('#loop').uncheck();await page.evaluate(t=>WEAPON_VIEW.setTime(t),a.durationMs+1);assert.equal(await page.locator('article').getAttribute('data-frame'),'-1');await page.locator('#loop').check();}
   await page.selectOption('#weapon','all');
  }
  await page.selectOption('#weapon','izh-43');await page.selectOption('#action','reload');await page.evaluate(()=>WEAPON_VIEW.setTime(1250));await page.locator('#bg').click();await page.screenshot({path:path.join(qa,'double-reload-light.png'),fullPage:true});await page.locator('#restart').click();assert.equal(await page.locator('article').getAttribute('data-frame'),'0');await page.locator('#step').click();assert.equal(await page.locator('article').getAttribute('data-frame'),'1');
  assert.deepEqual(await page.evaluate(()=>WEAPON_VIEW.errors),[]);assert.deepEqual(errors,[]);
 }finally{await browser.close();}
 const report={weapons:24,animations,frames,sourceSheets:24,directions:['east'],oneShotActions:true,alphaAndEdgesVerified:true,atlasPixelsVerified:true,animatedGifFrameCountsVerified:true,all48ActionsCheckedInEdge:true,viewerFiltersAndSteppingVerified:true,browserErrors:errors,scope:'Visual asset export and viewer; no character attachment, ammo, damage, sound or network gameplay tested.'};await fs.writeFile(path.join(OUT,'verification.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
