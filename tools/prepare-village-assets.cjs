const fs=require('node:fs'),path=require('node:path'),sharp=require('sharp');
const ROOT=path.resolve(__dirname,'..'),SOURCE=process.env.PIXEL_ASSET_SOURCE||ROOT;
async function prepare(){
 const registry=JSON.parse(fs.readFileSync(path.join(SOURCE,'docs/asset-registry.json'),'utf8'));
 const ownership=JSON.parse(fs.readFileSync(path.join(SOURCE,'asset-ownership.json'),'utf8'));
 const excluded=JSON.parse(fs.readFileSync(path.join(SOURCE,'publication-config.json'),'utf8')).excludedLocalPaths;
 if(!ownership.worldEntityOwners)throw Error('Missing ownership rules');
 const bindings={};
 for(const id of ['bed','table','wardrobe','shelves','chair','sofa','stove']){
  const canonicalId=['chair','sofa'].includes(id)?'item/furniture-'+id:id==='stove'?'item/base-stove':'world/'+id;
  const entity=registry.entities.find(e=>e.id===canonicalId);if(!entity)throw Error('Unregistered '+canonicalId);
  const representation=entity.representations.find(r=>r.pack===entity.owner.pack);
  const files=representation.files.filter(f=>f.endsWith('.png')&&(!['chair','sofa','stove'].includes(id)||f.includes('/art/')));
  for(const [i,source]of files.entries()){
   if(excluded.some(p=>source===p||source.startsWith(p+'/')))throw Error('Excluded source '+source);
   const file='village/'+id+'-'+i+'.png',dest=path.join(ROOT,'desktop/media',file);fs.mkdirSync(path.dirname(dest),{recursive:true});
   fs.copyFileSync(path.join(SOURCE,source),dest);const m=await sharp(dest).metadata();
   const {data,info}=await sharp(dest).ensureAlpha().raw().toBuffer({resolveWithObject:true});let left=info.width,top=info.height,right=0,bottom=0;for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++)if(data[(y*info.width+x)*4+3]>12){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
   bindings[id+'-'+i]={file,source,canonicalId,owner:entity.owner,variant:i,width:m.width,height:m.height,contentBounds:{x:left,y:top,w:right-left+1,h:bottom-top+1}};
  }
 }
 const manifest={version:1,role:'runtime-references-to-canonical-owners',bindings};
 fs.writeFileSync(path.join(ROOT,'desktop/media/village-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
 fs.writeFileSync(path.join(ROOT,'desktop/media/village-data.js'),'window.VILLAGE_ASSETS='+JSON.stringify(bindings)+';\n');
 console.log(JSON.stringify({bindings:Object.keys(bindings).length,newEntities:0}));
}
module.exports={prepareVillageAssets:prepare};
if(require.main===module)prepare().catch(e=>{console.error(e);process.exitCode=1;});
