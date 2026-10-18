const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto'),assert=require('node:assert/strict');
let sharp;try{sharp=require('sharp');}catch{sharp=require(path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp'));}
const OUT=path.resolve(__dirname,'../assets/item-visuals-v2'),read=async p=>JSON.parse(await fs.readFile(path.join(OUT,p),'utf8'));
async function checkViewer(){
 let playwright;try{playwright=require('playwright');}catch{playwright=require(path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));}
 const browser=await playwright.chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(require('node:url').pathToFileURL(path.join(OUT,'preview.html')).href);
  await page.waitForFunction(()=>document.querySelectorAll('article').length===270&&[...document.images].every(i=>i.complete&&i.naturalWidth>0));
  assert.equal(await page.locator('article').count(),270);
  await page.selectOption('#scope','new');assert.equal(await page.locator('article').count(),196);
  await page.selectOption('#scope','retained');assert.equal(await page.locator('article').count(),74);
  await page.selectOption('#scope','all');
  for(const [query,count]of [['рюкзак',5],['противогаз',3],['аптечка',3],['обезболивающее',1],['рыба',2]]){await page.fill('#search',query);assert.equal(await page.locator('article').count(),count,query);}
  await fs.mkdir(path.join(OUT,'qa'),{recursive:true});
  await page.screenshot({path:path.join(OUT,'qa/fish-pair.png')});
  await page.fill('#search','');await page.selectOption('#category','wires');assert.equal(await page.locator('article').count(),6);
  await page.click('#bg');assert(await page.locator('body').evaluate(e=>e.classList.contains('light')));
  await page.screenshot({path:path.join(OUT,'qa/wires-light-background.png')});
  await page.fill('#search','несуществующий предмет');assert.equal(await page.locator('article').count(),0);assert(await page.locator('#empty').isVisible());
  assert.deepEqual(await page.evaluate(()=>window.ITEM_BROWSER.errors),[]);assert.deepEqual(errors,[]);
  return {passed:true,allImagesLoaded:270,scopeFilters:true,nameSearch:true,categoryFilter:true,backgroundToggle:true,emptyState:true,javascriptErrors:0};
 }finally{await browser.close();}
}
async function main(){const m=await read('manifest.json'),rules=await read('game-rules.json'),items=m.categories.flatMap(c=>c.items);assert.equal(m.status,'complete-static-visual-prototype');assert.equal(m.newSourceSheets,34);assert.equal(m.newVisuals,196);assert.equal(m.retainedVisuals,74);assert.equal(items.length,270);assert.equal(new Set(items.map(i=>i.id)).size,270);let png=0;
 for(const g of m.categories){if(g.source){const h=crypto.createHash('sha256').update(await fs.readFile(path.join(OUT,g.source))).digest('hex');assert.equal(h,g.sourceSha256);}const meta=await sharp(path.join(OUT,g.sheet)).metadata();assert.equal(meta.width,960);assert.equal(meta.height,768);
  for(const item of g.items){assert.equal(item.sourceEdgePixels,0,item.id);for(const[p,size]of [[item.art,256],[item.sprite,item.spriteSize]]){const b=await fs.readFile(path.join(OUT,p)),{data,info}=await sharp(b).ensureAlpha().raw().toBuffer({resolveWithObject:true});assert.equal(info.width,size);assert.equal(info.height,size);let visible=0,transparent=0;for(let y=0;y<size;y++)for(let x=0;x<size;x++){const a=data[(y*size+x)*4+3];if(a>64)visible++;if(a===0)transparent++;if(!x||!y||x===size-1||y===size-1)assert.equal(a,0,p+': edge clipped');}assert(visible>20);assert(transparent>size*size*.1);if(p===item.sprite)assert.equal(crypto.createHash('sha256').update(b).digest('hex'),item.sha256);png++;}}
 }
 const find=id=>m.categories.find(g=>g.id===id),tiers=(group,prefix,n)=>assert.deepEqual(find(group).items.filter(i=>i.id.startsWith(group+'-'+prefix)).map(i=>i.tier),Array.from({length:n},(_,i)=>i+1));
 for(const f of ['jackets','shirts','pants'])assert.equal(items.filter(i=>i.clothingFamily===f).length,24);
 tiers('backpacks-helmet','pack-',5);tiers('masks-vests','mask-',3);tiers('masks-vests','vest-',3);tiers('boots-greaves','boots-',3);tiers('boots-greaves','greaves-',3);tiers('gloves-tools','gloves-',3);
 for(const species of rules.animalsSource.species){assert.deepEqual(items.filter(i=>i.speciesId===species.id).map(i=>i.foodState).sort(),['cooked','raw']);}assert.equal(rules.animalsSource.species.length,20);assert.equal(items.filter(i=>i.speciesId).length,40);
 assert.equal(find('medicine-water').items.length,6);assert.equal(rules.medicines.active.length,5);assert.equal(rules.medicines.painkiller.damageReductionPercent,null);assert.equal(rules.medicines.healingValues,null);
 assert.deepEqual([...new Set(find('ammunition').items.map(i=>i.ammoFamily))].sort(),['pistol','rifle','shotgun']);
 assert(!items.some(i=>/socks|antiseptic|splint|medical-pouch/.test(i.id)));assert(!items.some(i=>['weapons-pistol','weapons-rifle','weapons-magazine','weapons-ammo-box','hazards-damaged-cable','hazards-barbed-wire'].includes(i.id)));
 assert.equal(find('harvest').items.length,4);assert.equal(find('seeds').items.length,4);assert.equal(find('crop-plants').items.length,4);assert.equal(find('orchard').items.length,6);assert.equal(find('manuals').items.length,6);assert.equal(find('wires').items.length,6);assert.equal(find('windows').items.length,6);
 const report={newVisuals:196,retainedVisuals:74,totalVisuals:270,sourceSheets:34,transparentPngFiles:png,clothingVariants:72,rawCookedAnimalPairs:20,backpackLevels:5,gasMaskVestBootGreaveGloveLevels:3,activeMedicineTypes:5,ammoFamilies:3,sourceHashesVerified:true,dimensionsAndAlphaEdgesVerified:true,requestedRosterVerified:true,gameplayImplemented:false};if(process.argv.includes('--viewer'))report.viewer=await checkViewer();await fs.writeFile(path.join(OUT,'verification.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));}
main().catch(e=>{console.error(e);process.exitCode=1;});
