const { chromium } = require('playwright');
const path = require('node:path');
const fs = require('node:fs/promises');
const { pathToFileURL } = require('node:url');
async function main(){
 const root=path.resolve(__dirname,'..');
 const browser=await chromium.launch({headless:true,channel:'msedge'});
 try {
  const page=await browser.newPage({viewport:{width:1280,height:1000},deviceScaleFactor:1});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(pathToFileURL(path.join(root,'assets/infected-animation-pack-v1/preview.html')).href);
  await page.waitForFunction(()=>document.querySelector('#status').textContent==='6/6 листов загружено');
  const count=await page.locator('canvas').count();if(count!==24)throw Error('Expected 24 canvas previews');
  const before=await page.locator('canvas').first().screenshot();
  await page.waitForTimeout(350);
  const after=await page.locator('canvas').first().screenshot();
  if(before.equals(after))throw Error('Animation is not advancing');
  await page.locator('#pause').click();
  const paused=await page.locator('canvas').first().screenshot();
  await page.waitForTimeout(300);
  if(!paused.equals(await page.locator('canvas').first().screenshot()))throw Error('Pause failed');
  await page.locator('#bg').click();
  await fs.mkdir(path.join(root,'output'),{recursive:true});
  await page.screenshot({path:path.join(root,'output/infected-preview-check.png'),fullPage:true});
  if(errors.length)throw Error(errors.join('\n'));
  const report={canvasPreviews:count,loadedSheets:6,animationAdvances:true,pauseWorks:true,pageErrors:errors};
  await fs.writeFile(path.join(root,'assets/infected-animation-pack-v1/viewer-validation.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify(report));
 } finally {await browser.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
