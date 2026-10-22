import {makeRandom,blocked} from './survival-world.mjs';
export const RAID_ENTRY={x:4096,y:4590};
export function generateRaid(seed,location,catalog){
 const rnd=makeRandom(seed),defs=new Map(catalog.map(d=>[d.key,d])),objects=[],actors=[];let oid=0,aid=0;
 const object=(kind,x,y,extra={})=>{const o={id:'r'+ ++oid,kind,x,y,condition:100,stock:[],...extra};objects.push(o);return o;};
 const actor=(kind,x,y,skin)=>actors.push({id:'e'+ ++aid,kind,x,y,homeX:x,homeY:y,health:kind==='bear'?100:kind==='bandit'?70:40+location.threat*4,maxHealth:kind==='bear'?100:kind==='bandit'?70:40+location.threat*4,action:'idle',direction:['north','east','south','west'][rnd()*4|0],elapsed:0,cooldown:0,alert:0,dead:false,looted:false,skin,name:kind==='infected'?'Заражённый':kind==='bandit'?'Мародёр':kind==='wolf'?'Волк':kind==='bear'?'Медведь':'Заяц'});
 const food=['item/food-canned-food','item/food-water-bottle','item/food-rusks','item/medicine-water-bandage'];
 const junk=['item/materials-cloth','item/materials-scrap','item/resource-harvest-boards','item/materials-duct-tape','item/materials-wire','item/electricity-batteries','item/transport-toolbox'];
 const gear=catalog.filter(d=>d.slot&&d.slot!=='weapon'&&d.slot!=='hand').map(d=>d.key);
 const themes={forest:['item/weapons-axe','item/weapons-knife','item/gloves-tools-fishing-rod',...food],village:[...food,...gear],town:[...food,'ammo/pistol@closed',...junk],industrial:[...junk,'item/transport-fuel-can','item/transport-car-battery','item/tools-crowbar'],clinic:['item/medicine-water-kit-medium','item/medicine-water-kit-large','item/medicine-water-painkillers',...food],military:['weapon/ak74','weapon/pm','weapon/izh-27','ammo/rifle@closed','ammo/shotgun@closed',...gear]};
 const pick=(rare=false)=>{const pool=rare?['item/electricity-accumulator','item/transport-car-battery','item/transport-toolbox',...themes[location.type]]:[...food,...junk,...themes[location.type]],key=pool[rnd()*pool.length|0],d=defs.get(key);if(!d)throw Error('Unregistered raid item '+key);return {key,qty:d.maxStack===1?1:d.category==='ammo'?8+(rnd()*13|0):1+(rnd()*2|0),loaded:0,...(d.slot?{condition:35+rnd()*55,charge:40+rnd()*60}:{}),...(d.slot==='backpack'?{contents:[]}:{} )};};
 object('extraction',RAID_ENTRY.x,RAID_ENTRY.y,{asset:'direction-sign',name:'Путь в лагерь'});
 object('chest',4138,4535,{asset:'crate',name:'Брошенный схрон',stock:[{key:'item/resource-harvest-boards',qty:4,loaded:0},{key:'item/food-canned-food',qty:2,loaded:0}]});
 const n=location.type==='forest'?5:location.type==='industrial'?15:12;
 for(let i=0;i<n;i++){const col=i%4,row=Math.floor(i/4),x=3700+col*245+(rnd()-.5)*50,y=3650+row*245+(rnd()-.5)*45,industrial=location.type==='industrial'||location.type==='military';object('house',x,y,{asset:industrial?'garage':rnd()<.4?'cottage-blue':'cottage-plaster',name:location.type==='clinic'?'Корпус амбулатории':industrial?'Складской корпус':'Жилой дом',doorOpen:rnd()<.3});object('chest',x-15,y+5,{asset:industrial?'crate-group':'crate',name:'Запасы внутри',stock:rnd()<.35?[]:[pick(),...(rnd()<.5?[pick()]:[])]});
 if(i%2===0){object('vehicle',x+98,y+95,{asset:industrial?'truck-flatbed':'car-sedan',name:'Багажник',fuel:0,condition:0,stock:rnd()<.5?[]:[pick()]});}
 actor(location.type==='military'&&i%3===0?'bandit':'infected',x+110,y+60,String(1+(rnd()*6|0)).padStart(2,'0')+'-'+['A','B','C'][rnd()*3|0]);}
 const secret=object('chest',3650+rnd()*850,3550+rnd()*600,{asset:'crate-group',name:'Скрытый тайник',secret:true,stock:[pick(true),pick(true),{key:'item/transport-car-battery',qty:2,loaded:0}]});
 if(location.id==='relay')secret.stock.push({key:'item/information-access-card',qty:1,loaded:0});
 for(let i=0;i<100;i++){const x=3520+rnd()*1180,y=3500+rnd()*1080;if(Math.hypot(x-RAID_ENTRY.x,y-RAID_ENTRY.y)<160||objects.some(o=>o.kind==='house'&&Math.abs(o.x-x)<140&&Math.abs(o.y-y)<125))continue;object(i%4===0?'bush':'tree',x,y,{asset:i%4===0?'bush_small':i%3===0?'birch-rich':'spruce-rich',name:i%4===0?'Ягоды':'Дерево'});}
 if(location.type==='forest')for(let i=0;i<8;i++)actor(i<2?'wolf':'hare',3550+rnd()*1000,3530+rnd()*650,i<2?'wolf':'hare');
 if(location.threat>=4)for(let i=0;i<4;i++)object('hazard',3750+rnd()*700,3600+rnd()*650,{asset:'gas-cylinders',name:'Токсичная утечка'});
 object('well',4390,4340,{asset:'well',name:'Насос'});
 return {seed,rng:seed,objects,actors,bounds:{left:3450,top:3400,right:4800,bottom:4700},raidMode:true,discovered:[],noise:[],clock:location.threat%3===0?22*60:9*60,weather:location.threat%3===0?'rain':'clear',weatherLeft:180,enabled:true,dead:false,elapsed:0,zone:location.level};
}
export function raidVisible(a,b,objects){const len=Math.hypot(a.x-b.x,a.y-b.y),steps=Math.max(1,Math.ceil(len/5));for(let i=1;i<steps;i++){const q={x:a.x+(b.x-a.x)*i/steps,y:a.y+(b.y-a.y)*i/steps};if(blocked(q,objects))return false;}return true;}
export function raidAI(a,dt,p,w,inv,damage){a.elapsed+=dt*1000;a.cooldown=Math.max(0,a.cooldown-dt);a.alert=Math.max(0,a.alert-dt);if(a.dead){a.action='death';return;}const d=Math.hypot(p.x-a.x,p.y-a.y);if(a.kind==='hare'){if(d<140)move(a,{x:a.x+(a.x-p.x),y:a.y+(a.y-p.y)},dt,105,w.objects);else a.action='idle';return;}
 if(a.lureLeft>0){a.lureLeft-=dt;move(a,{x:a.lureX,y:a.lureY},dt,50,w.objects);return;}
 const angle={north:-Math.PI/2,south:Math.PI/2,east:0,west:Math.PI}[a.direction],delta=Math.atan2(p.y-a.y,p.x-a.x)-angle,cone=Math.cos(delta)>.32,vision=(w.darkness>.3?170:260)*(p.crouched?.58:1),heard=d<(p.action==='run'?190:p.crouched?24:p.action==='walk'?70:12),seen=cone&&d<vision&&raidVisible(a,p,w.objects);
 if(seen||heard){a.alert=5;a.lastX=p.x;a.lastY=p.y;}else if(a.alert>0&&a.lastX===undefined){a.lastX=p.x;a.lastY=p.y;}
 if(a.alert>0){const target={x:a.lastX??p.x,y:a.lastY??p.y};if(a.kind==='bandit'&&d<250&&seen&&a.cooldown<=0){damage(12,'bullet');a.cooldown=1.7;a.action='attack';}
 else if(d<32&&(seen||heard)&&a.cooldown<=0){damage(a.kind==='wolf'?15:9,'melee');a.cooldown=1.2;a.action='attack';}else if(a.cooldown<.75){if(Math.hypot(target.x-a.x,target.y-a.y)>12)move(a,target,dt,a.kind==='wolf'?95:58,w.objects);else a.action='idle';}}
 else if(Math.hypot(a.x-a.homeX,a.y-a.homeY)>50)move(a,{x:a.homeX,y:a.homeY},dt,24,w.objects);else{a.action='idle';if(a.cooldown===0){a.cooldown=3;a.direction=['south','west','east','north'][Math.floor(w.elapsed/3+Number(a.id.slice(1)))%4];}}
}
function move(a,b,dt,speed,objects){const dx=b.x-a.x,dy=b.y-a.y,len=Math.max(1,Math.hypot(dx,dy));a.direction=Math.abs(dx)>Math.abs(dy)?dx>0?'east':'west':dy>0?'south':'north';const x=a.x+dx/len*dt*speed,y=a.y+dy/len*dt*speed;if(!blocked({x,y},objects)){a.x=x;a.y=y;}else if(!blocked({x,y:a.y},objects))a.x=x;else if(!blocked({x:a.x,y},objects))a.y=y;a.action=speed>50?'run':'walk';}
