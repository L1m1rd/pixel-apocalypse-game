import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createInventory} from './inventory.mjs';
import {createSurvival} from './survival-engine.mjs';
import {actorFrame,attackContactMs} from './actor-motion.mjs';
import {footprintShadow} from './northern-dachas-lighting.mjs';
const require=createRequire(import.meta.url),catalog=require('./inventory-catalog.json'),defs=require('./media/asset-manifest.json').survival.actors;
function setup(skin='01-A'){
 const inv=createInventory(catalog),p={x:4096,y:4096,direction:'south',action:'walk'},e=createSurvival(inv,null,123);e.enable(p);e.state.objects=[];inv.state.equipment={};inv.state.vitals.health=100;inv.state.vitals.bleeding=0;inv.state.vitals.disease=0;
 const a={id:'strike',kind:'infected',skin,x:p.x+12,y:p.y-12,homeX:p.x+12,homeY:p.y-12,health:1000,maxHealth:1000,dead:false,action:'idle',elapsed:0,direction:'west',alert:4,suspicion:1,cooldown:0};e.state.actors=[a];e.setActorDefinitions(defs);e.update(.01,p);assert.equal(a.action,'attack');return {e,inv,p,a};
}
test('all infected apply damage only on the animation contact frame, once per swing',()=>{
 for(const skin of Object.keys(defs).filter(id=>/^\d/.test(id))){const {e,inv,p,a}=setup(skin);assert.equal(inv.state.vitals.health,100);const hit=attackContactMs(a,defs);while(a.elapsed+10<hit){e.update(.01,p);assert.equal(inv.state.vitals.health,100,skin+' damaged during wind-up');}e.update(.011,p);assert(inv.state.vitals.health<100);assert.equal(actorFrame(a,defs[skin]).frame,3);const h=inv.state.vitals.health;for(let i=0;i<8;i++)e.update(.01,p);assert(inv.state.vitals.health>h-.1,'duplicate damage in one strike');}
});
test('moving away, blocking the swing, death or hurt before contact cancels the impact',()=>{
 for(const scenario of ['distance','wall','death','hurt']){const {e,inv,p,a}=setup();if(scenario==='distance')p.x+=200;if(scenario==='wall')e.state.objects=[{kind:'vehicle',x:(p.x+a.x)/2,y:(p.y+a.y)/2,solidLocal:{w:3,h:200},solidTurn:0}];if(scenario==='death'){a.dead=true;a.health=0;}if(scenario==='hurt'){a.action='hurt';a.elapsed=0;a.motionLock=1;}for(let i=0;i<45;i++)e.update(.01,p);assert.equal(inv.state.vitals.health,100,scenario);}
});
test('building shadow hull stays anchored to all footprint corners without inverted or crossing edges',()=>{
 const points=[{x:-70,y:0},{x:0,y:-40},{x:70,y:0},{x:0,y:40}],hull=footprintShadow(points,999);assert(hull.length>=4);assert(Math.max(...hull.map(p=>p.x))<150);assert(Math.min(...hull.map(p=>p.y))>=-40);for(let i=0;i<hull.length;i++){const a=hull[i],b=hull[(i+1)%hull.length],c=hull[(i+2)%hull.length];assert((b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x)>=0);}
});
