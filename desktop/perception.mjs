import {project} from './item-lab-movement.mjs';
import {housePoint,houseLocal} from './object-facing.mjs';
import {villageWalls} from './village-world.mjs';
const TAU=Math.PI*2;
const facing={east:{x:1,y:0},west:{x:-1,y:0},north:{x:0,y:-1},south:{x:0,y:1}};
export const screenDistance=(a,b)=>{const p=project(a.x-b.x,a.y-b.y);return Math.hypot(p.x,p.y);};
const rectangle=(o,x,y,w,h,turn=o.orientation??0)=>[[x,y],[x+w,y],[x+w,y+h],[x,y+h]].map(([x,y])=>{const p=housePoint({...o,orientation:turn},x,y);return project(p.x,p.y);});
export function sightPolygons(o){
 if(o.kind==='house')return villageWalls({...o,x:0,y:0,orientation:0,halfW:o.halfW??59,halfH:o.halfH??47}).map(r=>rectangle(o,r.x,r.y,r.w,r.h));
 if(o.partition&&o.solidLocal)return [rectangle(o,-o.solidLocal.w/2,-o.solidLocal.h/2,o.solidLocal.w,o.solidLocal.h,o.solidTurn)];
 if(o.kind==='tree'&&!o.used){const radius=Math.max(12,Math.min(25,(o.visualW??80)*.17));return [Array.from({length:8},(_,i)=>project(o.x+Math.cos(i*TAU/8)*radius,o.y+Math.sin(i*TAU/8)*radius))];}
 if(['vehicle','barricade'].includes(o.kind)||o.kind==='scenery'&&o.solid){const s=o.solidLocal??o.solid??{w:72,h:24};return [rectangle(o,-s.w/2,-s.h/2,s.w,s.h,o.solidTurn??0)];}
 return [];
}
function pointInside(p,poly){let inside=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a.y>p.y)!==(b.y>p.y)&&p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x)inside=!inside;}return inside;}
function edgesFor(objects,p,range,ignore=null){const result=[],observer=project(p.x,p.y);for(const o of objects){if(o===ignore||o.id&&o.id===ignore?.id||screenDistance(p,o)>range+220)continue;for(const poly of sightPolygons(o)){if(pointInside(observer,poly))continue;for(let i=0;i<poly.length;i++)result.push([poly[i],poly[(i+1)%poly.length]]);}}return result;}
function rayDistance(p,dx,dy,edges,max){let distance=max;for(const [a,b]of edges){const sx=b.x-a.x,sy=b.y-a.y,den=dx*sy-dy*sx;if(Math.abs(den)<1e-9)continue;const ax=a.x-p.x,ay=a.y-p.y,t=(ax*sy-ay*sx)/den,u=(ax*dy-ay*dx)/den;if(t>.05&&t<distance&&u>=0&&u<=1)distance=t;}return distance;}
export function sightLine(a,b,objects,ignore=null){const p=project(a.x,a.y),q=project(b.x,b.y),dx=q.x-p.x,dy=q.y-p.y,d=Math.hypot(dx,dy);if(d<.1)return true;return rayDistance(p,dx/d,dy/d,edgesFor(objects,a,d,ignore),d)>=d-.6;}
export function insideCone(observer,target,angle=120){const d=project(target.x-observer.x,target.y-observer.y),length=Math.hypot(d.x,d.y),v=facing[observer.direction]??facing.south;return length<1||(d.x*v.x+d.y*v.y)/length>=Math.cos(angle*Math.PI/360);}
export function createVisibility(p,objects,range=380){const origin=project(p.x,p.y),edges=edgesFor(objects,p,range),angles=Array.from({length:144},(_,i)=>i*TAU/144);for(const edge of edges)for(const point of edge){const a=Math.atan2(point.y-origin.y,point.x-origin.x);angles.push(a-.0002,a,a+.0002);}for(let i=0;i<angles.length;i++)angles[i]=(angles[i]%TAU+TAU)%TAU;angles.sort((a,b)=>a-b);const polygon=angles.map(a=>{const x=Math.cos(a),y=Math.sin(a),d=rayDistance(origin,x,y,edges,range);return {x:origin.x+x*d,y:origin.y+y*d};});
 return {origin,range,polygon,contains(target){const q=project(target.x,target.y),dx=q.x-origin.x,dy=q.y-origin.y,d=Math.hypot(dx,dy);return d<=range&&rayDistance(origin,dx/(d||1),dy/(d||1),edges,d)>=d-.6;}};
}
const coverIndexes=new WeakMap();
export function coverAt(p,scene,objects){let cover=0;if(scene){if(!coverIndexes.has(scene)){const grid=new Map();for(const d of scene.decor)if(d.vegetation&&(/thicket|hazel|wild-rose|nettle/.test(d.asset))){const key=Math.floor(d.x/128)+','+Math.floor(d.y/128);if(!grid.has(key))grid.set(key,[]);grid.get(key).push(d);}coverIndexes.set(scene,grid);}const grid=coverIndexes.get(scene),x=Math.floor(p.x/128),y=Math.floor(p.y/128);for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)for(const d of grid.get((x+dx)+','+(y+dy))??[])if(screenDistance(p,d)<Math.max(15,d.w*.35))cover=Math.max(cover,.5);}
 for(const o of objects)if(o.kind==='bush'&&screenDistance(p,o)<26)cover=Math.max(cover,.6);return cover;
}
export function stealthProfile(p,world,cover=0){const crouched=p.crouched||['crouch_idle','crouch_walk','crouch_down'].includes(p.action),running=p.action==='run',moving=['walk','run','crouch_walk'].includes(p.action),quiet=world.perks?.includes('quiet')?.75:1;return {crouched,cover,visibility:(crouched?.56:1)*(1-cover*(crouched?.7:.35)),noiseRadius:(running?165:moving?crouched?22:68:0)*quiet*(1-cover*.2)};}
export function sensePlayer(a,p,world,stealth){const distance=screenDistance(a,p),range=(world.darkness>.4?175:300)*stealth.visibility,tooFar=distance>Math.max(range,stealth.noiseRadius)+1,clear=!tooFar&&sightLine(a,p,world.objects),sees=distance<=range&&insideCone(a,p,120)&&clear,hears=distance<stealth.noiseRadius*(clear?1:.2);return {sees,hears,distance,range,clear};}
