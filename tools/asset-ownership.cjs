const fs=require('node:fs'),path=require('node:path');
const ROOT=path.resolve(__dirname,'..'),policy=require('../asset-ownership.json');
const read=p=>JSON.parse(fs.readFileSync(path.join(ROOT,p),'utf8'));
function canonicalItemId(item){
 if(item.sharedAssetRef)return item.sharedAssetRef.canonicalId;
 if(item.speciesId)return 'food/'+item.speciesId;
 if(item.ammoFamily)return 'ammo/'+item.ammoFamily;
 return 'item/'+(policy.itemAliases[item.id]||item.id);
}
function worldItem(item){
 const id=policy.sharedWorldItems[item.id];if(!id)return item;
 const e=read('assets/environment-variants-v1/manifest.json').elements.find(e=>e.id===id);if(!e)throw Error('Missing shared world owner '+id);
 const v=e.variants[0],file='../environment-variants-v1/'+v.files[0];
 return {...item,art:file,sprite:file,artSize:v.width,spriteSize:v.width,sha256:v.sha256[0],sourceEdgePixels:0,sharedAssetRef:{pack:'environment-variants-v1',id,variant:v.variant,canonicalId:'world/'+id},worldAnimation:e.kind==='animation'?'../environment-variants-v1/'+v.preview:undefined};
}
function foodItems(){
 const m=read('assets/item-visuals-v2/manifest.json');
 return m.categories.flatMap(c=>c.items).filter(i=>i.speciesId&&i.foodState==='raw').map(i=>({id:i.id,name:i.name,category:'food',speciesId:i.speciesId,foodState:'raw',art:'../item-visuals-v2/'+i.art,sprite:'../item-visuals-v2/'+i.sprite,ground:'../item-visuals-v2/'+i.sprite,artSize:i.artSize,spriteSize:i.spriteSize,groundSize:i.spriteSize,sharedAssetRef:{pack:'item-visuals-v2',id:i.id,canonicalId:'food/'+i.speciesId},sha256:{sprite:i.sha256,ground:i.sha256}}));
}
module.exports={policy,canonicalItemId,worldItem,foodItems};
