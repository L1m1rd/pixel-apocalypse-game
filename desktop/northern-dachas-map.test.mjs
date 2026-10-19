import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {MAP_ID,SPAWN,BOUNDS,PLOTS,OBJECTS,SECTORS,GATES,project,unproject,blocked,createDistrictState,moveInDistrict,safePosition,toggleGate,sectorAt} from './northern-dachas-map.mjs';
const {validateSave}=createRequire(import.meta.url)('./save.cjs');
test('the district contains 80 real plots, 60 cottages and eight named sectors',()=>{
 assert.equal(PLOTS.length,80);assert.equal(PLOTS.filter(p=>p.hasHouse).length,60);assert.equal(SECTORS.length,8);
 assert.equal(OBJECTS.filter(o=>o.id.endsWith('-house')).length,60);
 assert.equal(new Set(OBJECTS.map(o=>o.id)).size,OBJECTS.length);
 for(const plot of PLOTS)assert.equal(sectorAt({x:plot.x+plot.w/2,y:plot.y+plot.h/2})?.id,plot.sectorId);
});
test('projection is reversible and movement follows the screen axes',()=>{
 const state=createDistrictState();assert.equal(blocked(SPAWN,state),false);
 for(const [x,y] of [[0,0],[4740,4740],[6000,2000]]){const p=project(x,y),q=unproject(p.x,p.y);assert(Math.abs(x-q.x)<1e-8&&Math.abs(y-q.y)<1e-8);}
 const before=project(SPAWN.x,SPAWN.y),next=moveInDistrict(SPAWN,5,0,state),after=project(next.x,next.y);
 assert(Math.abs(after.x-before.x-5)<1e-6);assert(Math.abs(after.y-before.y)<1e-6);
});
test('houses, the river and boundaries block walking without tunneling',()=>{
 const state=createDistrictState(),house=OBJECTS.find(o=>o.id.endsWith('-house')&&!blocked({x:o.x-o.solid.w/2-20,y:o.y},state));
 assert(house,'A free approach to a house must exist');
 assert(blocked(house,state));assert(blocked({x:850,y:2000},state));assert(blocked({x:BOUNDS.x-1,y:5000},state));
 const p={x:house.x-house.solid.w/2-20,y:house.y};const intended=project(80,0),moved=moveInDistrict(p,intended.x,intended.y,state);
 assert(moved.x<house.x-house.solid.w/2);assert(!blocked(moved,state));
 assert.deepEqual(safePosition(house,state),SPAWN);
});
test('gates can be opened, retained in saves, and cannot close on the player',()=>{
 const state=createDistrictState(),gate=GATES[0],p={x:gate.x,y:gate.y+28};
 assert(blocked(gate,state));assert.equal(toggleGate(p,state),'Ворота открыты');assert(!blocked(gate,state));
 assert.equal(toggleGate(gate,state),'Отойди от проёма, чтобы закрыть ворота.');
 const save=validateSave({version:1,worldName:'Дачи',characterId:'01-gleb',x:p.x,y:p.y,direction:'south',crouched:false,district:state});
 assert.equal(save.district.mapId,MAP_ID);assert(createDistrictState(save.district).openedGates.includes(gate.id));
 assert.deepEqual(createDistrictState({mapId:'other',openedGates:[gate.id]}).openedGates,[]);
});
test('all 80 plot entrances and all sectors are reachable from the south entrance',()=>{
 const state=createDistrictState();state.openedGates=GATES.map(g=>g.id);
 const step=24,x0=Math.ceil(BOUNDS.x/step)*step,y0=Math.ceil(BOUNDS.y/step)*step,w=Math.floor(BOUNDS.w/step),h=Math.floor(BOUNDS.h/step);
 const seen=new Uint8Array(w*h),queue=[],sx=Math.round((SPAWN.x-x0)/step),sy=Math.round((SPAWN.y-y0)/step);
 queue.push(sy*w+sx);seen[sy*w+sx]=1;
 for(let head=0;head<queue.length;head++){
  const index=queue[head],x=index%w,y=Math.floor(index/w),p={x:x0+x*step,y:y0+y*step};
  for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy,ni=ny*w+nx;if(nx<0||nx>=w||ny<0||ny>=h||seen[ni])continue;
   let free=true;for(let n=1;n<=3;n++)if(blocked({x:p.x+dx*step*n/3,y:p.y+dy*step*n/3},state)){free=false;break;}
   if(free){seen[ni]=1;queue.push(ni);}
  }
 }
 function reachable(p){const x=Math.round((p.x-x0)/step),y=Math.round((p.y-y0)/step);for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)if(x+dx>=0&&x+dx<w&&y+dy>=0&&y+dy<h&&seen[(y+dy)*w+x+dx])return true;return false;}
 assert(queue.length>10000,'District unexpectedly restricted');
 for(const plot of PLOTS)assert(reachable(plot.entrance),'Unreachable '+plot.id);
 for(const sector of SECTORS)assert(PLOTS.filter(p=>p.sectorId===sector.id).some(p=>reachable(p.entrance)),'Unreachable sector '+sector.name);
});
