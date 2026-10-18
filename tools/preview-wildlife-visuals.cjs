const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),{pathToFileURL}=require('node:url');let chromium;try{({chromium}=require('playwright'));}catch{({chromium}=require(path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')));}
const root=path.resolve(__dirname,'..'),out=path.join(root,'output/qa-wildlife-visuals');
(async()=>{
 await fs.mkdir(out,{recursive:true});const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1}),errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.goto(pathToFileURL(path.join(root,'assets/wildlife-visuals-v1/preview.html')).href);await page.locator('.card').first().waitFor();const cards=await page.locator('.card').count();
  const selected=await page.locator('.variant img').evaluateAll(imgs=>imgs.map(i=>i.getAttribute('src')));if(selected.length!==20||selected.some(s=>!s.includes('_b_')))throw Error('Expected selected B only for all 20 species');
  await page.locator('#variants').click();if(await page.locator('.variant img').count()!==60)throw Error('Archived A/B/C comparison missing');await page.locator('#variants').click();
  const broken=[];
  for(const dir of ['west','east','south','north']){
   await page.locator('#direction').selectOption(dir);await page.locator('img').evaluateAll(imgs=>imgs.forEach(i=>i.loading='eager'));await page.waitForFunction(()=>[...document.images].every(i=>i.complete));broken.push(...await page.locator('img').evaluateAll(imgs=>imgs.filter(i=>!i.naturalWidth).map(i=>i.src)));
   if(dir==='west')await page.screenshot({path:path.join(out,'01-side-views.png')});
  }
  await page.locator('#background').click();await page.screenshot({path:path.join(out,'02-rear-light.png')});
  await page.locator('#search').fill('вор');const searchMatches=await page.locator('.card').count();if(searchMatches!==2)throw Error('Search expected crow and sparrow');
  if(errors.length||broken.length)throw Error(JSON.stringify({errors,broken}));const report={passed:true,cards,directionsChecked:4,brokenImages:broken,pageErrors:errors,searchMatches};await fs.writeFile(path.join(out,'verification.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
