const fs=require('node:fs'),path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
function prepareInventory(data,out){
 const registry=require('../docs/asset-registry.json'),manifest=require('../assets/item-visuals-v2/manifest.json'),weapons=require('../assets/weapon-animations-v1/manifest.json');
 const ownership=require('../asset-ownership.json'),excluded=require('../publication-config.json').excludedLocalPaths;
 const category=new Map(manifest.categories.flatMap(c=>c.items.map(i=>[i.id,{...i,category:c.id,kind:c.kind}]))),items=[];
 const worldIds=new Set(['orchard-apple-tree','orchard-plum-tree','orchard-pear-tree','wires-exposed','wires-insulated','wires-protected','wires-barbed-deployed','resource-harvest-felled-log','resource-harvest-stump','electricity-generator','electricity-charger','transport-abandoned-car','transport-bicycle']);
 fs.mkdirSync(path.join(out,'inventory'),{recursive:true});
 const exported=new Map();
 const copy=(source)=>{if(excluded.some(p=>source===p||source.startsWith(p+'/')))throw Error('Excluded inventory source '+source);const file='inventory/'+source.split('/').slice(-1)[0];const dest=path.join(out,file);if(exported.has(file)&&exported.get(file)!==source)throw Error('Icon name collision '+file);exported.set(file,source);fs.copyFileSync(path.join(ROOT,source),dest);return file;};
 for(const entity of registry.entities){
  if(!['item','food','ammo','animal-resource','weapon'].includes(entity.id.split('/')[0]))continue;
  if(entity.id.startsWith('weapon/')){
   const w=weapons.weapons.find(w=>w.id===entity.owner.id);if(!w)throw Error('Weapon owner missing '+entity.id);
   const pistol=['pistol','revolver','gate-revolver'].includes(w.type)||['hk-mp5','pp91-kedr','uzi'].includes(w.id),shotgun=['double-side','double-over','pump'].includes(w.type);
   const capacities={'pm':8,'glock-17':17,'colt-m1911':7,'nagant-m1895':7,'colt-python':6,'sw-686':6,'hk-mp5':30,'pp91-kedr':30,'uzi':32,'sks':10,'ruger-mini14':20,'m1-carbine':15,'mosin-9130':5,'remington-700':5,'winchester-70':5};
   items.push({key:entity.id,entityId:entity.id,name:entity.name,category:'weapons',slot:'weapon',maxStack:1,weight:pistol?1:3.5,ammo:shotgun?'ammo/shotgun':pistol?'ammo/pistol':'ammo/rifle',capacity:capacities[w.id]??(shotgun?(w.type==='pump'?5:2):30),file:copy('assets/weapon-animations-v1/'+w.reference),source:'assets/weapon-animations-v1/'+w.reference,description:'Оружие: экипировать, зарядить подходящими патронами, проверить выстрел на полигоне. Калибры пока объединены в три тестовые группы.'});continue;
  }
  for(const rep of entity.representations){
   if(rep.role!=='item-visual'||rep.pack!==entity.owner.pack)continue;
   const meta=category.get(rep.id);if(meta&&(meta.kind==='world'||worldIds.has(rep.id)))continue;
   const source=rep.files.find(f=>f.includes('/sprites/'))??rep.files.find(f=>f.endsWith('.png'));if(!source)throw Error('Missing item icon '+rep.id);
   const id=rep.id,state=rep.state??null;
   let group=entity.id.startsWith('animal-resource/')?'animal-resources':meta?.category??'resources',slot=null,use=null,effect=null;
   if(/^jackets-/.test(id))slot='jacket';else if(/^shirts-/.test(id))slot='shirt';else if(/^pants-/.test(id))slot='pants';else if(id.includes('pack-'))slot='backpack';else if(id.endsWith('-helmet'))slot='head';else if(id.includes('-mask-'))slot='mask';else if(id.includes('-vest-'))slot='vest';else if(id.includes('-boots-'))slot='boots';else if(id.includes('-greaves-'))slot='greaves';else if(id.includes('-gloves-'))slot='gloves';else if(id.startsWith('weapons-')||id.startsWith('tools-')||/^gloves-tools-(hoe|rake|fishing-rod)$/.test(id)||id==='electricity-flashlight')slot='hand';
   if(slot)group=id.startsWith('weapons-')?'weapons':slot==='hand'?'tools':'equipment';
   if(entity.id.startsWith('food/')||/^(harvest-|orchard-(apple|plum|pear)$|food-|resource-harvest-(berries|mushrooms))/.test(id)){group='food';use='eat';effect={hunger:state==='raw'?12:25,health:state==='raw'?-10:0};}
   if(/(canteen|water-bottle)$/.test(id)){group='food';use='drink';effect={thirst:40};}
   if(/^medicine-water-/.test(id)&&!id.endsWith('canteen')){group='medicine';use='heal';effect={health:id.includes('large')?70:id.includes('medium')?45:id.includes('small')?25:id.includes('bandage')?15:10};}
   if(id.startsWith('manuals-')){group='manuals';use='read';}
   if(entity.id.startsWith('ammo/'))group='ammo';
   if(group.startsWith('jackets')||group.startsWith('shirts')||group.startsWith('pants'))group='equipment';
   const maxStack=slot||use==='read'?1:50;
   items.push({key:entity.id+(state?'@'+state:''),entityId:entity.id,name:meta?.name??entity.name,variant:state,category:group,slot,use,effect,maxStack,weight:slot==='backpack'?1:slot?0.8:entity.id.startsWith('ammo/')?.015:.2,capacity:slot==='backpack'?20+Number(id.slice(-1))*8:null,file:copy(source),source,description:entity.id.startsWith('ammo/')?'Тестовая единица боезапаса: 1 штука = 1 патрон. Изображение коробки обозначает семейство боеприпасов; открытая и закрытая коробки совместимы.':use==='eat'?(state==='raw'?'Сырое мясо: утоляет голод, снижает здоровье на 10.':'Еда восстанавливает сытость.'):(slot?'Можно экипировать и снять.':use==='read'?'Прочтение сохраняет знание в журнале.':'Переносимый предмет: хранение, стаки, разделение, выбрасывание и подбор. Применение в мире подключается отдельно.')});
  }
 }
 const keys=new Set();for(const item of items){if(keys.has(item.key))throw Error('Duplicate inventory key '+item.key);keys.add(item.key);}
 data.inventory={version:1,registry:'docs/asset-registry.json',ownership:'asset-ownership.json',items};
 fs.writeFileSync(path.join(ROOT,'desktop/inventory-catalog.json'),JSON.stringify(items,null,2)+'\n');
 return data.inventory;
}
module.exports={prepareInventory};
if(require.main===module){const out=path.join(ROOT,'desktop/media'),data=JSON.parse(fs.readFileSync(path.join(out,'asset-manifest.json')));prepareInventory(data,out);fs.writeFileSync(path.join(out,'asset-manifest.json'),JSON.stringify(data,null,2));fs.writeFileSync(path.join(out,'data.js'),'window.GAME_ASSETS='+JSON.stringify(data)+';\n');console.log(JSON.stringify({inventory: data.inventory.items.length,weapons:data.inventory.items.filter(i=>i.category==='weapons').length}));}
