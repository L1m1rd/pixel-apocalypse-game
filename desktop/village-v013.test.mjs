import test from 'node:test';import assert from 'node:assert/strict';import {createRequire} from 'node:module';
import {generateVillage,villageScenery,roadDistance,VILLAGE_SPAWN,villageInside,villageDoor,moveVillage} from './village-world.mjs';
import {project,setProjectionMode} from './item-lab-movement.mjs';import {housePoint,houseLocal,doorNormal} from './object-facing.mjs';
import {screenFacing,movedOnScreen} from './locomotion.mjs';import {moveToward} from './survival-world.mjs';import {createPlayer,stepPlayer} from './core.mjs';import {legacyHouseLoot,migrateHouseLoot} from './village-loot.mjs';
const require=createRequire(import.meta.url),catalog=new Map(require('./inventory-catalog.json').map(d=>[d.key,d]));
test('house loot varies per world and per house, remains repeatable, and has canonical bounded stacks',()=>{
 const a=generateVillage(171),b=generateVillage(172),again=generateVillage(171),chests=w=>w.objects.filter(o=>o.houseId&&o.kind==='chest');assert.deepEqual(chests(a),chests(again));assert.notDeepEqual(chests(a).map(c=>c.stock),chests(b).map(c=>c.stock));
 for(const h of a.objects.filter(o=>o.kind==='house'))assert(chests(a).some(o=>o.houseId===h.id&&o.stock.length>0));const combinations=new Set(chests(a).map(c=>JSON.stringify(c.stock)));assert(combinations.size>120);
 for(const c of chests(a))for(const s of c.stock){const d=catalog.get(s.key);assert(d,s.key);assert(s.qty>=1&&s.qty<=d.maxStack,s.key+' quantity '+s.qty);if(s.condition!==undefined)assert(s.condition>=30&&s.condition<=100);}
});
test('migration randomizes untouched legacy stock without refilling looted or player-modified cabinets',()=>{
 const w=generateVillage(30);delete w.lootVersion;const houses=w.objects.filter(o=>o.kind==='house');for(const [i,h]of houses.entries())w.objects.filter(o=>o.houseId===h.id&&o.kind==='chest').forEach((c,j)=>c.stock=legacyHouseLoot(i,j,h.sectorId));const chests=w.objects.filter(o=>o.houseId&&o.kind==='chest');chests[0].stock=[];chests[1].stock=[{key:'item/materials-cloth',qty:3}];chests[1].lootTouched=true;const untouched=structuredClone(chests[2].stock);assert(migrateHouseLoot(w));assert.deepEqual(chests[0].stock,[]);assert.deepEqual(chests[1].stock,[{key:'item/materials-cloth',qty:3}]);assert.notDeepEqual(chests[2].stock,untouched);const once=structuredClone(w);assert.equal(migrateHouseLoot(w),false);assert.deepEqual(w,once);
});
test('roads contain connected straight horizontal and vertical screen sections',()=>{
 setProjectionMode('isometric');const scene=villageScenery(171),axis=scene.roads.filter(r=>r.axial);assert(axis.length>=8);let horizontal=0,vertical=0;for(const r of axis)for(let i=1;i<r.points.length;i++){const a=project(...r.points[i-1]),b=project(...r.points[i]);assert(Math.abs(a.x-b.x)<1e-6||Math.abs(a.y-b.y)<1e-6);if(Math.abs(a.x-b.x)<1e-6)vertical++;else horizontal++;}assert(horizontal>=3&&vertical>=3);assert(axis.some(r=>roadDistance(VILLAGE_SPAWN,r)<2));
});
test('flowering growth is sparse and reaches yards and deep woodland, rather than a continuous road border',()=>{
 const scene=villageScenery(171),flowers=scene.decor.filter(d=>/white|violet|clover|golden|flower|wild-rose/.test(d.asset)),verges=scene.decor.filter(d=>d.habitat==='verge');assert(flowers.length>100);assert(flowers.length<scene.decor.length*.18);assert(!verges.some(d=>/white|violet|flower|golden/.test(d.asset)));assert(flowers.filter(d=>Math.min(...scene.roads.map(r=>roadDistance(d,r)-r.width/2))>120).length>70);assert(flowers.some(d=>scene.plots.some(p=>d.x>p.x&&d.x<p.x+p.w&&d.y>p.y&&d.y<p.y+p.h)));
});
test('all eight orientations have an exact doorway, rotated walls, and stable local-space coordinates',()=>{
 const w=generateVillage(171);assert.equal(new Set(w.objects.filter(o=>o.kind==='house').map(h=>h.orientation)).size,8);for(const h of w.objects.filter(o=>o.kind==='house')){const n=doorNormal(h),d=villageDoor(h);h.doorOpen=true;const p={x:d.x+n.x*24,y:d.y+n.y*24},q=moveVillage(p,-n.x*65,-n.y*65,171,w.objects);assert(villageInside(q,h),h.name+' orientation '+h.orientation);const local=houseLocal(housePoint(h,10,12),h);assert(Math.abs(local.x-10)+Math.abs(local.y-12)<1e-8);}
});
test('player stops at walls and faces the actual slide rather than the requested movement',()=>{
 setProjectionMode('orthographic');const timing={walk:140,run:90,idle:220},p=createPlayer();stepPlayer(p,new Set(['KeyD']),.05,timing,(p)=>({x:p.x,y:p.y-2}));assert.equal(p.direction,'north');assert.equal(p.action,'walk');for(let i=0;i<8;i++)stepPlayer(p,new Set(['KeyD']),.05,timing,p=>({x:p.x,y:p.y}));assert.equal(p.action,'idle');assert.equal(p.elapsed,0);setProjectionMode('isometric');
});
test('infected face every actual sidestep and do not walk on the spot when boxed in',()=>{
 setProjectionMode('isometric');for(const target of [{x:100,y:0},{x:-100,y:0},{x:0,y:100},{x:0,y:-100}]){const a={x:0,y:0,elapsed:20,action:'walk',direction:'south'},before={...a};moveToward(a,target,.05,48,[{kind:'house',x:20,y:0}]);const d=movedOnScreen(before,a);if(d.distance>.002)assert.equal(a.direction,screenFacing(d.dx,d.dy));}
 const a={x:200,y:200,action:'walk',elapsed:150,direction:'east'};moveToward(a,{x:300,y:200},.05,48,[{kind:'tree',x:200,y:200}]);assert.equal(a.action,'idle');assert.equal(a.elapsed,0);
});
