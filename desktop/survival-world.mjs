import {villageInside,villageObstacle,villageBlocked} from './village-world.mjs';
import {unproject} from './item-lab-movement.mjs';
import {KEYS,clamp,interactionDistance as distance,visibleBetween} from './survival-rules.mjs';
export const WORLD_CENTER={x:4096,y:4096};
export function makeRandom(seed){let n=seed>>>0;return ()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};}
export function generateZone(seed,zone=1){
 const rand=makeRandom(seed+zone*8191),objects=[],actors=[];let oid=1,aid=1;
 const object=(kind,x,y,extra={})=>{const o={id:'o'+oid++,kind,x,y,condition:100,used:false,stock:[],...extra};objects.push(o);return o;};
 const actor=(kind,x,y,extra={})=>{const a={id:'a'+aid++,kind,x,y,homeX:x,homeY:y,health:kind==='infected'?45:kind==='bear'?110:kind==='bandit'?65:35,action:'idle',direction:'south',elapsed:0,cooldown:0,alert:0,dead:false,looted:false,...extra};actors.push(a);return a;};
 object('well',4176,4096,{asset:'well',name:'Колодец'});
 object('chest',4038,4165,{asset:'crate',name:'Припасы у въезда',stock:[{key:KEYS.food,qty:2},{key:KEYS.water,qty:2},{key:KEYS.bandage,qty:2},{key:KEYS.tape,qty:2},{key:KEYS.wood,qty:8},{key:KEYS.stone,qty:4},{key:KEYS.cloth,qty:8},{key:KEYS.nails,qty:4},{key:KEYS.wire,qty:4},{key:'ammo/pistol@closed',qty:20} ]});
 object('house',3890,3970,{asset:'house',name:'Дом у въезда',doorOpen:true});
 object('chest',3890,3966,{asset:'crate',name:'Шкаф в доме',stock:[{key:KEYS.toolbox,qty:1},{key:KEYS.battery,qty:3},{key:KEYS.flashlight,qty:1}]});
 object('garden',4005,4010,{asset:'garden_bed',name:'Грядка',crop:null,growth:0});
 object('campfire',4120,4200,{asset:'campfire',name:'Кострище',fuel:0,burning:false});
 object('pond',4450,4260,{name:'Пруд',stock:[]});
 object('vehicle',4300,4040,{asset:'car-sedan',name:'Старый автомобиль',condition:35,fuel:0,occupied:false});
 object('exit',4096,4800,{asset:'fence-broken',name:'Выезд в следующий район',condition:0});
 actor('trader',4070,4240,{name:'Меняла',skin:'04-egor',quest:'offered',health:100});
 actor('friendly',3970,4190,{name:'Выживший',skin:'02-roman',recruited:false});
 const loot=[KEYS.food,KEYS.water,KEYS.bandage,KEYS.tape,KEYS.cloth,KEYS.scrap,KEYS.fuel,KEYS.toolbox,'ammo/rifle@closed','ammo/shotgun@closed','item/seeds-carrot','item/seeds-potato',KEYS.fishing,KEYS.shovel];
 for(let row=-3;row<=3;row++)for(let col=-3;col<=3;col++){
  const x=4096+col*420+(rand()-.5)*80,y=4096+row*420+(rand()-.5)*70;if(Math.hypot(x-4096,y-4096)<340)continue;
  object('house',x,y,{asset:rand()<.4?'house-abandoned':'house-plaster',name:'Дачный дом',doorOpen:false});
  object('chest',x+6,y,{asset:'crate',name:'Ящик с припасами',stock:Array.from({length:2+(rand()*3|0)},()=>{const key=loot[rand()*loot.length|0];return {key,qty:[KEYS.fishing,KEYS.shovel].includes(key)?1:1+(rand()*3|0)};})});
  if(rand()<.45)object('garden',x+95,y+75,{asset:'garden_bed',name:'Грядка',crop:'carrot',growth:100});
  actor(rand()<.17?'bandit':'infected',x+125,y+90,{skin:String(1+(rand()*6|0)).padStart(2,'0')+'-'+['A','B','C'][rand()*3|0],name:'Заражённый',health:45+zone*5});
 }
 for(let i=0;i<160;i++){const x=2600+rand()*3000,y=2600+rand()*3000;if(Math.hypot(x-4096,y-4096)<260)continue;if(objects.some(o=>o.kind==='house'&&Math.abs(o.x-x)<130&&Math.abs(o.y-y)<110))continue;object(i%4===0?'bush':'tree',x,y,{asset:i%4===0?'bush_small':i%3===0?'tree_deciduous':'tree_conifer',name:i%4===0?'Ягодный куст':'Дерево',stock:[]});}
 for(let i=0;i<12;i++)actor(i%4===0?'wolf':i%5===0?'bear':'hare',3050+rand()*1200,3050+rand()*600,{skin:i%4===0?'wolf':i%5===0?'brown_bear':'hare',name:i%4===0?'Волк':i%5===0?'Медведь':'Заяц'});
 return {objects,actors};
}
export function inHouse(p,o){return o.halfW?villageInside(p,o):o.kind==='house'&&Math.abs(p.x-o.x)<48&&Math.abs(p.y-o.y)<36;}
export function blocked(p,objects){return objects.some(o=>{
  if(o.halfW||o.houseId||o.kind==='gate'||o.solid)return villageObstacle(p,o);
  if(o.kind==='tree'&&!o.used)return Math.hypot(p.x-o.x,p.y-o.y)<10;
  if(o.kind==='barricade'&&o.condition>0)return Math.abs(p.x-o.x)<39&&Math.abs(p.y-o.y)<13;
  if(o.kind!=='house')return false;const x=Math.abs(p.x-o.x),y=p.y-o.y;
  return x<59&&Math.abs(y)<47&&(x>43||y<-31||y>29&&(!o.doorOpen||x>16));
 });}
export function moveWorld(p,screenDx,screenDy,objects,speedFactor=1){const delta=unproject(screenDx,screenDy),dx=delta.x*speedFactor,dy=delta.y*speedFactor,n=Math.max(1,Math.ceil(Math.hypot(dx,dy)/3));let {x,y}=p;for(let i=0;i<n;i++){if(!blocked({x:x+dx/n,y},objects))x=clamp(x+dx/n,32,8160);if(!blocked({x,y:y+dy/n},objects))y=clamp(y+dy/n,32,8160);}return {x,y};}
export function actorTick(a,dt,player,world,inv,rng,damage){
 a.elapsed+=dt*1000;if(a.lureLeft>0&&!a.dead){a.lureLeft-=dt;moveToward(a,{x:a.lureX,y:a.lureY},dt,55,world.objects,world.villageMode?world.seed:null);return;}a.cooldown=Math.max(0,a.cooldown-dt);a.alert=Math.max(0,a.alert-dt);if(a.dead){a.action='death';return;}const d=distance(a,player),hostile=['infected','bandit','wolf','bear'].includes(a.kind);
 if(!hostile){if(a.kind==='friendly'&&a.recruited){const target=world.actors.find(b=>!b.dead&&['infected','bandit','wolf','bear'].includes(b.kind)&&distance(a,b)<300&&visibleBetween(a,b,world.objects));if(target&&a.cooldown<=0){target.health-=18;a.cooldown=1.3;if(target.health<=0){target.health=0;target.dead=true;target.elapsed=0;}}if(d>85)moveToward(a,player,dt,60,world.objects,world.villageMode?world.seed:null);}else if(a.kind==='hare'&&d<150){moveToward(a,{x:a.x+(a.x-player.x),y:a.y+(a.y-player.y)},dt,100,world.objects,world.villageMode?world.seed:null);}else a.action='idle';return;}
 const noise=player.action==='run'?250:player.crouched?65:140,stealth=world.perks.includes('quiet')?.7:1,vision=(world.darkness>.4?180:310)*stealth;
 if((d<vision&&visibleBetween(a,player,world.objects)||d<noise*stealth)||a.alert>0){a.alert=4;if(a.kind==='bandit'&&d<260&&a.cooldown<=0&&visibleBetween(a,player,world.objects)){damage(14,'bullet');a.cooldown=2;a.action='attack';}
  else if(d<36&&a.cooldown<=0&&visibleBetween(a,player,world.objects)){damage(a.kind==='bear'?28:a.kind==='wolf'?14:10,'melee');a.cooldown=1.2;a.action='attack';}
  else if(d>30&&(a.action!=='attack'||a.cooldown<.75)){moveToward(a,player,dt,a.kind==='wolf'?95:a.kind==='bear'?70:player.action==='run'?65:48,world.objects,world.villageMode?world.seed:null);}
 }else if(a.cooldown<=0&&distance(a,{x:a.homeX,y:a.homeY})>20)moveToward(a,{x:a.homeX,y:a.homeY},dt,24,world.objects,world.villageMode?world.seed:null);else a.action='idle';
}
function moveToward(a,target,dt,speed,objects,seed=null){const collides=p=>seed===null?blocked(p,objects):villageBlocked(p,objects,seed);const dx=target.x-a.x,dy=target.y-a.y,len=Math.max(1,Math.hypot(dx,dy));const sx=(dx-dy)*.9,sy=(dx+dy)*.55;a.direction=Math.abs(sx)>Math.abs(sy)?sx>0?'east':'west':sy>0?'south':'north';const p={x:a.x+dx/len*speed*dt,y:a.y+dy/len*speed*dt};if(!collides(p)){a.x=p.x;a.y=p.y;a.action='run';}else{const side={x:a.x-dy/len*speed*dt,y:a.y+dx/len*speed*dt};if(!collides(side)){a.x=side.x;a.y=side.y;}a.action='walk';}}
