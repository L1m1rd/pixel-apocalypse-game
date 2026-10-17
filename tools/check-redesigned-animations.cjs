const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto'),{spawnSync}=require('node:child_process'),{pathToFileURL}=require('node:url');
const sharp=require('sharp'),{chromium}=require('playwright');
const ROOT=path.resolve(__dirname,'..'),OUT=path.join(ROOT,'assets/infected-redesign-animations-v1'),read=async f=>JSON.parse(await fs.readFile(f,'utf8')),hash=b=>crypto.createHash('sha256').update(b).digest('hex');
async function main(){
 const manifest=await read(path.join(OUT,'manifest.json'));assert.equal(manifest.characters.length,18);const audit=await read(path.join(OUT,'source-audit.json'));assert.equal(audit.ready,168);assert.deepEqual(audit.missing,[]);assert.deepEqual(audit.invalid,[]);let frames=0,animations=0,corpses=0;

 for(const c of manifest.characters){assert(['A','B','C'].includes(c.grade));assert.equal(c.frameOrder.length,c.type==='06-boss'?15:c.type==='04-armored'?9:8);for(const d of manifest.directions){
  const folder=path.join(OUT,c.id,d),config=await read(path.join(folder,'animations.json')),atlas=await read(path.join(folder,'atlas.json')),size=c.frameSize;assert.deepEqual(config.origin,c.origin);
  const sheet=await sharp(path.join(folder,'spritesheet.png')).ensureAlpha().raw().toBuffer({resolveWithObject:true});assert.equal(sheet.info.width,size*6);assert.equal(sheet.info.height,size*c.frameOrder.length);
  for(const[row,state]of c.frameOrder.entries()){
   const a=config.animations[state];assert.equal(a.frames.length,6);assert.equal(a.rootMotion,false);assert.equal(a.repeat,c.actions[state].repeat);const hashes=[];
   for(const[col,n]of a.frames.entries()){
    const b=await fs.readFile(path.join(folder,'frames',n+'.png')),h=hash(b);hashes.push(h);
    const{data,info}=await sharp(b).ensureAlpha().raw().toBuffer({resolveWithObject:true});assert.equal(info.width,size);assert.equal(info.height,size);let visible=0;
    for(let y=0;y<size;y++){for(let x=0;x<size;x++){const alpha=data[(y*size+x)*4+3];if(alpha>64)visible++;if(!x||!y||x===size-1||y===size-1)assert.equal(alpha,0,'Clipping '+c.id+'/'+n);}const src=((row*size+y)*sheet.info.width+col*size)*4;assert(data.subarray(y*size*4,(y+1)*size*4).equals(sheet.data.subarray(src,src+size*4)),'Atlas mismatch '+c.id+'/'+n);}
    assert(visible>40,'Empty frame '+c.id+'/'+n);assert.deepEqual(atlas.frames[n].frame,{x:col*size,y:row*size,w:size,h:size});frames++;
   }
   assert.equal(new Set(hashes).size,6,'Duplicate frames '+c.id+'/'+state+'/'+d);assert.equal((await sharp(path.join(folder,'previews',state+'.gif'),{animated:true}).metadata()).pages,6);animations++;
  }
  assert((await fs.readFile(path.join(folder,'corpse.png'))).equals(await fs.readFile(path.join(folder,'frames','death_'+d+'_05.png'))));assert.equal(config.animations.death.repeat,0);assert(config.animations.death.holdLastFrame);corpses++;
 }}
 assert.equal(animations,672);assert.equal(frames,4032);assert.equal(corpses,72);
 const protectedFiles=(await read(path.join(OUT,'unchanged-effects-before.json'))).files;for(const p of protectedFiles){const b=await fs.readFile(path.join(ROOT,p.path));assert.equal(b.length,p.bytes);assert.equal(hash(b),p.sha256,'Protected effects changed: '+p.path);}
 const approved=await read(path.join(OUT,'publication-status.json')).then(v=>v.approved).catch(()=>false);
 const tracked=spawnSync('git',['ls-files','--','assets/infected-redesign-animations-v1'],{cwd:ROOT,encoding:'utf8'});assert.equal(tracked.status,0);if(!approved)assert.equal(tracked.stdout.trim(),'','Review pack was committed before user approval');
 const browser=await chromium.launch({headless:true,channel:'msedge'}),errors=[],qa=path.join(ROOT,'output/qa-redesigned-animations');await fs.mkdir(qa,{recursive:true});
 try{
  const page=await browser.newPage({viewport:{width:1360,height:1100}});page.on('pageerror',e=>errors.push(e.message));await page.goto(pathToFileURL(path.join(OUT,'preview.html')).href);await page.waitForFunction(()=>[...ANIMATION_REVIEW.images.values()].every(i=>i.complete&&i.naturalWidth));assert.equal(await page.locator('article').count(),12);
  await page.evaluate(()=>ANIMATION_REVIEW.setTime(0));const before=await page.locator('article').first().locator('canvas').screenshot();await page.waitForTimeout(200);assert(before.equals(await page.locator('article').first().locator('canvas').screenshot()));await page.locator('#step').click();assert(!before.equals(await page.locator('article').first().locator('canvas').screenshot()));
  let selections=0;for(const type of [...new Set(manifest.characters.map(c=>c.type))]){
   await page.selectOption('#type',type);const states=manifest.characters.find(c=>c.type===type).frameOrder;for(const state of states){await page.selectOption('#action',state);assert.equal(await page.locator('article').count(),12);await page.evaluate(()=>ANIMATION_REVIEW.setTime(300));selections++;}
   await page.selectOption('#action','death');await page.evaluate(()=>ANIMATION_REVIEW.setTime(99999));assert(await page.locator('article').evaluateAll(list=>list.every(el=>el.dataset.frame==='5')));await page.screenshot({path:path.join(qa,type+'-death.png'),fullPage:true});
   await page.selectOption('#action',type==='06-boss'?'phase3_enrage':'attack');await page.evaluate(()=>ANIMATION_REVIEW.setTime(450));await page.screenshot({path:path.join(qa,type+'-attack.png'),fullPage:true});
  }
  await page.selectOption('#skin','C');assert.equal(await page.locator('article').count(),4);await page.selectOption('#direction','north');assert.equal(await page.locator('article').count(),1);await page.locator('#bg').click();await page.screenshot({path:path.join(qa,'boss-C-back-light.png'),fullPage:true});await page.locator('#restart').click();assert.equal(await page.locator('article').getAttribute('data-frame'),'0');
  assert.deepEqual(await page.evaluate(()=>ANIMATION_REVIEW.errors),[]);assert.deepEqual(errors,[]);assert.equal(selections,56);
 }finally{await browser.close();}
 const report={characters:18,sourceSheets:168,animations,frames,staticCorpses:corpses,allFramesUniqueWithinEachAnimation:true,atlasPixelsVerified:true,transparentUnclippedEdges:true,protectedEffectFiles:protectedFiles.length,protectedEffectsUnchanged:true,viewerCheckedInEdge:true,browserErrors:errors,publicationStatus:approved?'approved for GitHub publication':'local only, not committed or uploaded; awaiting user approval',gameCodeAdded:false};await fs.writeFile(path.join(OUT,'verification.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
