import {dressDistrict} from './northern-dachas-details.mjs';
export const MAP_ID='northern-dachas-v1';
export const BOUNDS={x:800,y:400,w:6400,h:5400};
export const SPAWN={x:4740,y:4740};
export const PLAYER_RADIUS=7;
export const PROJECTION={x:.9,y:.55};
export const project=(x,y)=>({x:(x-y)*PROJECTION.x,y:(x+y)*PROJECTION.y});
export const unproject=(x,y)=>({x:x/(2*PROJECTION.x)+y/(2*PROJECTION.y),y:y/(2*PROJECTION.y)-x/(2*PROJECTION.x)});
const random=n=>{let x=(n+0x9e3779b9)>>>0;x=Math.imul(x^(x>>>16),0x21f0aaad);x=Math.imul(x^(x>>>15),0x735a2d97);return ((x^(x>>>15))>>>0)/4294967296;};
const names=[['Северные участки','Берёзовая улица','Старые дачи','Яблоневые сады'],['Заброшенные участки','Дачные сараи','Южный въезд','Тепличный сектор']];
const sectorColumns=[0,3,5,8,10];
export const SECTORS=names.flatMap((row,r)=>row.map((name,c)=>({id:r*4+c,name,x:1800+sectorColumns[c]*420,y:900+r*1680,w:(sectorColumns[c+1]-sectorColumns[c])*420,h:1680})));
export const PLOTS=[],OBJECTS=[],FENCES=[],GATES=[],ROADS=[],LANDMARKS=[];
const object=(id,asset,x,y,w,h,solid=null,extra={})=>{const o={id,asset,x,y,w,h,solid,...extra};OBJECTS.push(o);return o;};
for(let r=0;r<=8;r++)ROADS.push({id:'lane-h-'+r,kind:'soil',width:r===4?76:60,points:[[1720,900+r*420],[6080,900+r*420]]});
for(let c=0;c<=10;c++)ROADS.push({id:'lane-v-'+c,kind:'soil',width:c===7?88:60,points:[[1800+c*420,800],[1800+c*420,4340]]});
ROADS.push({id:'main-entrance',kind:'gravel',width:90,points:[[4740,4260],[4740,4840],[4830,5000]]});
ROADS.push({id:'ring-road',kind:'asphalt',width:128,points:[[850,5000],[1800,4920],[3100,5010],[4830,5000],[6200,4870],[7150,4900]]});
ROADS.push({id:'forest-exit',kind:'soil',width:45,points:[[2220,900],[2220,680],[1790,570]]});
ROADS.push({id:'riverside-path',kind:'gravel',width:40,points:[[1800,4260],[1550,4380],[1490,4740],[1600,4930]]});
function fence(id,x,y,length,axis,gap=false){
 const step=70,n=Math.ceil(length/step),size=length/n;
 for(let i=0;i<n;i++){if(gap&&i===Math.floor(n/2))continue;FENCES.push({id:id+'-'+i,x:x+(axis==='x'?(i+.5)*size:0),y:y+(axis==='y'?(i+.5)*size:0),length:size,axis});}
}
for(let r=0;r<8;r++)for(let c=0;c<10;c++){
 const i=r*10+c,id='plot-'+String(i+1).padStart(2,'0'),x=1838+c*420,y=944+r*420,w=342,h=326;
 const sector=SECTORS[Math.floor(r/4)*4+Math.min(3,Math.floor(c/2.5))];
 const plot={id,index:i,row:r,col:c,x,y,w,h,sectorId:sector.id,hasHouse:i%4!==0,entrance:{x:x+w/2,y:y+h+16}};PLOTS.push(plot);
 fence(id+'-n',x,y,w,'x');fence(id+'-w',x,y,h,'y');fence(id+'-e',x+w,y,h,'y');fence(id+'-s',x,y+h,w,'x',true);
 if(i%5===1)GATES.push({id:'gate-'+i,plotId:id,x:x+w/2,y:y+h,length:70});
 if(plot.hasHouse){const asset=sector.name==='Заброшенные участки'?'house-abandoned':i%3===1?'house-plaster':'house';object(id+'-house',asset,x+174,y+118,235,205,{w:124,h:92},{type:'building',plotId:id,sectorId:sector.id});}
 if(i%2===0)object(id+'-shed','garage',x+67,y+65,117,105,{w:70,h:48},{type:'building',plotId:id});
 if(sector.name==='Тепличный сектор'||i%7===0)object(id+'-greenhouse','greenhouse',x+262,y+218,150,116,{w:78,h:56},{type:'building',plotId:id});
 for(let b=0;b<(sector.name==='Тепличный сектор'?3:2);b++)object(id+'-bed-'+b,'garden_bed',x+66+b*88,y+230,80,48,{w:48,h:25},{type:'garden',plotId:id});
 object(id+'-barrel','barrel',x+230,y+125,26,38,{w:16,h:15},{plotId:id});
 if(i%3===0)object(id+'-crate','crate',x+251,y+94,30,30,{w:20,h:18},{plotId:id});
 if(i%3===1)object(id+'-bench','bench',x+250,y+285,60,44,{w:40,h:18},{plotId:id});
 if(i%2===1)object(id+'-boards','boards',x+75,y+135,65,37,null,{plotId:id});
 if(sector.name==='Заброшенные участки')object(id+'-rubble','rubble',x+194,y+260,66,39,null,{plotId:id});
 if(sector.name==='Яблоневые сады'||i%5===0)object(id+'-apple','tree-apple',x+80,y+175,160,172,{w:13,h:13},{type:'tree',plotId:id});
 if(sector.name==='Берёзовая улица'||i%7===1)object(id+'-birch','tree_deciduous',x+306,y+56,115,210,{w:12,h:12},{type:'tree',plotId:id});
 for(let b=0;b<5;b++)object(id+'-bush-'+b,'bush_small',x+14+random(i*91+b)*310,y+13+random(i*73+b+803)*90,44+random(i+b)*20,34+random(i+b+80)*16,null,{type:'vegetation'});
 for(let b=0;b<30;b++){
  const edge=b%4;let gx=x+8+random(i*51+b+230)*326,gy=y+10+random(i*61+b+1100)*302;
  if(b<24){if(edge===0)gy=y+7;if(edge===1)gy=y+h-9;if(edge===2)gx=x+8;if(edge===3)gx=x+w-9;}
  if(Math.abs(gx-(x+w/2))<45&&gy>y+h-35)gy=y+14;
  object(id+'-grass-'+b,'grass_tall',gx,gy,25+random(i+b+6)*16,25+random(i+b+83)*14,null,{type:'vegetation'});
 }
 if(!plot.hasHouse||sector.name==='Яблоневые сады')object(id+'-orchard-tree','tree-apple',x+190,y+85,140,155,{w:13,h:13},{type:'tree',plotId:id});
}
for(const f of FENCES){const plot=PLOTS.find(p=>f.id.startsWith(p.id+'-'));f.asset=plot&&plot.sectorId===7?'fence_mesh':'fence_wood';}
for(let c=0;c<10;c++)for(let r=0;r<3;r++)object('pole-'+c+'-'+r,'utility_pole',1800+c*420+20,916+r*1260,58,170,{w:10,h:10},{type:'pole'});
for(let i=0;i<16;i++){const x=1860+random(i+7800)*4080,y=900+(i%9)*420+random(i+80)*15;object('lane-puddle-'+i,'puddle',x,y,70+random(i)*50,30,null,{type:'ground'});}
for(let i=0;i<8;i++)object('car-'+i,'car_abandoned',1880+i*580,4880+Math.sin(i)*15,135,88,{w:80,h:40},{type:'vehicle'});
for(let i=0;i<720;i++){
 let x=1100+random(i+3000)*5450,y=500+random(i+6000)*4200;
 if(x>1690&&x<6160&&y>740&&y<4420)continue;
 if(y<760&&x>2050&&x<2350)continue;
 if(x<riverBank(y)+50)continue;
 const asset=i%4===0?'tree_deciduous':'tree_conifer';object('forest-'+i,asset,x,y,asset==='tree_conifer'?120:110,175+random(i+480)*65,{w:12,h:12},{type:'tree'});
}
object('communal-well','well',3900,2780,90,105,{w:48,h:45},{type:'landmark'});
LANDMARKS.push({id:'communal-well',name:'Общий колодец',x:3900,y:2780});
LANDMARKS.push({id:'south-entry',name:'Южный въезд',x:SPAWN.x,y:SPAWN.y});
LANDMARKS.push({id:'forest-trail',name:'Лесная тропа',x:2220,y:690});
export function riverBank(y){return 1270+Math.sin(y/430)*85+Math.sin(y/177)*35;}
export function sectorAt(p){return SECTORS.find(s=>p.x>=s.x&&p.x<s.x+s.w&&p.y>=s.y&&p.y<s.y+s.h)??null;}
export function createDistrictState(saved){return {mapId:MAP_ID,openedGates:saved?.mapId===MAP_ID?[...new Set((saved.openedGates??[]).filter(id=>GATES.some(g=>g.id===id)))]:[]};}
export const {decals:DECALS,wires:WIRES}=dressDistrict({PLOTS,OBJECTS,FENCES,LANDMARKS,riverBank});
const bins=new Map(),colliders=[];
function register(rect){colliders.push(rect);for(let y=Math.floor(rect.y/128);y<=Math.floor((rect.y+rect.h)/128);y++)for(let x=Math.floor(rect.x/128);x<=Math.floor((rect.x+rect.w)/128);x++){const key=x+','+y;if(!bins.has(key))bins.set(key,[]);bins.get(key).push(rect);}}
for(const o of OBJECTS)if(o.solid)register({id:o.id,x:o.x-o.solid.w/2,y:o.y-o.solid.h/2,w:o.solid.w,h:o.solid.h});
for(const f of FENCES)register({id:f.id,x:f.x-(f.axis==='x'?f.length/2:3),y:f.y-(f.axis==='y'?f.length/2:3),w:f.axis==='x'?f.length:6,h:f.axis==='y'?f.length:6});
export const COLLIDERS=colliders;
const overlap=(p,r,pad=PLAYER_RADIUS)=>p.x+pad>r.x&&p.x-pad<r.x+r.w&&p.y+pad>r.y&&p.y-pad<r.y+r.h;
export function blocked(p,state){
 if(p.x<BOUNDS.x||p.x>BOUNDS.x+BOUNDS.w||p.y<BOUNDS.y||p.y>BOUNDS.y+BOUNDS.h)return true;
 if(p.x<riverBank(p.y)+24&&Math.abs(p.y-5000)>62)return true;
 for(let y=Math.floor((p.y-PLAYER_RADIUS)/128);y<=Math.floor((p.y+PLAYER_RADIUS)/128);y++)for(let x=Math.floor((p.x-PLAYER_RADIUS)/128);x<=Math.floor((p.x+PLAYER_RADIUS)/128);x++)for(const r of bins.get(x+','+y)??[])if(overlap(p,r))return true;
 return GATES.some(g=>!state.openedGates.includes(g.id)&&overlap(p,{x:g.x-g.length/2,y:g.y-4,w:g.length,h:8}));
}
export function moveInDistrict(p,screenDx,screenDy,state){
 const delta=unproject(screenDx,screenDy),steps=Math.max(1,Math.ceil(Math.hypot(delta.x,delta.y)/3));let x=p.x,y=p.y;
 for(let i=0;i<steps;i++){const nx=x+delta.x/steps,ny=y+delta.y/steps;if(!blocked({x:nx,y},state))x=nx;if(!blocked({x,y:ny},state))y=ny;}
 return {x,y};
}
export function safePosition(saved,state){
 if(saved&&Number.isFinite(saved.x)&&Number.isFinite(saved.y)&&!blocked(saved,state))return {x:saved.x,y:saved.y};
 return {...SPAWN};
}
export function nearbyGate(p){return GATES.filter(g=>Math.hypot(g.x-p.x,g.y-p.y)<75).sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y))[0]??null;}
export function toggleGate(p,state){const gate=nearbyGate(p);if(!gate)return null;const index=state.openedGates.indexOf(gate.id);if(index<0)state.openedGates.push(gate.id);else{if(overlap(p,{x:gate.x-gate.length/2,y:gate.y-4,w:gate.length,h:8},PLAYER_RADIUS+3))return 'Отойди от проёма, чтобы закрыть ворота.';state.openedGates.splice(index,1);}return index<0?'Ворота открыты':'Ворота закрыты';}
export function roadDistance(p,road){let best=Infinity;for(let i=1;i<road.points.length;i++){const a=road.points[i-1],b=road.points[i],dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((p.x-a[0])*dx+(p.y-a[1])*dy)/(dx*dx+dy*dy)));best=Math.min(best,Math.hypot(p.x-a[0]-dx*t,p.y-a[1]-dy*t));}return best;}
