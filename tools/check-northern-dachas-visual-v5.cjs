const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),sharp=require('sharp');
const {pathToFileURL}=require('node:url'),{_electron:electron}=require('playwright');
const ROOT=path.resolve(__dirname,'..'),PACK=path.join(ROOT,'assets/northern-dachas-v1'),out=path.join(ROOT,'output/northern-dachas-v5-review'),profile=path.join(ROOT,'tmp/northern-dachas-v5-visual-test');
const packaged=process.argv.includes('--packaged'),version=require('../desktop/package.json').version;
const exe=packaged?path.join(process.env.PIXEL_APOCALYPSE_OUTPUT??path.join(ROOT,'output','PixelApocalypse-northern-dachas-v'+version+'-win32-x64'),'PixelApocalypse.exe'):require('../desktop/node_modules/electron');
const env={...process.env,PIXEL_APOCALYPSE_TEST_DATA:profile};delete env.ELECTRON_RUN_AS_NODE;
fs.mkdirSync(out,{recursive:true});fs.mkdirSync(profile,{recursive:true});
async function colorMetrics(bytes){
 const {data,info}=await sharp(bytes).removeAlpha().resize(640,null).raw().toBuffer({resolveWithObject:true});let saturation=0,luminance=0;
 for(let n=0;n<data.length;n+=3){const r=data[n]/255,g=data[n+1]/255,b=data[n+2]/255,max=Math.max(r,g,b),min=Math.min(r,g,b);saturation+=max?(max-min)/max:0;luminance+=.2126*r+.7152*g+.0722*b;}
 return {meanSaturation:saturation/(info.width*info.height),meanLuminance:luminance/(info.width*info.height)};
}
async function main(){
 const {SCENE_VIEWS}=await import(pathToFileURL(path.join(ROOT,'desktop/northern-dachas-details.mjs')).href);
 const report={passed:false,version,packaged,scenes:[]};
 for(const view of SCENE_VIEWS){
  fs.writeFileSync(path.join(profile,'world-v1.json'),JSON.stringify({version:1,worldName:'Визуальная проверка',characterId:'01-gleb',x:view.x,y:view.y,direction:'north',crouched:false,district:{mapId:'northern-dachas-v1',openedGates:[]}}));
  const app=await electron.launch({executablePath:exe,args:packaged?[]:[path.join(ROOT,'desktop')],env,timeout:60000});
  try{
   const page=await app.firstWindow(),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await app.evaluate(({BrowserWindow})=>{const w=BrowserWindow.getAllWindows()[0];w.show();w.focus();});
   await page.waitForFunction(()=>window.__prototype?.getState().ready,{timeout:60000});await page.click('#continue');await page.waitForFunction(()=>window.__prototype.getState().screen==='game');
   await page.evaluate(()=>document.body.classList.add('hide-hud'));await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
   const state=await page.evaluate(()=>window.__prototype.getState());assert(Math.hypot(state.player.x-view.x,state.player.y-view.y)<1,'Visual view was relocated '+view.id);
   const diagnostics=await page.evaluate(()=>window.__prototype.visualDiagnostics());
   assert(diagnostics.objectCoverage>.65,'Sparse screenshot '+view.id+': '+diagnostics.objectCoverage);assert(diagnostics.visibleAssetTypes>=20,'Too few distinct visible assets '+view.id);
   const bytes=await page.screenshot({path:path.join(out,view.id+'.png')});fs.writeFileSync(path.join(PACK,'review/v5-runtime-'+view.id+'.png'),bytes);
   const intervals=await page.evaluate(()=>new Promise(resolve=>{let previous=performance.now(),values=[];function frame(now){values.push(now-previous);previous=now;if(values.length===38)resolve(values.slice(8));else requestAnimationFrame(frame);}requestAnimationFrame(frame);}));intervals.sort((a,b)=>a-b);
   assert.deepEqual(errors,[]);
   const scene={...view,...diagnostics,frameIntervals:{medianMs:intervals[15],p95Ms:intervals[28]},actualColor:await colorMetrics(bytes),referenceColor:await colorMetrics(fs.readFileSync(path.join(PACK,'references/v5-'+view.id+'.png')))};
   report.scenes.push(scene);console.log(JSON.stringify(scene));
  }finally{await app.close();}
 }
 report.passed=true;report.meanObjectCoverage=report.scenes.reduce((n,s)=>n+s.objectCoverage,0)/report.scenes.length;
 fs.writeFileSync(path.join(out,packaged?'verification-packaged.json':'verification.json'),JSON.stringify(report,null,2)+'\n');
 const cellW=632,cellH=380,tiles=[];
 for(let n=0;n<report.scenes.length;n++)tiles.push({input:await sharp(path.join(out,report.scenes[n].id+'.png')).resize(cellW,cellH,{fit:'cover'}).png().toBuffer(),left:n%2*cellW,top:Math.floor(n/2)*cellH});
 await sharp({create:{width:cellW*2,height:cellH*4,channels:4,background:'#24301c'}}).composite(tiles).png().toFile(path.join(out,'all-eight-sectors.png'));
 console.log(JSON.stringify({passed:true,packaged,views:report.scenes.length,meanObjectCoverage:report.meanObjectCoverage,report:out}));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
