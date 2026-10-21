const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {policy,canonicalItemId,worldItem,foodItems}=require('./asset-ownership.cjs');
const ROOT=path.resolve(__dirname,'..'),read=p=>JSON.parse(fs.readFileSync(path.join(ROOT,p),'utf8')),write=(p,v)=>fs.writeFileSync(path.join(ROOT,p),JSON.stringify(v,null,2)+'\n');
const config=read('publication-config.json'),excluded=p=>config.excludedLocalPaths.some(x=>p===x||p.startsWith(x+'/'));
const entities=new Map(),primaryFiles=new Map(),packs=[];
function need(file){assert(!excluded(file),'Reference to retired file '+file);assert(fs.existsSync(path.join(ROOT,file)),'Missing file '+file);}
function add(id,name,pack,localId,role,files=[],state=null){
 const entity=entities.get(id)||{id,name,representations:[]};entities.set(id,entity);
 const entry={pack,id:localId,role,state,files:[...new Set(files)]};entity.representations.push(entry);
 for(const f of entry.files){need(f);if(role!=='reference'&&role!=='animation'){
  const bytes=fs.readFileSync(path.join(ROOT,f)),h=crypto.createHash('sha256').update(bytes).digest('hex'),previous=primaryFiles.get(h);
  assert(!previous||previous.entity===id||(previous.file===f&&(policy.sharedCharacterAtlases?.[f]??[]).includes(id)&&(policy.sharedCharacterAtlases?.[f]??[]).includes(previous.entity)),'Identical primary image assigned to different entities: '+f+' and '+previous?.file);
  primaryFiles.set(h,{entity:id,file:f});
 }}
}
function sameIds(a,b,label){assert.deepEqual([...a].sort(),[...b].sort(),label);}
for(const pack of config.currentAssets){const file='assets/'+pack+'/manifest.json';need('assets/'+pack);packs.push({pack,manifest:fs.existsSync(path.join(ROOT,file))?file:null,role:/concept|realistic/.test(pack)?'design-reference':/animation/.test(pack)?'animation':/interface|main-menu/.test(pack)?'ui-visual':'game-visual'});if(fs.existsSync(path.join(ROOT,file)))read(file);}
const itemPack='item-visuals-v2',items=read('assets/'+itemPack+'/manifest.json'),itemRows=items.categories.flatMap(c=>c.items),env=read('assets/environment-variants-v1/manifest.json'),loot=read('assets/wildlife-loot-v1/manifest.json');
assert.equal(new Set(itemRows.map(i=>i.id)).size,itemRows.length);assert.equal(itemRows.length,items.totalVisuals);assert.equal(items.sharedWorldEntries,Object.keys(policy.sharedWorldItems).length);
const catalog=read('assets/item-visuals-v2/catalog.json'),plannedItems=[...catalog.groups,...catalog.retained].flatMap(g=>g.items);
sameIds(plannedItems.map(i=>i.id),itemRows.map(i=>i.id),'Item plan/export conflict');for(const i of plannedItems){const exported=itemRows.find(e=>e.id===i.id);assert.equal(i.art,exported.art,'Planned art owner differs '+i.id);assert.equal(i.sprite,exported.sprite,'Planned sprite owner differs '+i.id);}
for(const i of itemRows){assert(!policy.itemAliases[i.id],'Retired duplicate item '+i.id);const shared=i.sharedAssetRef;if(shared){assert.equal(i.art,worldItem(i).art);assert.equal(i.sprite,worldItem(i).sprite);}const files=[i.art,i.sprite].map(f=>path.posix.normalize('assets/'+itemPack+'/'+f));add(canonicalItemId(i),i.name,itemPack,i.id,shared?'shared-reference':'item-visual',files,i.foodState||(i.ammoFamily?(i.id.endsWith('-open')?'open':'closed'):null));}
for(const e of env.elements){assert.equal(e.variants.length,3);const mapped=policy.environmentItemRepresentations[e.id],id=mapped?'item/'+mapped:'world/'+e.id;add(id,e.label,'environment-variants-v1',e.id,'world-variants',e.variants.flatMap(v=>v.files.map(f=>'assets/environment-variants-v1/'+f)));}
const sharedFoods=foodItems();assert.equal(sharedFoods.length,20);assert.equal(loot.items.length,51);assert.equal(loot.items.filter(i=>!i.sharedAssetRef).length,31);
const lootPlan=read('assets/wildlife-loot-v1/generation-plan.json');assert.deepEqual(lootPlan.sharedItems,sharedFoods);sameIds(lootPlan.items.map(i=>i.id),loot.items.filter(i=>!i.sharedAssetRef).map(i=>i.id),'Loot plan/export conflict');
for(const i of loot.items){assert(!policy.retiredLootFood.includes(i.id),'Retired general meat is active '+i.id);if(i.sharedAssetRef){assert.deepEqual(i,sharedFoods.find(f=>f.id===i.id));add(i.sharedAssetRef.canonicalId,i.name,'wildlife-loot-v1',i.id,'shared-reference',[path.posix.normalize('assets/wildlife-loot-v1/'+i.art)],'raw');}else add('animal-resource/'+i.id,i.name,'wildlife-loot-v1',i.id,'item-visual',[i.art,i.sprite,i.ground].map(f=>'assets/wildlife-loot-v1/'+f));}
const table=read('assets/wildlife-loot-v1/loot-table.json');
for(const s of loot.species){const resources=s.loot.map(l=>l.itemId);assert.equal(new Set(resources).size,resources.length);const food=resources.map(id=>loot.items.find(i=>i.id===id)).filter(i=>i?.category==='food');assert.equal(food.length,1);assert.equal(food[0].speciesId,s.id);assert.deepEqual(table.species.find(a=>a.animalId===s.id).resources,resources);}
const survivors=read('assets/survivor-friends-pixel-v1/manifest.json').characters,survivorMotion=read('assets/survivor-friends-animations-v1/manifest.json').characters;
sameIds(survivors.map(c=>c.id),survivorMotion.map(c=>c.id),'Survivor static/animation conflict');
for(const c of survivors)add('survivor/'+c.id,c.name,'survivor-friends-pixel-v1',c.id,'character',[c.art,c.sprite].map(f=>'assets/survivor-friends-pixel-v1/'+f));
const infected=read('assets/infected-redesign-pixel-v1/manifest.json').images,infectedMotion=read('assets/infected-redesign-animations-v1/manifest.json').characters;
sameIds(infected.map(c=>c.id),infectedMotion.map(c=>c.id),'Infected static/animation conflict');
for(const c of infected)add('infected/'+c.id,c.name,'infected-redesign-pixel-v1',c.id,'character',[c.art,c.sprite].map(f=>'assets/infected-redesign-pixel-v1/'+f));
const wildlife=read('assets/wildlife-visuals-v1/manifest.json'),wildlifeMotion=read('assets/wildlife-animations-v1/manifest.json');assert.equal(wildlife.selectedVariant,'B');assert.equal(wildlifeMotion.selectedVariant,'B');
sameIds(wildlife.species.map(s=>s.id),wildlifeMotion.animals.map(s=>s.id),'Animal static/animation conflict');sameIds(wildlife.species.map(s=>s.id),loot.species.map(s=>s.id),'Animal/loot conflict');
for(const s of wildlife.species){const b=s.variants.find(v=>v.variant==='B');add('animal/'+s.id,s.name,'wildlife-visuals-v1',s.id,'character',Object.values(b.files).map(f=>'assets/wildlife-visuals-v1/'+f));}
const weapons=read('assets/weapon-animations-v1/manifest.json');assert.equal(weapons.weapons.length,24);assert.equal(new Set(weapons.weapons.map(w=>w.id)).size,24);assert(weapons.notes.some(s=>s.includes('do not add duplicate muzzle flash')));
for(const w of weapons.weapons){assert.deepEqual(Object.keys(w.animations).sort(),['fire','reload']);add('weapon/'+w.id,w.name,'weapon-animations-v1',w.id,'reference',['assets/weapon-animations-v1/'+w.reference]);}
for(const pack of ['combat-vfx-v1','special-vfx-v1']){const m=read('assets/'+pack+'/manifest.json');assert.equal(new Set(m.effects.map(e=>e.id)).size,m.effects.length);for(const e of m.effects)add('effect/'+(policy.effectFamilies[pack+'/'+e.id]||pack+'/'+e.id),e.label||e.id,pack,e.id,'animation');}
for(const p of read('assets/decorative-corpses-v2/manifest.json').props)add('decor/'+p.id,p.label,'decorative-corpses-v2',p.id,'decor',[p.art,p.sprite].map(f=>'assets/decorative-corpses-v2/'+f));
// Location packs may own new world entities while reusing existing canonical ones.
for(const [pack,worldManifest]of Object.entries(policy.worldEntityManifests||{})){
 need(worldManifest);const world=read(worldManifest);
 for(const e of world.entities||[]){
  assert(e.canonicalId.startsWith('world/'),'Location entity must use world namespace '+e.canonicalId);
  assert(!entities.has(e.canonicalId),'Duplicate world entity '+e.canonicalId);
  assert.deepEqual(policy.worldEntityOwners?.[e.canonicalId],{pack,id:e.id},'World entity needs explicit owner '+e.canonicalId);
  add(e.canonicalId,e.title||e.id,pack,e.id,'world-visual',[path.posix.join(path.posix.dirname(worldManifest),e.file)],world.style);
 }
}
for(const [pack,interiorManifest]of Object.entries(policy.styleVariantManifests||{})){
 need(interiorManifest);const interior=read(interiorManifest);packs.push({pack,manifest:interiorManifest,role:'game-style-variant'});
 for(const b of interior.bindings){assert(entities.has(b.canonicalId),'Interior style must reuse a canonical entity '+b.canonicalId);add(b.canonicalId,entities.get(b.canonicalId).name,pack,b.id,'style-variant',[path.posix.join(path.posix.dirname(interiorManifest),b.file)],interior.style);}
}
const registered=[...entities.values()].sort((a,b)=>a.id.localeCompare(b.id));
const bindings={};for(const entity of registered){const choices=entity.representations.filter(r=>r.role!=='shared-reference');const owner=choices.find(r=>r.state==='raw')||choices.find(r=>r.role==='item-visual')||choices[0];assert(owner,'Missing owner '+entity.id);entity.owner={pack:owner.pack,id:owner.id};for(const r of entity.representations){const binding=r.pack+'/'+r.id;assert(!bindings[binding]||bindings[binding]===entity.id,'Conflicting entity binding '+binding);bindings[binding]=entity.id;}}
const aliases=Object.fromEntries(Object.entries(policy.itemAliases).map(([a,b])=>['item-visuals-v2/'+a,'item/'+b]));
for(const destination of Object.values(aliases))assert(entities.has(destination),'Unresolved item alias '+destination);
const registry={version:1,status:'visual-asset-registry; no gameplay implementation',entryRule:'Use one entity ID. Representations, approved variants and states never create a second game entity.',packs,entityCount:registered.length,aliases,bindings,entities:registered};
write('docs/asset-registry.json',registry);
const referenceCopies=new Map();for(const e of read('docs/asset-inventory.json').entries.filter(e=>e.path.endsWith('.png')&&!excluded(e.path))){const a=referenceCopies.get(e.sha256)||[];a.push(e.path);referenceCopies.set(e.sha256,a);}
const copies=[...referenceCopies.values()].filter(a=>new Set(a.map(p=>p.split('/')[1])).size>1);
for(const a of copies)assert(a.some(p=>p.includes('/references/')||p.includes('/interface-concepts-v1/'))||(policy.designReferenceCopies||[]).some(r=>a.includes(r.owner)&&a.every(p=>p===r.owner||r.references.includes(p))),'Unclassified cross-pack exact copy '+a.join(', '));
const report={passed:true,currentPacks:packs.length,registeredEntities:registered.length,itemCatalogEntries:itemRows.length,ownedItemVisuals:items.ownedVisuals,sharedWorldReferences:items.sharedWorldEntries,animalSpecies:20,sharedRawFood:20,ownedAnimalMaterials:31,retiredGenericFood:policy.retiredLootFood.length,retiredInventoryDuplicates:Object.keys(policy.itemAliases).length,retiredDuplicateFiles:2*(Object.keys(policy.sharedWorldItems).length+Object.keys(policy.itemAliases).length)+5*policy.retiredLootFood.length,canonicalReferencesVerified:true,animalLootSpeciesVerified:true,characterAnimationIdsVerified:true,primaryImageCollisions:0,intentionalReferenceCopyGroups:copies.length,referenceCopies:copies,weaponFlashPolicy:'Use baked weapon flash; do not overlay the environment muzzle-flash effect.',intentionalDifferences:policy.intentionalDifferences};
write('docs/asset-consistency-report.json',report);console.log(JSON.stringify({...report,referenceCopies:undefined,intentionalDifferences:undefined}));
