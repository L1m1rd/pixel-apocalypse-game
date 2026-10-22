import test from 'node:test';
import assert from 'node:assert/strict';
import {rotateLocal,housePoint,houseLocal,doorNormal,directionalKey} from './object-facing.mjs';
import {generateVillage,migrateVillageFacing,villageInside,villageDoor} from './village-world.mjs';

test('quarter turns preserve local coordinates and align all doors with the same art variant',()=>{
 for(let orientation=0;orientation<4;orientation++){
  const h={kind:'house',x:120,y:300,orientation,halfW:76,halfH:62,doorOffset:12,variantIndex:2};
  for(const [x,y]of [[0,0],[12,45],[-50,-32]]){const q=houseLocal(housePoint(h,x,y),h);assert.equal(Math.abs(q.x-x)+Math.abs(q.y-y),0);}
  const door=villageDoor(h),n=doorNormal(h),inside={x:door.x-n.x*24,y:door.y-n.y*24};assert(villageInside(inside,h));
  assert.equal(directionalKey(h),'house-2-'+orientation);assert.equal(Math.hypot(...Object.values(rotateLocal(4,3,orientation))),5);
 }
});
test('old village saves retain loot, door state, built objects and indoor player/piles through facing migration',()=>{
 const world=generateVillage(42);delete world.viewVersion;
 // Version 0.11 represented every home and its contents in the unrotated frame.
 for(const o of world.objects)o.orientation=0;
 const h=world.objects.find(o=>o.kind==='house'&&o.layout===1)??world.objects.filter(o=>o.kind==='house')[1];
 const chest=world.objects.find(o=>o.houseId===h.id&&o.kind==='chest');chest.stock=[{key:'item/materials-cloth',qty:3,condition:37}];h.doorOpen=true;
 const p={x:h.x+9,y:h.y-11},ground=[{uid:99,key:'item/food-canned-food',qty:1,x:h.x+12,y:h.y+14}];
 world.objects.push({id:'build-unique',kind:'campfire',x:1100,y:5700,fuel:33});
 assert(migrateVillageFacing(world,p,ground));const next=world.objects.find(o=>o.id===h.id);
 const lp=houseLocal(p,next),lg=houseLocal(ground[0],next);assert(Math.abs(lp.x-9)+Math.abs(lp.y+11)<1e-8);assert(Math.abs(lg.x-12)+Math.abs(lg.y-14)<1e-8);
 assert(next.doorOpen);assert.deepEqual(world.objects.find(o=>o.id===chest.id).stock,[{key:'item/materials-cloth',qty:3,condition:37}]);
 assert.equal(world.objects.find(o=>o.id==='build-unique').fuel,33);assert.equal(world.viewVersion,3);
 const once=structuredClone(world);assert.equal(migrateVillageFacing(world,p,ground),false);assert.deepEqual(world,once);
});
