const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict'),crypto=require('node:crypto');
let sharp;try{sharp=require('sharp');}catch{sharp=require(path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp'));}
const OUT=path.resolve(__dirname,'../assets/item-visuals-v1');
async function main(){const m=JSON.parse(await fs.readFile(path.join(OUT,'manifest.json'),'utf8'));assert.equal(m.totalCategories,16);assert.equal(m.totalItems,96);const ids=new Set(),hashes=new Set();let png=0;
 for(const c of m.categories){assert.equal(c.items.length,6);assert(c.sourceTransparentFraction>.1);const sheet=await sharp(path.join(OUT,c.sheet)).metadata();assert.equal(sheet.width,960);assert.equal(sheet.height,768);
  for(const item of c.items){assert(!ids.has(item.id));ids.add(item.id);assert.equal(item.sourceEdgePixels,0);
   for(const[p,size]of [[item.art,256],[item.sprite,item.spriteSize]]){const{data,info}=await sharp(path.join(OUT,p)).ensureAlpha().raw().toBuffer({resolveWithObject:true});assert.equal(info.width,size);assert.equal(info.height,size);let visible=0,transparent=0;for(let y=0;y<size;y++)for(let x=0;x<size;x++){const a=data[(y*size+x)*4+3];if(a>64)visible++;if(a===0)transparent++;if(!x||!y||x===size-1||y===size-1)assert.equal(a,0,p+': clipped edge');}assert(visible>20);assert(transparent>size*size*.1);png++;}
   const hash=crypto.createHash('sha256').update(await fs.readFile(path.join(OUT,item.sprite))).digest('hex');assert.equal(hash,item.sha256);assert(!hashes.has(hash),'Duplicated sprite '+item.id);hashes.add(hash);
  }
 }
 const report={categories:16,items:ids.size,transparentPngFiles:png,sourceSheets:16,labeledSheets:16,allSpritesUnique:true,dimensionsAndTransparentEdgesVerified:true,sourceCanvasEdgesUnclipped:true,animations:0,gameplayImplemented:false,scope:'Static visual prototypes; no final world scale, physics, item actions or character equipment integration.'};await fs.writeFile(path.join(OUT,'verification.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));}
main().catch(e=>{console.error(e);process.exitCode=1;});
