import {housePoint,houseLocal,doorNormal,rotateLocal} from './object-facing.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {generateVillage,villageScenery,villageBlocked,villageInside,villageDoor,moveVillage,VILLAGE_SPAWN,VILLAGE_BOUNDS} from './village-world.mjs';
import {createInventory} from './inventory.mjs';
import {createSurvival} from './survival-engine.mjs';
import {setProjectionMode,project} from './item-lab-movement.mjs';
import {visibleBetween} from './survival-rules.mjs';
const require=createRequire(import.meta.url),catalog=require('./inventory-catalog.json'),{validateSave}=require('./save.cjs');
test('district references are diverse, canonical and persistent; no extraction object',()=>{
 const s=generateVillage(171),scene=villageScenery(171),defs=new Set(catalog.map(d=>d.key));assert.equal(s.objects.filter(o=>o.kind==='house').length,80);assert(scene.decor.length>4000&&scene.decor.length<9000);assert.equal(new Set(s.objects.filter(o=>o.kind==='vehicle').map(o=>o.asset)).size,6);assert(new Set(s.objects.filter(o=>o.kind==='house').map(o=>o.asset)).size>=6);assert(!s.objects.some(o=>['exit','extraction'].includes(o.kind)));assert(!villageBlocked(VILLAGE_SPAWN,s.objects,171));for(const o of s.objects)for(const stack of o.stock)assert(defs.has(stack.key),stack.key);const lootKeys=new Set(s.objects.flatMap(o=>o.stock.map(s=>s.key)));for(const key of ['weapon/ak74','item/weapons-axe','item/tools-shovel','item/gloves-tools-fishing-rod','item/seeds-potato','item/electricity-flashlight','item/boots-greaves-boots-1'])assert(lootKeys.has(key),'survival item must be obtainable without creative mode: '+key);
});
test('every house has a real enterable doorway, furniture collisions and protected internal loot',()=>{
 setProjectionMode('isometric');const inv=createInventory(catalog),engine=createSurvival(inv,null,171),p={...VILLAGE_SPAWN,action:'idle'};engine.enable(p,{village:true});
 for(const h of engine.state.objects.filter(o=>o.kind==='house')){
  const door=villageDoor(h);h.doorOpen=false;const n=doorNormal(h);Object.assign(p,{x:door.x+n.x*24,y:door.y+n.y*24});assert(engine.canInteract(h,p),h.name+' door unreachable');
  const closed=moveVillage(p,-n.x*60,-n.y*60,171,engine.state.objects);assert(!villageInside(closed,h),h.name+' closed door leaks');assert(engine.interact(h,p));
  const next=moveVillage(p,-n.x*65,-n.y*65,171,engine.state.objects);assert(villageInside(next,h),h.name+' open door blocks entry');
  Object.assign(p,next);const side=rotateLocal(200,0,h.orientation),wall=moveVillage(p,side.x,side.y,171,engine.state.objects);assert(houseLocal(wall,h).x<h.halfW,h.name+' side wall leaks');
  const f=engine.state.objects.find(o=>o.houseId===h.id&&o.asset==='bed');assert(villageBlocked(f,engine.state.objects,171));
  const chest=engine.state.objects.find(o=>o.houseId===h.id&&o.kind==='chest');Object.assign(p,housePoint(h,-h.halfW-14,-34));assert(!engine.canInteract(chest,p),'loot through outside wall');
 }
});
test('save retains furniture, doors, damage, deaths and looted stock without reverting to raids',()=>{
 const inv=createInventory(catalog),e=createSurvival(inv,null,99),p={...VILLAGE_SPAWN,action:'idle'};e.enable(p,{village:true});const h=e.state.objects.find(o=>o.kind==='house');h.doorOpen=true;const door=villageDoor(h);Object.assign(p,{x:door.x,y:h.y+20});const chest=e.state.objects.find(o=>o.houseId===h.id&&o.kind==='chest');chest.stock=[];
 const data=validateSave({version:1,worldName:'Проверка района',characterId:'01-gleb',gameMode:'survival',x:p.x,y:p.y,direction:'north',crouched:false,district:{mapId:'northern-dachas-survival-v2'},inventory:inv.snapshot(),survival:e.snapshot()});
 assert.equal(data.gameMode,'survival');assert(data.survival.villageMode);assert.equal(data.survival.objects.length,e.state.objects.length);const restored=data.survival.objects.find(o=>o.id===h.id);assert(restored.doorOpen);assert.equal(restored.halfW,76);assert(villageInside(p,restored));assert.deepEqual(data.survival.objects.find(o=>o.id===chest.id).stock,[]);assert(data.survival.objects.find(o=>o.houseId===h.id&&o.solid));
 const i2=createInventory(catalog,data.inventory),e2=createSurvival(i2,data.survival);e2.update(.05,p);i2.state.vitals.health=0;e2.update(.05,p);assert(e2.state.dead);const elapsed=e2.state.elapsed;e2.update(1,p);assert.equal(e2.state.elapsed,elapsed);assert(!e2.movement(p,20,0).x||e2.movement(p,20,0).x===p.x);
});
test('a closed door and walls stop shots and sight; the opened doorway is transparent',()=>{const h=generateVillage(1).objects.find(o=>o.kind==='house'),d=villageDoor(h),a={x:d.x,y:h.y},b={x:d.x,y:d.y+30};h.doorOpen=false;assert(!visibleBetween(a,b,[h]));h.doorOpen=true;assert(visibleBetween(a,b,[h]));assert(!visibleBetween(a,{x:h.x+140,y:h.y},[h]));});
test('roads and every house entrance belong to one walkable district',()=>{
 const seed=171,s=generateVillage(seed);for(const o of s.objects)if(o.kind==='gate')o.doorOpen=true;
 const b=VILLAGE_BOUNDS,step=16,W=Math.ceil((b.right-b.left)/step)+1,H=Math.ceil((b.bottom-b.top)/step)+1,occupancy=new Int8Array(W*H),seen=new Uint8Array(W*H),queue=new Int32Array(W*H);
 const cell=p=>({x:Math.round((p.x-b.left)/step),y:Math.round((p.y-b.top)/step)}),point=(x,y)=>({x:b.left+x*step,y:b.top+y*step});
 function free(x,y){if(x<0||y<0||x>=W||y>=H)return false;const id=y*W+x;if(!occupancy[id])occupancy[id]=villageBlocked(point(x,y),s.objects,seed)?-1:1;return occupancy[id]===1;}
 const start=cell(VILLAGE_SPAWN);let head=0,tail=1;queue[0]=start.y*W+start.x;seen[queue[0]]=1;
 while(head<tail){const n=queue[head++],x=n%W,y=Math.floor(n/W);for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){const xx=x+dx,yy=y+dy,id=yy*W+xx;if(!free(xx,yy)||seen[id])continue;const middle=point(x+dx*.5,y+dy*.5);if(villageBlocked(middle,s.objects,seed))continue;seen[id]=1;queue[tail++]=id;}}
 const inaccessible=[];for(const h of s.objects.filter(o=>o.kind==='house')){const door=villageDoor(h);let found=false;for(let dx=-12;dx<=12;dx+=6)for(let dy=18;dy<=50;dy+=8){const n=doorNormal(h),p=cell({x:door.x+n.x*dy+n.y*dx,y:door.y+n.y*dy-n.x*dx});if(seen[p.y*W+p.x])found=true;}if(!found)inaccessible.push(h.name+' '+h.x+','+h.y);}
 assert.deepEqual(inaccessible,[],'entrances isolated by fences or scenery');assert(tail>30000);
});
