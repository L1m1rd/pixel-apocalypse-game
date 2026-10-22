import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createPlayer,stepPlayer,toggleCrouch,SIZE,SPEED} from './core.mjs';
const {validateSave}=createRequire(import.meta.url)('./save.cjs');
const timing={idle:220,walk:140,run:90,crouch_down:110,crouch_idle:220,crouch_walk:150,stand_up:110};
function advance(p,keys,seconds){for(let elapsed=0;elapsed<seconds-1e-8;elapsed+=.01)stepPlayer(p,new Set(keys),.01,timing);}
test('diagonal movement has the same speed as horizontal movement',()=>{const a=createPlayer(),b=createPlayer();advance(a,['KeyD'],1);advance(b,['KeyD','KeyW'],1);assert.ok(Math.abs(a.x-SIZE/2-SPEED.walk)<1e-6);assert.ok(Math.abs(Math.hypot(b.x-SIZE/2,b.y-SIZE/2)-SPEED.walk)<1e-6);assert.equal(b.direction,'north');});
test('running is faster; opposing keys cancel; world bounds hold',()=>{const p=createPlayer({x:8158,y:32});advance(p,['KeyD','ShiftLeft'],1);assert.equal(p.x,8160);assert.equal(p.action,'idle');advance(p,['KeyA','KeyD'],1);assert.equal(p.action,'idle');advance(p,['KeyW'],1);assert.equal(p.y,32);});
test('crouch transitions finish once, crouch walking ignores Shift, stand up restores walking',()=>{const p=createPlayer();toggleCrouch(p);assert.equal(p.action,'crouch_down');advance(p,['KeyD'],.5);assert.equal(p.x,SIZE/2);advance(p,[],.2);assert.equal(p.crouched,true);const before=p.x;advance(p,['KeyD','ShiftLeft'],1);assert.equal(p.action,'crouch_walk');assert.ok(Math.abs(p.x-before-SPEED.crouch_walk)<1e-6);toggleCrouch(p);advance(p,[],.7);assert.equal(p.crouched,false);advance(p,['KeyD'],.2);assert.equal(p.action,'walk');});
test('large delta times cannot teleport a player',()=>{const p=createPlayer();stepPlayer(p,new Set(['KeyD']),500,timing);assert.equal(p.x,SIZE/2+SPEED.walk*.05);});
test('saves validate identity, positions, types and world name',()=>{const s={version:1,worldName:' Поле ',characterId:'03-miron',x:4096,y:4096,direction:'south',crouched:false};assert.equal(validateSave(s).worldName,'Поле');for(const change of [{x:NaN},{x:-1},{y:10000},{characterId:'unknown'},{worldName:'   '},{worldName:'x'.repeat(49)},{crouched:'false'},{direction:'diagonal'},{version:2}])assert.equal(validateSave({...s,...change}),null);});
