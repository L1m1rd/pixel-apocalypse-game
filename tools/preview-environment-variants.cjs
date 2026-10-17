// Local visual QA for the generated asset viewer; no server or network needed.
const path=require('node:path'),fs=require('node:fs/promises'),os=require('node:os'),{pathToFileURL}=require('node:url');
let chromium;try{({chromium}=require('playwright'));}catch{({chromium}=require(path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')));}
const root=path.resolve(__dirname,'..'),out=path.join(root,'output/qa-environment-variants');
(async()=>{
 await fs.mkdir(out,{recursive:true});const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1}),errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.goto(pathToFileURL(path.join(root,'assets/environment-variants-v1/preview.html')).href);await page.locator('.card').first().waitFor();
  const all=await page.locator('.card').count();await page.screenshot({path:path.join(out,'01-terrain.png')});
  await page.locator('#category').selectOption('prop');await page.locator('#search').fill('дерево');
  const trees=await page.locator('.card').count();if(trees<3)throw Error('Expected three kinds of trees');await page.screenshot({path:path.join(out,'02-trees.png')});
  await page.locator('#search').fill('');await page.locator('#category').selectOption('animation');
  const animations=await page.locator('.card').count();if(animations){await page.locator('#motion').click();await page.locator('#background').click();await page.screenshot({path:path.join(out,'03-effects-light.png')});}
  await page.locator('#category').selectOption('all');
  // Force lazy images to load before checking references.
  await page.locator('img').evaluateAll(imgs=>imgs.forEach(i=>i.loading='eager'));
  await page.waitForFunction(()=>[...document.images].every(i=>i.complete));
  const broken=await page.locator('img').evaluateAll(imgs=>imgs.filter(i=>!i.naturalWidth).map(i=>i.src));if(broken.length)throw Error('Broken images: '+broken.join(', '));if(errors.length)throw Error(errors.join('\n'));
  const report={passed:true,cards:all,treeKinds:trees,animatedElements:animations,brokenImages:broken,pageErrors:errors,screenshots:['01-terrain.png','02-trees.png',...(animations?['03-effects-light.png']:[])]};await fs.writeFile(path.join(out,'verification.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
