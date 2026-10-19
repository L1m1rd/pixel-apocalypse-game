const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),sharp=require('sharp');
const {_electron:electron}=require('playwright');
const ROOT=path.resolve(__dirname,'..'),out=path.join(ROOT,'output/northern-dachas-review'),profile=path.join(ROOT,'tmp/northern-dachas-sun-test');
fs.mkdirSync(out,{recursive:true});fs.mkdirSync(profile,{recursive:true});
const packaged=process.argv.includes('--packaged'),version=require('../desktop/package.json').version;
const exe=packaged?path.join(process.env.PIXEL_APOCALYPSE_OUTPUT??path.join(ROOT,'output','PixelApocalypse-northern-dachas-v'+version+'-win32-x64'),'PixelApocalypse.exe'):require('../desktop/node_modules/electron');
const env={...process.env,PIXEL_APOCALYPSE_TEST_DATA:profile};delete env.ELECTRON_RUN_AS_NODE;
async function scene(position,name,compare=false){
 fs.writeFileSync(path.join(profile,'world-v1.json'),JSON.stringify({version:1,worldName:'Проверка света',characterId:'01-gleb',...position,direction:'north',crouched:false,district:{mapId:'northern-dachas-v1',openedGates:[]}}));
 const app=await electron.launch({executablePath:exe,args:packaged?[]:[path.join(ROOT,'desktop')],env,timeout:60000});
 try{
  const page=await app.firstWindow(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await app.evaluate(({BrowserWindow})=>{const w=BrowserWindow.getAllWindows()[0];w.show();w.focus();});
  await page.waitForFunction(()=>window.__prototype?.getState().ready,{timeout:60000});await page.click('#continue');
  await page.waitForFunction(()=>window.__prototype.getState().screen==='game');
  await page.evaluate(()=>document.body.classList.add('hide-hud'));
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const metrics=(await page.evaluate(()=>window.__prototype.getState())).districtMetrics;
  assert.equal(metrics.render.sun.static,true);assert.equal(metrics.render.sun.enabled,true);assert(metrics.render.shadowCasters>20);
  await page.screenshot({path:path.join(out,name+'.png')});
  let difference=null;
  if(compare){
   const on=await page.locator('#world').screenshot();
   await page.evaluate(()=>window.__prototype.setSunEnabled(false));
   await page.waitForFunction(()=>!window.__prototype.getState().districtMetrics.render.sun.enabled);
   const off=await page.locator('#world').screenshot();await page.screenshot({path:path.join(out,'05-sun-disabled.png')});
   const a=await sharp(on).removeAlpha().raw().toBuffer({resolveWithObject:true}),b=await sharp(off).removeAlpha().raw().toBuffer();
   let changed=0,total=0;
   for(let n=0;n<a.data.length;n+=3){const delta=Math.abs(a.data[n]-b[n])+Math.abs(a.data[n+1]-b[n+1])+Math.abs(a.data[n+2]-b[n+2]);if(delta>12)changed++;total+=delta;}
   difference={changedPixelFraction:changed/(a.info.width*a.info.height),meanChannelDifference:total/a.data.length};
   assert(difference.changedPixelFraction>.03,'Sun must change actual canvas pixels');
   await page.evaluate(()=>window.__prototype.setSunEnabled(true));await page.waitForFunction(()=>window.__prototype.getState().districtMetrics.render.sun.enabled);
   const intervals=await page.evaluate(()=>new Promise(resolve=>{let previous=performance.now(),values=[];function step(now){values.push(now-previous);previous=now;if(values.length===60)resolve(values.slice(5));else requestAnimationFrame(step);}requestAnimationFrame(step);}));
   intervals.sort((a,b)=>a-b);difference.frameIntervals={medianMs:intervals[Math.floor(intervals.length*.5)],p95Ms:intervals[Math.floor(intervals.length*.95)]};
  }
  assert.deepEqual(errors,[]);return {scene:name,position,visibleObjects:metrics.render.visibleObjects,shadowCasters:metrics.render.shadowCasters,sun:metrics.render.sun,difference};
 }finally{await app.close();}
}
(async()=>{
 const street=await scene({x:2429,y:1300},'04-sunlit-street',true);
 const abandoned=await scene({x:2429,y:2980},'06-abandoned-gardens');
 const bank=await scene({x:1440,y:3000},'07-reed-bank');
 const report={passed:true,packaged,version,scenes:[street,abandoned,bank]};
 fs.writeFileSync(path.join(out,packaged?'sunlight-packaged-verification.json':'sunlight-verification.json'),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify(report));
})().catch(e=>{console.error(e);process.exitCode=1;});
