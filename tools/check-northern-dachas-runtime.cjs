const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {_electron:electron}=require('playwright');
const ROOT=path.resolve(__dirname,'..'),out=path.join(ROOT,'output/northern-dachas-review'),profile=path.join(ROOT,'tmp/northern-dachas-runtime-test');
fs.mkdirSync(out,{recursive:true});fs.mkdirSync(profile,{recursive:true});
const savePath=path.join(profile,'world-v1.json');
const seed={version:1,worldName:'Северные дачи — проверка',characterId:'01-gleb',x:4740,y:4740,direction:'north',crouched:false,district:{mapId:'northern-dachas-v1',openedGates:[]}};
const packaged=process.argv.includes('--packaged');
const exe=packaged?(process.env.PIXEL_APOCALYPSE_OUTPUT?path.join(process.env.PIXEL_APOCALYPSE_OUTPUT,'PixelApocalypse.exe'):path.join(ROOT,'output/PixelApocalypse-northern-dachas-v0.3.0-win32-x64/PixelApocalypse.exe')):require('../desktop/node_modules/electron');
const env={...process.env,PIXEL_APOCALYPSE_TEST_DATA:profile};delete env.ELECTRON_RUN_AS_NODE;
async function launch(){
 const app=await electron.launch({executablePath:exe,args:packaged?[]:[path.join(ROOT,'desktop')],env,timeout:60000});
 const page=await app.firstWindow(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await app.evaluate(({BrowserWindow})=>{const window=BrowserWindow.getAllWindows()[0];window.show();window.focus();});
 await page.waitForFunction(()=>window.__prototype?.getState().ready,{timeout:60000});
 return {app,page,errors};
}
const state=page=>page.evaluate(()=>window.__prototype.getState());
async function main(){
 fs.writeFileSync(savePath,JSON.stringify(seed));
 let app,page,errors;({app,page,errors}=await launch());
 try{
  await page.click('#continue');await page.waitForFunction(()=>window.__prototype.getState().screen==='game');
  const initial=await state(page);assert.equal(initial.districtMetrics.plots,80);assert.equal(initial.districtMetrics.houses,60);assert.equal(initial.districtMetrics.sectors,8);
  await page.keyboard.down('w');await page.waitForTimeout(450);await page.keyboard.up('w');
  let current=await state(page);if(Math.hypot(current.player.x-initial.player.x,current.player.y-initial.player.y)<=5){await page.screenshot({path:path.join(out,'movement-diagnostic.png')});console.log(JSON.stringify({initial,current,errors,document:await page.evaluate(()=>({focused:document.hasFocus(),visibility:document.visibilityState}))}));}assert(Math.hypot(current.player.x-initial.player.x,current.player.y-initial.player.y)>5,'Walking must change position');
  await page.screenshot({path:path.join(out,'01-south-entry.png')});
  await page.keyboard.press('m');assert((await state(page)).mapOpen);const before=(await state(page)).player;
  await page.keyboard.down('d');await page.waitForTimeout(120);await page.keyboard.up('d');assert.equal((await state(page)).player.x,before.x,'Map pauses walking');
  await page.screenshot({path:path.join(out,'02-district-overview.png')});
  await page.keyboard.press('Escape');assert(!(await state(page)).mapOpen);
  await page.keyboard.press('c');await page.waitForFunction(()=>window.__prototype.getState().player.crouched);
  await page.keyboard.press('c');await page.waitForFunction(()=>!window.__prototype.getState().player.crouched);
  await page.keyboard.press('h');assert(await page.locator('body').evaluate(el=>el.classList.contains('hide-hud')));
  await page.mouse.wheel(0,300);assert((await state(page)).zoom<1.5);
  await page.keyboard.press('h');await page.keyboard.press('Escape');assert((await state(page)).paused);
  await page.click('#resume');await page.evaluate(()=>window.__prototype.flush());
  const saved=JSON.parse(fs.readFileSync(savePath,'utf8'));assert.equal(saved.district.mapId,'northern-dachas-v1');assert.deepEqual(errors,[]);
  await app.close();({app,page,errors}=await launch());await page.click('#continue');await page.waitForFunction(()=>window.__prototype.getState().screen==='game');current=await state(page);
  assert.equal(current.player.x,saved.x);assert.equal(current.player.y,saved.y);
  await page.waitForFunction(()=>window.__prototype.getState().districtMetrics.render?.cachedChunks>0);current=await state(page);
  assert(current.districtMetrics.render.cachedChunks<=72);
  await app.close();
  fs.writeFileSync(savePath,JSON.stringify({...seed,x:2429,y:1300,direction:'north'}));
  ({app,page,errors}=await launch());await page.click('#continue');await page.waitForFunction(()=>window.__prototype.getState().screen==='game');await page.keyboard.press('e');
  assert((await state(page)).world.district.openedGates.includes('gate-1'),'Gate interaction must open gate');
  await page.keyboard.press('h');await page.screenshot({path:path.join(out,'03-dacha-street.png')});assert.deepEqual(errors,[]);
  await page.evaluate(()=>window.__prototype.flush());assert(JSON.parse(fs.readFileSync(savePath,'utf8')).district.openedGates.includes('gate-1'));
  const report={passed:true,packaged,mapId:'northern-dachas-v1',plots:80,houses:60,sectors:8,checks:['runtime assets loaded','movement','map pauses movement','map closes with Escape','crouch','HUD toggle','zoom','pause','save restore','gate interaction and save','chunk cache bound','no renderer errors'],screenshots:out};
  fs.writeFileSync(path.join(out,packaged?'packaged-verification.json':'verification.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
 }finally{if(app)await app.close().catch(()=>{});}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
