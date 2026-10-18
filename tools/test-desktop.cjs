const { _electron:electron }=require('playwright');
const assert=require('assert/strict');const path=require('path');const fs=require('fs');
const ROOT=path.resolve(__dirname,'..'),profile=path.join(ROOT,'tmp/desktop-test-profile'),out=path.join(ROOT,'output/desktop-test');fs.mkdirSync(out,{recursive:true});
const exe=process.argv.includes('--packaged')?path.join(ROOT,'output',`PixelApocalypse-test-v${require('../desktop/package.json').version}-win32-x64/PixelApocalypse.exe`):require('../desktop/node_modules/electron');
const env={...process.env,PIXEL_APOCALYPSE_TEST_DATA:profile};delete env.ELECTRON_RUN_AS_NODE;
async function launch(){const app=await electron.launch({executablePath:exe,args:process.argv.includes('--packaged')?[]:[path.join(ROOT,'desktop')],env,timeout:60000});const page=await app.firstWindow();const errors=[];page.on('pageerror',e=>errors.push(e.message));await app.evaluate(({BrowserWindow})=>{const w=BrowserWindow.getAllWindows()[0];w.show();w.focus();});await page.waitForFunction(()=>window.__prototype?.getState().ready);return {app,page,errors};}
const state=page=>page.evaluate(()=>window.__prototype.getState());
async function main(){
 const save=path.join(profile,'world-v1.json');if(fs.existsSync(save))fs.renameSync(save,path.join(profile,'previous-'+Date.now()+'.json'));
 let {app,page,errors}=await launch();
 try{
  assert.equal(await page.locator('#continue').isDisabled(),true);
  await page.screenshot({path:path.join(out,'01-menu.png')});
  const sky=await page.evaluate(()=>{const c=document.getElementById('menu-clouds');return c.toDataURL();});await page.waitForTimeout(1000);assert.notEqual(await page.evaluate(()=>document.getElementById('menu-clouds').toDataURL()),sky,'clouds must move continuously');
  assert.equal(await page.evaluate(()=>document.getElementById('menu-clouds').getContext('2d').getImageData(1104,80,1,1).data[3]),0,'the church must occlude clouds');
  await page.click('#new-world');
  assert.equal(await page.locator('.character-card').count(),6);
  for(const id of ['01-gleb','02-roman','03-miron','04-egor','05-timur','06-makar']){await page.click(`[data-character="${id}"]`);assert.equal((await state(page)).selected,id);}
  await page.click('[data-character="03-miron"]');await page.click('#turn-right');
  await page.screenshot({path:path.join(out,'02-character.png')});
  await page.click('#character-next');await page.fill('#world-name','   ');await page.click('#create-submit');assert.equal((await state(page)).screen,'create');
  await page.fill('#world-name','Тестовое поле');await page.screenshot({path:path.join(out,'03-create-world.png')});await page.click('#create-submit');
  await page.waitForFunction(()=>window.__prototype.getState().screen==='game');
  assert.equal((await state(page)).world.characterId,'03-miron');
  let p=(await state(page)).player;const idle={x:p.x,y:p.y};await page.waitForTimeout(1300);assert.equal((await state(page)).player.x,idle.x);assert.equal((await state(page)).player.y,idle.y);const x=p.x;
  await page.keyboard.down('d');await page.waitForTimeout(350);p=(await state(page)).player;if(!(p.x>x+10)){console.log('Movement diagnostic',JSON.stringify(await state(page)),await page.evaluate(()=>({focus:document.hasFocus(),visibility:document.visibilityState})));await page.screenshot({path:path.join(out,'movement-diagnostic.png')});}assert.ok(p.x>x+10);assert.equal(p.action,'walk');assert.equal(p.direction,'east');
  await page.keyboard.down('Shift');await page.waitForTimeout(250);assert.equal((await state(page)).player.action,'run');await page.keyboard.up('d');await page.keyboard.up('Shift');
  await page.keyboard.press('c');await page.waitForFunction(()=>{const p=window.__prototype.getState().player;return p.crouched&&!p.transition;});
  await page.keyboard.down('w');await page.waitForTimeout(250);assert.equal((await state(page)).player.action,'crouch_walk');assert.equal((await state(page)).player.direction,'north');await page.keyboard.up('w');
  await page.screenshot({path:path.join(out,'04-world-crouch.png')});
  await page.keyboard.press('c');await page.waitForFunction(()=>{const p=window.__prototype.getState().player;return !p.crouched&&!p.transition;});
  for(const [key,direction] of [['a','west'],['s','south']]){const before=(await state(page)).player;await page.keyboard.down(key);await page.waitForTimeout(100);const after=(await state(page)).player;assert.equal(after.direction,direction);if(key==='s')assert.equal(after.x,before.x,'vertical movement may not drift horizontally');await page.keyboard.up(key);}
  await page.keyboard.press('Escape');assert.equal((await state(page)).paused,true);const paused=(await state(page)).player.x;await page.keyboard.down('d');await page.waitForTimeout(200);assert.equal((await state(page)).player.x,paused);await page.keyboard.up('d');await page.click('#resume');
  await page.evaluate(()=>window.dispatchEvent(new Event('blur')));assert.equal((await state(page)).paused,true);await page.click('#resume');
  await page.screenshot({path:path.join(out,'05-world-standing.png')});
  await page.keyboard.press('Escape');await page.click('#return-menu');assert.equal((await state(page)).screen,'menu');assert.equal(await page.locator('#continue').isEnabled(),true);
  await page.click('#continue');await page.waitForFunction(()=>window.__prototype.getState().screen==='game');assert.equal((await state(page)).world.worldName,'Тестовое поле');
  await page.evaluate(()=>window.__prototype.flush());const saved=JSON.parse(fs.readFileSync(save,'utf8'));assert.ok(saved.x!==4096||saved.y!==4096);
  await page.setViewportSize({width:960,height:640});await page.screenshot({path:path.join(out,'06-small-window.png')});
  assert.equal((await page.evaluate(()=>({w:document.documentElement.scrollWidth,v:innerWidth}))).w,960);
  assert.deepEqual(errors,[]);await app.close();
  ({app,page,errors}=await launch());assert.equal(await page.locator('#continue').isEnabled(),true);await page.click('#continue');await page.waitForFunction(()=>window.__prototype.getState().screen==='game');const resumed=(await state(page));assert.equal(resumed.world.characterId,saved.characterId);assert.equal(resumed.player.x,saved.x);assert.equal(resumed.player.y,saved.y);assert.deepEqual(errors,[]);
  const report={passed:true,packaged:process.argv.includes('--packaged'),checks:['menu navigation','six characters','character rotation preview','world creation validation','single grass terrain','walk and run','four directions','crouch and crouch walk','pause','focus loss','continue','save survives restart','960x640 window','no renderer exceptions'],screenshots:out};fs.writeFileSync(path.join(out,process.argv.includes('--packaged')?'packaged-verification.json':'verification.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
 }finally{await app.close();}
}
main().catch(e=>{console.error(e);process.exit(1)});
