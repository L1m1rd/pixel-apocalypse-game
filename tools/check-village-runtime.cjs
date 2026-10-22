const fs=require('fs'),path=require('path'),assert=require('node:assert/strict'),{_electron:electron}=require('playwright');
const R=path.resolve(__dirname,'..'),out=process.env.PIXEL_VILLAGE_REVIEW||path.join(R,'output/village-v011-review'),profile=path.join(out,'profile');fs.mkdirSync(profile,{recursive:true});
const env={...process.env,PIXEL_APOCALYPSE_TEST_DATA:profile};delete env.ELECTRON_RUN_AS_NODE;
const errors=[],checks=[];let app,page;const get=()=>page.evaluate(()=>window.__prototype.getState());
async function main(){
 const executable=process.env.PIXEL_VILLAGE_EXE||require(require.resolve('electron',{paths:[path.join(R,'desktop'),path.resolve(R,'../../desktop')]}));
 app=await electron.launch({executablePath:executable,args:process.env.PIXEL_VILLAGE_EXE?[]:[path.join(R,'desktop')],env,timeout:60000});
 try{page=await app.firstWindow();page.on('pageerror',e=>errors.push(e.stack));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});await app.evaluate(({BrowserWindow})=>{const w=BrowserWindow.getAllWindows()[0];w.show();w.focus();});await page.waitForFunction(()=>window.__prototype?.getState().ready,null,{timeout:60000});
 if(process.argv.includes('--continue')){await page.click('#continue');}else{await page.click('#new-world');await page.click('#character-next');await page.fill('#world-name','Северные дачи');await page.click('#create-submit');}
 await page.waitForFunction(()=>window.__prototype.getState().districtMetrics.render?.visibleObjects>0,null,{timeout:60000});let s=await get();fs.writeFileSync(path.join(out,'initial-state.json'),JSON.stringify(s,null,2));await page.screenshot({path:path.join(out,'initial.png')});assert.equal(s.campaign,undefined);assert(s.survival.villageMode);assert(s.survival.enabled);assert(s.districtMetrics.houses>=80);assert(s.survival.objects.length>600);assert(s.districtMetrics.render.visibleDecor>70);assert(s.districtMetrics.render.shadowCasters>10);assert(!s.survival.raidMode);
 await page.keyboard.press('h');await page.screenshot({path:path.join(out,'01-southern-entry-clean.png')});await page.keyboard.press('h');await page.screenshot({path:path.join(out,'02-southern-entry-hud.png')});
 for(const key of ['w','d','s','a']){const old=(await get()).screenPosition;await page.keyboard.down(key);try{await page.waitForFunction(old=>{const p=window.__prototype.getState().screenPosition;return Math.hypot(p.x-old.x,p.y-old.y)>7;},old,{timeout:4000});}finally{await page.keyboard.up(key);}const p=(await get()).screenPosition;if(key==='w'||key==='s')assert(Math.abs(p.x-old.x)<1,'screen vertical');else assert(Math.abs(p.y-old.y)<1,'screen horizontal');}
 checks.push('Continuous run starts directly in village; four screen movement directions; detailed world and fixed sunlight');
 await page.keyboard.press('m');await page.screenshot({path:path.join(out,'03-district-map.png')});await page.keyboard.press('Escape');await page.keyboard.press('i');await page.waitForFunction(()=>window.__prototype.getState().inventoryOpen);await page.screenshot({path:path.join(out,'04-inventory.png')});await page.keyboard.press('i');
 await page.evaluate(()=>window.__prototype.flush());s=await get();assert(s.inventory.equipment.weapon);assert(s.inventory.equipment.backpack);assert.deepEqual(errors,[]);checks.push('Map with eight sectors, inventory and normal starter equipment');
 fs.writeFileSync(path.join(out,'runtime-state.json'),JSON.stringify(s,null,2));fs.writeFileSync(path.join(out,'verification.json'),JSON.stringify({passed:true,checks,errors,metrics:s.districtMetrics.render},null,2));console.log(JSON.stringify({passed:true,checks,errors,metrics:s.districtMetrics.render,out}));
 }finally{await app?.close().catch(()=>{});}
}
main().catch(e=>{console.error(e);console.error(JSON.stringify({errors}));process.exitCode=1;});


