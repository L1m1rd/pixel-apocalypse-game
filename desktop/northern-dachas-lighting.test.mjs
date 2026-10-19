import test from 'node:test';
import assert from 'node:assert/strict';
import {SUN,shadowVector} from './northern-dachas-lighting.mjs';
import {OBJECTS,DECALS,WIRES,PLOTS,GATES,createDistrictState,blocked} from './northern-dachas-map.mjs';

test('the fixed sun casts shadows away from the light, proportional to height',()=>{
 assert.equal(SUN.static,true);assert(Object.isFrozen(SUN));assert(Object.isFrozen(SUN.direction));
 const a=shadowVector(50),b=shadowVector(100);assert(a.x>0&&a.y>0);
 assert(Math.abs(b.x-a.x*2)<1e-8);assert(Math.abs(b.y-a.y*2)<1e-8);
 assert.deepEqual(shadowVector(0),{x:0,y:0});
 const high=shadowVector(100,{...SUN,elevationDegrees:75});assert(Math.hypot(high.x,high.y)<Math.hypot(b.x,b.y));
});
test('every yard has ground dressing while entrances stay clear',()=>{
 assert(DECALS.length>1500);assert.equal(new Set(DECALS.map(d=>d.id)).size,DECALS.length);
 for(const p of PLOTS){assert(DECALS.some(d=>d.id===p.id+'-entry-ruts'));assert(OBJECTS.some(o=>o.id===p.id+'-story-0'));}
 const state=createDistrictState();state.openedGates=GATES.map(g=>g.id);
 for(const p of PLOTS)assert(!blocked(p.entrance,state),'Blocked entry '+p.id);
});
test('electric wires connect existing poles and all new assets are used',()=>{
 const ids=new Set(OBJECTS.map(o=>o.id));for(const w of WIRES){assert(ids.has(w.a));assert(ids.has(w.b));}
 assert(WIRES.length>40);
 const used=new Set([...OBJECTS.map(o=>o.asset),...DECALS.map(d=>d.asset)]);
 for(const id of ['thicket-bramble','grass-reeds','grass-white','ivy-climbing','wood-shelter','workbench-tools','truck-canvas','roof-debris','cottage-collapsed','birch-rich','apple-rich','wheel-ruts','glass-scatter'])assert(used.has(id),'Unused '+id);
});
