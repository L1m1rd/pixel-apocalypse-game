import {project} from './item-lab-movement.mjs';
export function screenFacing(dx,dy,fallback='south'){
 if(Math.hypot(dx,dy)<1e-6)return fallback;
 // Resolve ties consistently so a diagonal input does not flicker between views.
 return Math.abs(dx)>Math.abs(dy)*1.06?(dx>0?'east':'west'):(dy>0?'south':'north');
}
export function movedOnScreen(before,after){const a=project(before.x,before.y),b=project(after.x,after.y);return {dx:b.x-a.x,dy:b.y-a.y,distance:Math.hypot(b.x-a.x,b.y-a.y)};}
export function faceActualMovement(actor,before,action){const step=movedOnScreen(before,actor);if(step.distance<.002){actor.action='idle';actor.movedDistance=0;return 0;}actor.direction=screenFacing(step.dx,step.dy,actor.direction);actor.action=action;actor.movedDistance=step.distance;return step.distance;}
export function heroGaitTime(actor,character){if(!['walk','run','crouch_walk'].includes(actor.action)||!Number.isFinite(actor.gaitDistance))return actor.elapsed;const dir=actor.direction,action=actor.action,cycle=action==='walk'&&['east','west'].includes(dir)?960:(character.frameCounts[dir][action]*character.timingsByDirection[dir][action]),stride=action==='run'?62:action==='crouch_walk'?28:42;return actor.gaitDistance/stride*cycle;}
