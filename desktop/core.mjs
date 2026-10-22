import {screenFacing,movedOnScreen} from './locomotion.mjs';
export const SIZE=8192;
export const SPEED={walk:100,run:178,crouch_walk:52};
export function createPlayer(save={}){return {x:save.x??SIZE/2,y:save.y??SIZE/2,direction:save.direction??'south',crouched:save.crouched??false,action:save.crouched?'crouch_idle':'idle',elapsed:0,gaitDistance:0,transition:null};}
export function toggleCrouch(p){if(p.transition)return;p.transition=p.crouched?'stand_up':'crouch_down';p.action=p.transition;p.elapsed=0;}
export function stepPlayer(p,keys,dt,timing,resolveMovement){
 dt=Math.max(0,Math.min(dt,.05));p.elapsed+=dt*1000;
 if(p.transition){if(p.elapsed>=6*timing[p.transition]){p.crouched=p.transition==='crouch_down';p.transition=null;p.action=p.crouched?'crouch_idle':'idle';p.elapsed=0;}return;}
 let dx=Number(keys.has('KeyD')||keys.has('ArrowRight'))-Number(keys.has('KeyA')||keys.has('ArrowLeft'));
 let dy=Number(keys.has('KeyS')||keys.has('ArrowDown'))-Number(keys.has('KeyW')||keys.has('ArrowUp'));
 const length=Math.hypot(dx,dy);const moving=length>0;
 const action=moving?(p.crouched?'crouch_walk':keys.has('ShiftLeft')||keys.has('ShiftRight')?'run':'walk'):(p.crouched?'crouch_idle':'idle');
 if(p.action!==action){p.action=action;p.elapsed=0;}
 if(moving){dx/=length;dy/=length;const speed=SPEED[action],before={x:p.x,y:p.y},next=resolveMovement?resolveMovement(p,dx*speed*dt,dy*speed*dt):{x:p.x+dx*speed*dt,y:p.y+dy*speed*dt};p.x=Math.max(32,Math.min(SIZE-32,next.x));p.y=Math.max(32,Math.min(SIZE-32,next.y));const step=resolveMovement?movedOnScreen(before,p):{dx:p.x-before.x,dy:p.y-before.y,distance:Math.hypot(p.x-before.x,p.y-before.y)};if(step.distance<.002){p.direction=screenFacing(dx,dy,p.direction);p.action=p.crouched?'crouch_idle':'idle';p.elapsed=0;}else{p.gaitDistance=(p.gaitDistance??0)+step.distance;p.direction=screenFacing(step.dx,step.dy,p.direction);p.elapsed=Math.max(0,p.elapsed-dt*1000*(1-Math.min(1,step.distance/Math.max(.00001,speed*dt))));}}
}
