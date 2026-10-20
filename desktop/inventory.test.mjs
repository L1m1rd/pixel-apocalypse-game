import test from 'node:test';import assert from 'node:assert/strict';import {createRequire} from 'node:module';
import {createInventory} from './inventory.mjs';
const require=createRequire(import.meta.url),catalog=require('./inventory-catalog.json'),{validateSave}=require('./save.cjs');
const make=()=>createInventory(catalog),uid=(i,key)=>i.state.bag.find(s=>s.key===key).uid;
test('every portable variant can be added, dropped, picked up, restored and used in its supported role',()=>{
 assert.equal(catalog.length,268);assert.equal(catalog.filter(d=>d.ammo).length,24);
 for(const d of catalog){const i=make();assert(i.add(d.key,d.maxStack),d.key);assert.equal(i.state.bag[0].qty,d.maxStack);assert(i.drop(i.state.bag[0].uid,{x:4096,y:4096}));assert(i.pickup(i.state.ground[0].uid));const restored=createInventory(catalog,i.snapshot());assert.equal(restored.state.bag[0].key,d.key);assert.equal(restored.state.bag[0].qty,d.maxStack);if(d.slot){assert(restored.equip(restored.state.bag[0].uid),d.key);assert(restored.unequip(d.slot),d.key);}if(d.use)assert(restored.use(restored.state.bag[0].uid),d.key);}
});
test('stack splits conserve quantities; full bags reject transactions without partial additions',()=>{
 const i=make(),key='item/materials-nails';assert(i.add(key,50));assert(i.split(uid(i,key)));assert.deepEqual(i.state.bag.map(s=>s.qty),[25,25]);i.merge();assert.equal(i.state.bag.length,1);assert.equal(i.state.bag[0].qty,50);
 while(i.state.bag.length<i.slots())assert(i.add('weapon/pm'));const before=i.snapshot();assert.equal(i.add(key,51),false);assert.deepEqual(i.snapshot(),before);assert.equal(i.split(uid(i,key)),false);
});
test('equipment swaps retain instances and ammunition; backpack cannot be removed or downgraded into overflow',()=>{
 const i=make();i.add('item/backpacks-helmet-pack-5');i.equip(i.state.bag[0].uid);assert.equal(i.slots(),60);while(i.state.bag.length<30)i.add('weapon/pm');assert.equal(i.unequip('backpack'),false);i.add('item/backpacks-helmet-pack-1');const before=i.snapshot();assert.equal(i.equip(uid(i,'item/backpacks-helmet-pack-1')),false);assert.deepEqual(i.snapshot(),before);
});
test('all 24 weapons accept only their ammunition family and conserve rounds through reload, fire and ground transfers',()=>{
 for(const w of catalog.filter(d=>d.ammo)){const i=make();i.add(w.key);i.equip(i.state.bag[0].uid);assert.equal(i.reload(),false);assert.equal(i.fire(),false);const wrong=catalog.find(a=>a.category==='ammo'&&a.entityId!==w.ammo);i.add(wrong.key,1);assert.equal(i.reload(),false);const ammo=catalog.find(a=>a.entityId===w.ammo);i.add(ammo.key,50);assert(i.reload());assert.equal(i.state.equipment.weapon.loaded,w.capacity);assert.equal(i.reload(),false);assert(i.fire());assert.equal(i.state.equipment.weapon.loaded,w.capacity-1);i.unequip('weapon');i.drop(uid(i,w.key),{x:4096,y:4096});i.pickup(i.state.ground[0].uid);i.equip(uid(i,w.key));assert.equal(i.state.equipment.weapon.loaded,w.capacity-1);assert.equal(i.state.bag.find(s=>s.key===ammo.key).qty,50-w.capacity);}
});
test('consumables restore bounded stats, raw meat has penalty, manuals are learned only once',()=>{
 const i=make(),raw=catalog.find(d=>d.variant==='raw');i.add(raw.key);i.use(i.state.bag[0].uid);assert.equal(i.state.vitals.health,55);i.add('item/medicine-water-kit-large');i.use(uid(i,'item/medicine-water-kit-large'));assert.equal(i.state.vitals.health,100);i.add('item/manuals-medicine');i.use(uid(i,'item/manuals-medicine'));i.add('item/manuals-medicine');assert.equal(i.use(uid(i,'item/manuals-medicine')),false);assert.equal(i.state.learned.length,1);
});
test('save validation preserves inventory, rejects unknown IDs and clamps invalid values without trusting client input',()=>{
 const i=make();i.add('weapon/ak74');i.equip(i.state.bag[0].uid);i.add('ammo/rifle@closed',50);i.reload();i.add('item/materials-nails',12);i.drop(i.state.bag.find(s=>s.key==='item/materials-nails').uid,{x:4096,y:4096});
 const save={version:1,worldName:'Полигон',characterId:'01-gleb',x:4096,y:4096,direction:'south',crouched:false,district:{mapId:'item-lab-v1'},inventory:i.snapshot()},clean=validateSave(save),restored=createInventory(catalog,clean.inventory);
 assert.equal(clean.district.mapId,'item-lab-v1');assert.equal(restored.state.equipment.weapon.loaded,30);assert.equal(restored.state.ground[0].qty,12);
 save.inventory.bag.push({key:'unknown',qty:1},{key:'weapon/pm',qty:999});save.inventory.vitals.health=NaN;save.inventory.equipment.weapon.loaded=Infinity;const sanitized=validateSave(save);assert(!sanitized.inventory.bag.some(s=>s.key==='unknown'));assert.equal(sanitized.inventory.equipment.weapon.loaded,0);assert.equal(sanitized.inventory.vitals.health,60);
});
