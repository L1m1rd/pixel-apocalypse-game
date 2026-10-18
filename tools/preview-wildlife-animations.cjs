const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),{pathToFileURL}=require('node:url');let chromium;try{({chromium}=require('playwright'));}catch{({chromium}=require(path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')));}
const ROOT=path.resolve(__dirname,'..'),OUT=path.join(ROOT,'output/qa-wildlife-animations');
(async()=>{
 await fs.mkdir(OUT,{recursive:true});const server=require('./serve-wildlife-animations.cjs');if(!server.listening)await require('node:events').once(server,'listening');const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1060},deviceScaleFactor:1}),errors=[];page.on('pageerror',e=>errors.push(String(e)));await page.goto('http://127.0.0.1:'+server.address().port+'/');await page.locator('.card').first().waitFor();
  async function loaded(){await page.waitForFunction(()=>window.WILDLIFE_PREVIEW&&WILDLIFE_PREVIEW.pendingImages===0);await page.waitForFunction(()=>{const c=document.querySelector('canvas');return c&&c.getContext('2d').getImageData(0,0,c.width,c.height).data.some((v,i)=>i%4===3&&v>20);});}
  await loaded();if(await page.locator('.card').count()!==20)throw Error('Expected 20 animal cards');if(await page.evaluate(()=>WILDLIFE_PREVIEW.selectedVariant)!=='B')throw Error('Wrong variant');await page.screenshot({path:path.join(OUT,'01-movement.png')});
  const expected={idle:20,walk:18,run:18,fly:5,swim:3,jump:1,attack:6},checked={};
  for(const [action,count] of Object.entries(expected)){
   await page.locator('#action').selectOption(action);await loaded();const actual=await page.locator('.card').count();checked[action]=actual;if(actual!==count)throw Error(action+': expected '+count+', got '+actual);
   if(action==='attack'){const onlyAttackers=await page.evaluate(()=>WILDLIFE_PREVIEW.cards.every(c=>c.animal.attackCapable&&c.configs.every(a=>a.repeat===0)));if(!onlyAttackers)throw Error('Attack settings incorrect');await page.screenshot({path:path.join(OUT,'02-attacks.png')});}
   if(action==='fly')await page.screenshot({path:path.join(OUT,'03-birds-flight.png')});
   if(action==='swim')await page.screenshot({path:path.join(OUT,'04-swimming.png')});
   if(action==='jump'){await page.locator('#frame').evaluate(e=>{e.value='3';e.dispatchEvent(new Event('input',{bubbles:true}));});await page.screenshot({path:path.join(OUT,'05-frog-jump.png')});}
  }
  await page.locator('#action').selectOption('auto');await page.locator('#filter').selectOption('hostile');await loaded();if(await page.locator('.card').count()!==6)throw Error('Hostile filter incorrect');await page.locator('#background').click();await page.screenshot({path:path.join(OUT,'06-light-background.png')});
  const status=await page.evaluate(()=>({loadedImages:WILDLIFE_PREVIEW.loadedImages,pendingImages:WILDLIFE_PREVIEW.pendingImages,failedImages:WILDLIFE_PREVIEW.failedImages,assetErrors:WILDLIFE_PREVIEW.errors}));if(errors.length||status.failedImages.length||status.assetErrors.length||status.pendingImages||status.loadedImages!==1704)throw Error(JSON.stringify({errors,status}));
  const report={passed:true,selectedVariant:'B',species:20,actionFilters:checked,...status,pageErrors:errors};await fs.writeFile(path.join(OUT,'verification.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e);process.exitCode=1;});
