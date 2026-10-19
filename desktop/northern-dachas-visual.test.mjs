import test from 'node:test';
import assert from 'node:assert/strict';
import {PLOTS,OBJECTS,FENCES,ROADS,project,blocked,createDistrictState} from './northern-dachas-map.mjs';
import {SCENE_VIEWS} from './northern-dachas-details.mjs';
import {fencePlane,createSpatialIndex} from './northern-dachas-geometry.mjs';

test('adjacent fence sections share exact projected endpoints on both world axes',()=>{
 let joints=0;const groups=Map.groupBy(FENCES,f=>f.id.replace(/-\d+$/,''));
 for(const row of groups.values()){
  row.sort((a,b)=>a.axis==='x'?a.x-b.x:a.y-b.y);
  for(let n=1;n<row.length;n++){
   const a=row[n-1],b=row[n];if(Math.hypot(b.x-a.x,b.y-a.y)>(a.length+b.length)/2+1e-7)continue;
   const p=fencePlane(a,project),q=fencePlane(b,project);assert(Math.hypot(p.b.x-q.a.x,p.b.y-q.a.y)<1e-7,'Fence discontinuity '+a.id+' -> '+b.id);joints++;
  }
 }
 assert(joints>900);assert(FENCES.every(f=>f.asset.startsWith('fence-plane-')));
});
test('dense yards have understory, varied meadow and several prop groups',()=>{
 assert(OBJECTS.length>15000);
 for(const p of PLOTS){const own=OBJECTS.filter(o=>o.plotId===p.id);assert(own.filter(o=>o.type==='vegetation').length>=80,'Sparse yard '+p.id);assert(own.filter(o=>o.id.includes('-story-')).length>=18,'Missing yard detail '+p.id);}
 assert(OBJECTS.some(o=>o.asset==='playground-swing'));assert(OBJECTS.some(o=>o.asset==='boiler-rusty'));assert(OBJECTS.some(o=>o.asset==='water-tank'));
 assert(ROADS.filter(r=>r.id.startsWith('lane-')).every(r=>r.width<=48));
});
test('all eight visual reference positions remain usable',()=>{
 assert.equal(SCENE_VIEWS.length,8);const state=createDistrictState();for(const view of SCENE_VIEWS)assert(!blocked(view,state),'Blocked camera anchor '+view.id);
});
test('spatial culling returns exactly the objects in a requested world rectangle',()=>{
 const index=createSpatialIndex(OBJECTS);
 for(const r of [[1800,900,2800,1700],[3100,2800,4000,3700],[4400,4400,5000,4900]]){
  const expected=OBJECTS.filter(o=>o.x>=r[0]&&o.y>=r[1]&&o.x<=r[2]&&o.y<=r[3]).map(o=>o.id).sort();
  assert.deepEqual(index.query(...r).map(o=>o.id).sort(),expected);
 }
});
