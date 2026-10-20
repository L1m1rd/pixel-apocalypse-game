import test from 'node:test';import assert from 'node:assert/strict';
import {createPlayer,stepPlayer,toggleCrouch,SPEED} from './core.mjs';import {project,moveOnLab} from './item-lab-movement.mjs';
const timing={idle:220,walk:140,run:90,crouch_down:110,crouch_idle:220,crouch_walk:150,stand_up:110};
const advance=(p,keys,t=1)=>{for(let i=0;i<Math.round(t*100);i++)stepPlayer(p,new Set(keys),.01,timing,moveOnLab);};
const delta=p=>{const a=project(4096,4096),b=project(p.x,p.y);return {x:b.x-a.x,y:b.y-a.y};};
test('WASD and arrows follow screen directions; all eight directions keep equal projected speed',()=>{
 for(const [keys,x,y] of [[['KeyW'],0,-1],[['KeyS'],0,1],[['KeyA'],-1,0],[['KeyD'],1,0],[['KeyW','KeyD'],1,-1],[['KeyS','KeyD'],1,1],[['KeyS','KeyA'],-1,1],[['KeyW','KeyA'],-1,-1],[['ArrowUp'],0,-1],[['ArrowRight'],1,0],[['ArrowDown'],0,1],[['ArrowLeft'],-1,0]]){const p=createPlayer();advance(p,keys);const d=delta(p),length=Math.hypot(x,y);assert(Math.abs(d.x-x/length*SPEED.walk)<1e-6,keys+' horizontal screen displacement');assert(Math.abs(d.y-y/length*SPEED.walk)<1e-6,keys+' vertical screen displacement');assert(Math.abs(Math.hypot(d.x,d.y)-100)<1e-6);}
});
test('screen running, crouching, stopping, opposite keys and frame rates preserve expected speeds',()=>{
 for(const [keys,crouch,speed] of [[['KeyD','ShiftLeft'],false,178],[['KeyW'],true,52],[['KeyA','KeyD'],false,0]]){const p=createPlayer({crouched:crouch});advance(p,keys);assert(Math.abs(Math.hypot(...Object.values(delta(p)))-speed)<1e-6);advance(p,[],.1);assert(['idle','crouch_idle'].includes(p.action));}
 const results=[];for(const fps of [30,60,120]){const p=createPlayer();for(let i=0;i<fps;i++)stepPlayer(p,new Set(['KeyW','KeyD']),1/fps,timing,moveOnLab);results.push(delta(p));}for(const d of results)assert(Math.abs(Math.hypot(d.x,d.y)-100)<1e-6);
 const p=createPlayer();toggleCrouch(p);advance(p,[],.7);assert(p.crouched);advance(p,['KeyD'],1);assert(Math.abs(delta(p).x-52)<1e-6);
});
