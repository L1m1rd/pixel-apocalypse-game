const fs=require('node:fs');
const http=require('node:http');
const path=require('node:path');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');

const ROOT=path.resolve(__dirname,'..');
const SITE=path.join(ROOT,'web-dist');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.png':'image/png','.webp':'image/webp'};

async function main(){
 if(!fs.existsSync(path.join(SITE,'index.html')))throw Error('Сначала выполните npm run build:web');
 const server=http.createServer((req,res)=>{const relative=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\/+/, '')||'index.html';const file=path.resolve(SITE,relative);if(!file.startsWith(SITE+path.sep)||!fs.existsSync(file)||fs.statSync(file).isDirectory()){res.writeHead(404);res.end('Not found');return;}res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(res);});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const page=await browser.newPage({viewport:{width:1280,height:800}});const errors=[];page.on('pageerror',error=>errors.push(error.message));
 try{
  await page.goto(`http://127.0.0.1:${server.address().port}/`,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__prototype?.getState().ready,{timeout:120000});
  assert.equal(await page.locator('#continue').isDisabled(),true);
  assert.equal(await page.locator('#quit').textContent(),'Перезапустить');
  await page.click('#new-world');await page.click('#character-next');await page.fill('#world-name','Веб-проверка');await page.click('#create-submit');
  await page.waitForFunction(()=>window.__prototype.getState().districtMetrics.render?.visibleObjects>0,{timeout:120000});
  await page.keyboard.down('d');await page.waitForTimeout(250);await page.keyboard.up('d');
  await page.evaluate(()=>window.__prototype.flush());
  const stored=await page.evaluate(()=>localStorage.getItem('pixel-apocalypse:world-v1'));
  assert(stored&&JSON.parse(stored).worldName==='Веб-проверка');
  await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.__prototype?.getState().ready,{timeout:120000});
  assert.equal(await page.locator('#continue').isEnabled(),true);assert.deepEqual(errors,[]);
  console.log(JSON.stringify({passed:true,checks:['browser boot','full district render','movement','localStorage save','reload continue','no page errors']}));
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
