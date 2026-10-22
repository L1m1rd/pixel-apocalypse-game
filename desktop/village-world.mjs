import {housePoint,houseLocal,doorNormal,rotateSolid,quarterTurn} from './object-facing.mjs';
// One persistent district: no lobby, extraction timer or reset on entering a house.
export const VILLAGE_ID='northern-dachas-survival-v2';
export const VILLAGE_BOUNDS={left:800,top:400,right:7200,bottom:5800};
export const VILLAGE_SPAWN={x:4100,y:4590};
export const VILLAGE_SECTORS=[
 {id:'north',name:'Северные участки',x:3170,y:2430},
 {id:'birch',name:'Берёзовая улица',x:4340,y:2630},
 {id:'old',name:'Старые дачи',x:3820,y:4180},
 {id:'orchard',name:'Яблоневые сады',x:5490,y:3090},
 {id:'abandoned',name:'Заброшенные участки',x:2890,y:3650},
 {id:'sheds',name:'Дачные сараи',x:2860,y:4770},
 {id:'south',name:'Южный въезд',x:4430,y:5230},
 {id:'greenhouse',name:'Тепличный сектор',x:5500,y:4580}
];
const rng=seed=>{let n=seed>>>0;return()=>((n=(Math.imul(n,1664525)+1013904223)>>>0)/4294967296);};
export const roadDistance=(p,road)=>{let d=Infinity;for(let i=1;i<road.points.length;i++){const a=road.points[i-1],b=road.points[i],dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((p.x-a[0])*dx+(p.y-a[1])*dy)/(dx*dx+dy*dy)));d=Math.min(d,Math.hypot(p.x-a[0]-dx*t,p.y-a[1]-dy*t));}return d;};
export function villageSector(p){return VILLAGE_SECTORS.reduce((a,b)=>Math.hypot(p.x-a.x,p.y-a.y)<Math.hypot(p.x-b.x,p.y-b.y)?a:b).name;}
export function footprint(h){const w=h.halfW??76,hh=h.halfH??62;return quarterTurn(h.orientation)%2?{w:hh,h:w}:{w,h:hh};}
export function villageInside(p,h){if(h.kind!=='house')return false;const q=houseLocal(p,h);return Math.abs(q.x)<(h.halfW??76)-7&&Math.abs(q.y)<(h.halfH??62)-7;}
export function villageDoor(h){return housePoint(h,h.doorOffset??0,h.halfH??62);}
export function villageWalls(o){const w=o.halfW??76,h=o.halfH??62,d=o.doorOffset??0,local=[{x:-w,y:-h,w:w*2,h:7},{x:-w,y:-h,w:7,h:h*2},{x:w-7,y:-h,w:7,h:h*2},...(o.doorOpen?[{x:-w,y:h-7,w:d-23+w,h:7},{x:d+23,y:h-7,w:w-d-23,h:7}]:[{x:-w,y:h-7,w:w*2,h:7}])];return local.map(r=>{const q=housePoint(o,r.x+r.w/2,r.y+r.h/2),size=rotateSolid(r,o.orientation);return {x:q.x-size.w/2,y:q.y-size.h/2,w:size.w,h:size.h};});}
export function villageObstacle(p,o,pad=6){
 if(o.kind==='house'){const r=footprint(o);if(Math.abs(p.x-o.x)>r.w+pad||Math.abs(p.y-o.y)>r.h+pad)return false;return villageWalls(o).some(r=>p.x+pad>r.x&&p.x-pad<r.x+r.w&&p.y+pad>r.y&&p.y-pad<r.y+r.h);}
 if(o.kind==='tree')return !o.used&&Math.hypot(p.x-o.x,p.y-o.y)<(o.radius??9)+pad;
 if(o.kind==='gate')return !o.doorOpen&&Math.abs(p.x-o.x)<o.w/2+pad&&Math.abs(p.y-o.y)<4+pad;
 if(o.solid)return Math.abs(p.x-o.x)<o.solid.w/2+pad&&Math.abs(p.y-o.y)<o.solid.h/2+pad;
 return false;
}
const cache=new Map();
export function villageScenery(seed=1){
 if(cache.has(seed))return cache.get(seed);const random=rng(87041),plots=[],roads=[],decor=[],fences=[],objects=[],actors=[],wires=[];let id=0;
 const obj=(kind,asset,x,y,extra={})=>{const v={id:'v'+ ++id,kind,asset,x,y,condition:100,used:false,stock:[],...extra};objects.push(v);return v;};
 roads.push({width:65,kind:'path-rich',points:[[4120,700],[4120,1960],[4060,2600],[4130,3270],[4100,3910],[4100,4590],[4230,5170],[4380,5730]]});
 roads.push({width:58,kind:'path-rich',points:[[2230,4700],[2850,4600],[3440,4600],[4100,4590],[4800,4660],[5510,4800],[6190,4760]]});
 roads.push({width:48,kind:'path-rich',points:[[2460,2860],[3150,2880],[4060,2900],[4820,3060],[5580,3330],[6030,3690]]});
 roads.push({width:44,kind:'path-rich',points:[[2830,2350],[2840,3130],[2820,3850],[2850,4600],[2900,5400]]});
 roads.push({width:43,kind:'path-rich',points:[[5500,2660],[5500,3510],[5480,4220],[5510,4800],[5430,5490]]});
 roads.push({width:103,kind:'asphalt',points:[[1150,5660],[2180,5700],[2900,5650],[3650,5700],[4380,5730],[5220,5690],[7050,5670]]});
 roads.push({width:51,kind:'path-rich',points:[[1330,1380],[2540,1360],[4120,1380],[5500,1420],[6750,1490]]});
 roads.push({width:45,kind:'path-rich',points:[[1740,1380],[1800,2730],[1810,4140],[1820,5680]]});
 const placements=[
 ['old',3890,4830],['old',4290,4350],['old',3800,3450],['old',4500,4890],['old',3720,3950],['old',4420,3860],
 ['north',3100,2490],['north',3500,2550],['north',3100,3100],['north',3540,3200],['north',3810,2370],
 ['birch',4450,2420],['birch',4840,2590],['birch',4410,3090],['birch',4910,3380],['birch',4460,3470],
 ['orchard',5210,2900],['orchard',5830,2980],['orchard',5150,3440],['orchard',5850,3530],
 ['abandoned',2500,3350],['abandoned',3100,3590],['abandoned',2460,3900],['abandoned',3140,4050],['abandoned',3460,3680],
 ['sheds',2510,4450],['sheds',3180,4380],['sheds',2490,4960],['sheds',3160,5030],['sheds',3500,5340],
 ['south',3910,5350],['south',4610,5390],['south',4890,5660],['south',4250,5590],
 ['greenhouse',5130,4090],['greenhouse',5830,4050],['greenhouse',5110,4510],['greenhouse',5870,4500],['greenhouse',5200,5070],['greenhouse',5810,5230]
 ];
 // Preserve the original district's eighty plots and full 6400 × 5400 extent.
 for(let row=0;row<12&&placements.length<80;row++)for(let col=0;col<14&&placements.length<80;col++){
  const x=1370+col*410+(random()-.5)*25,y=950+row*410+(random()-.5)*25;
  if(x>6800||y>5350||placements.some(([,xx,yy])=>Math.abs(x-xx)<377&&Math.abs(y-yy)<372)||roads.some(r=>roadDistance({x,y},r)<175))continue;
  const sector=VILLAGE_SECTORS.reduce((a,b)=>Math.hypot(x-a.x,y-a.y)<Math.hypot(x-b.x,y-b.y)?a:b);placements.push([sector.id,x,y]);
 }
 const houses=['cottage-rich-grey','cottage-rich-blue','cottage-plaster','cottage-collapsed','house-abandoned','house-plaster'];
 const vehicles=['truck-canvas','van-blue','pickup-red','car-sedan','truck-flatbed','car_abandoned'];
 const plants=['grass-green','grass-yellow','grass-white','grass-nettle','grass-clover','grass-violet','grass-golden'];
 const shrubs=['thicket-bramble','thicket-fern','thicket-flower','thicket-sapling','wild-rose','hazel'];
 const props=['wood-shelter','workbench-tools','rain-barrel-group','crate-group','salvage-boards','gas-cylinders','tool-rack','compost-box','pallet-aged','boiler-rusty','water-tank','wheelbarrow','tire-stack','plant-pots','roof-debris','brick-debris'];
 const deco=(asset,x,y,w,h,extra={})=>decor.push({asset,x,y,w,h,mirror:((Math.round(x)*13+Math.round(y)*7)&1)===1,...extra});
 function fence(x1,y1,x2,y2){const len=Math.hypot(x2-x1,y2-y1),n=Math.ceil(len/40);for(let k=0;k<n;k++){const a={x:x1+(x2-x1)*k/n,y:y1+(y2-y1)*k/n},b={x:x1+(x2-x1)*(k+1)/n,y:y1+(y2-y1)*(k+1)/n};fences.push({a,b,height:26+random()*3,missing:random()<.035});}}
 const loot=['item/food-canned-food','item/food-water-bottle','item/medicine-water-bandage','item/materials-cloth','item/materials-duct-tape','ammo/pistol@closed','item/materials-scrap','item/resource-harvest-boards'];
 for(const [i,[sector,x,y]]of placements.entries()){
  const px=x-190,py=y-150,pw=340+random()*28,ph=315+random()*30;
  const plot={id:'yard-'+i,index:i,sector,x:px,y:py,w:pw,h:ph};plots.push(plot);
  const house=obj('house',houses[i%houses.length],x,y,{name:'Дача №'+(i+1)+' · '+VILLAGE_SECTORS.find(s=>s.id===sector).name,halfW:76,halfH:62,doorOffset:-8,doorOpen:i<2,sectorId:sector,layout:i%4,orientation:i%4,variantIndex:i%houses.length,visualW:250+random()*16,visualH:195+random()*20});plot.house=house;
  const door=villageDoor(house);let nearest=roads.slice(0,5).reduce((a,b)=>roadDistance(door,a)<roadDistance(door,b)?a:b);let q=null,best=Infinity;const mouth={x:door.x,y:py+ph+28};for(let n=1;n<nearest.points.length;n++){const a=nearest.points[n-1],b=nearest.points[n],dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((mouth.x-a[0])*dx+(mouth.y-a[1])*dy)/(dx*dx+dy*dy))),v=[a[0]+dx*t,a[1]+dy*t],d=Math.hypot(mouth.x-v[0],mouth.y-v[1]);if(d<best){best=d;q=v;}}
  // Each yard opens south, with a footpath that joins its nearby lane.
  const normal=doorNormal(house),beyond=[door.x+normal.x*26,door.y+normal.y*26],exit=[door.x,py+ph+28],side=x+footprint(house).w+34;const path=house.orientation===2?[[door.x,door.y],beyond,[side,beyond[1]],[side,exit[1]],exit,q]:house.orientation===1||house.orientation===3?[[door.x,door.y],beyond,[beyond[0],exit[1]],exit,q]:[[door.x,door.y],beyond,exit,q];roads.push({width:26,kind:'path-rich',yard:true,points:path});
  fence(px,py,px+pw,py);fence(px,py,px,py+ph);fence(px+pw,py,px+pw,py+ph);fence(px,py+ph,door.x-28,py+ph);fence(door.x+28,py+ph,px+pw,py+ph);
  if(i%3===0)obj('gate','gate-plane',door.x,py+ph,{name:'Калитка дачи №'+(i+1),w:52,doorOpen:true});
  const items=[{asset:'wardrobe',dx:-49,dy:-34,w:40,h:66,solid:{w:25,h:20}},{asset:'bed',dx:43,dy:-30,w:58,h:43,solid:{w:30,h:42}},{asset:'table',dx:43,dy:23,w:45,h:38,solid:{w:25,h:23}},{asset:'stove',dx:-47,dy:15,w:35,h:51,solid:{w:23,h:24}}];
  if(i%2===1)items[2]={asset:'shelves',dx:44,dy:21,w:40,h:61,solid:{w:20,h:25}};
  for(const [j,f]of items.entries()){const point=housePoint(house,f.dx,f.dy);obj(j===0||j===2?'chest':'furniture',f.asset,point.x,point.y,{orientation:(house.orientation+(f.asset==='bed'?1:f.asset==='stove'?2:0))%4,name:j===0?'Шкаф с вещами':j===2?'Припасы на полке':f.asset==='bed'?'Кровать':'Печь',houseId:house.id,visualW:f.w,visualH:f.h,solid:rotateSolid(f.solid,house.orientation),stock:j===0||j===2?Array.from({length:1+i%3},(_,n)=>({key:loot[(i*3+j+n)%loot.length],qty:/ammo/.test(loot[(i*3+j+n)%loot.length])?6:1,loaded:0})):[]});}
  const cupboards=objects.filter(o=>o.houseId===house.id&&o.kind==='chest'),gear=['item/boots-greaves-boots-1','item/pants-1-v1','item/backpacks-helmet-helmet','item/masks-vests-vest-1','item/backpacks-helmet-pack-2','item/jackets-1-v1'],tools=['item/weapons-axe','item/tools-shovel','item/gloves-tools-fishing-rod','item/electricity-flashlight','item/transport-toolbox','item/electricity-batteries','item/medicine-water-kit-small'];
  if(i%2===0)cupboards[0].stock.push({key:gear[(i/2|0)%gear.length],qty:1,loaded:0,condition:45+(i*17)%55,charge:85,contents:[]});
  if(i%3===1||sector==='greenhouse')cupboards[1].stock.push({key:sector==='greenhouse'?'item/tools-shovel':tools[i%tools.length],qty:1,loaded:0,condition:55+(i*13)%45,charge:65});
  if(i%5===2||sector==='greenhouse')cupboards[1].stock.push({key:i%2?'item/seeds-potato':'item/seeds-carrot',qty:2,loaded:0});
  if(i%11===4){const guns=['weapon/pm','weapon/izh-27','weapon/ak74'],ammo=['ammo/pistol@closed','ammo/shotgun@closed','ammo/rifle@closed'],pick=(i/11|0)%3;cupboards[1].stock.push({key:guns[pick],qty:1,loaded:0,condition:50+(i*7)%50},{key:ammo[pick],qty:8,loaded:0});}
  if(i%3===0)obj('vehicle',vehicles[(i/3|0)%vehicles.length],px+62,py+ph-55,{orientation:(i/3|0)%4,variantIndex:(i/3|0)%vehicles.length,name:'Брошенный '+['грузовик','фургон','пикап','седан','бортовой грузовик','автомобиль'][(i/3|0)%6],visualW:140,visualH:94,solid:rotateSolid({w:66,h:38},(i/3|0)%4),condition:0,fuel:0,stock:i%2?[{key:loot[(i+1)%loot.length],qty:1,loaded:0}]:[]});
  if(i%2===0)deco(sector==='greenhouse'?'greenhouse-rich':'shed-rich',px+pw-64,py+ph-68,sector==='greenhouse'?143:103,sector==='greenhouse'?97:78,{solid:{w:65,h:45},caster:true});
  if(i%3===0)obj('bush','wild-rose',px+pw-24,py+ph-42,{name:'Ягодный куст',visualW:39,visualH:43});
  if(i%4===0||sector==='greenhouse')for(let b=0;b<(sector==='greenhouse'?3:2);b++)obj('garden','garden_bed',px+35+b*46,py+ph-87,{name:'Заросшая грядка',crop:i%2?'potato':null,growth:i%2?100:0,visualW:48,visualH:30});
  for(let j=0;j<7;j++){const xx=px+20+(j%3)*47,yy=py+25+Math.floor(j/3)*34,asset=props[(i*5+j)%props.length];deco(asset,xx,yy,32+random()*24,34+random()*28,{caster:true,solid:['roof-debris','brick-debris','salvage-boards','pallet-aged'].includes(asset)?null:{w:23,h:19}});}
  if(sector==='orchard')deco('ladder-orchard',x+112,y-40,36,70,{caster:true});
  for(let j=0;j<4;j++){const xx=j%2?px+pw-20:px+19,yy=py+35+Math.floor(j/2)*200;obj('tree',sector==='orchard'?'apple-rich':(i+j)%3===0?'spruce-rich':(i+j)%4===0?'birch-gold-rich':'birch-rich',xx,yy,{name:'Дерево',visualW:110+random()*42,visualH:145+random()*70,radius:8});}
  for(let j=0;j<170;j++){const xx=px+random()*pw,yy=py+random()*ph;if(Math.abs(xx-x)<89&&Math.abs(yy-y)<79||Math.abs(xx-door.x)<29&&yy>y+30||roads.some(r=>!r.yard&&roadDistance({x:xx,y:yy},r)<r.width/2+10))continue;const big=j%12===0;deco(big?shrubs[(i+j)%shrubs.length]:plants[(i*13+j)%plants.length],xx,yy,big?62+random()*25:16+random()*17,big?40+random()*28:18+random()*14,{hue:(i+j)%3,vegetation:true});}
  for(let j=0;j<8;j++){const xx=px+12+random()*(pw-24),yy=j<4?py+8:py+ph-10;if(Math.abs(xx-door.x)<35&&j>=4)continue;deco(shrubs[(i+j)%shrubs.length],xx,yy,57+random()*25,36+random()*23,{vegetation:true});}
  if(i%2===0){const pole=obj('scenery','utility_pole',px+pw+15,py+ph+18,{name:'Столб',visualW:38,visualH:150,solid:{w:8,h:8}});if(wires.length||i===0){const prev=objects.filter(o=>o.asset==='utility_pole').at(-2);if(prev)wires.push({a:prev,b:pole});}}
 }
 // Shared landmarks create recognizable, non-repeating places.
 obj('well','well',4190,4520,{name:'Общий колодец',visualW:66,visualH:77,solid:{w:28,h:26}});
 obj('chest','crate-group',4140,4620,{name:'Припасы у Южного въезда',visualW:30,visualH:32,stock:[{key:'item/food-canned-food',qty:1,loaded:0},{key:'item/food-water-bottle',qty:1,loaded:0},{key:'item/medicine-water-bandage',qty:2,loaded:0}]});
 obj('campfire','campfire',4000,4690,{name:'Старое кострище',visualW:38,visualH:28,burning:false,fuel:0});
 obj('pond',null,6050,3960,{name:'Заросший пруд',visualW:250,visualH:150});
 for(const [a,x,y,w,h]of [['playground-swing',3390,4820,96,86],['playground-slide',3460,4885,82,72],['playground-roundabout',3320,4915,70,45],['direction-sign',4170,4710,31,63],['fallen-birch',5900,3820,145,58],['dead-tree',6160,4060,50,130]])deco(a,x,y,w,h,{caster:true,solid:a.startsWith('playground')?{w:40,h:30}:null});
 for(let j=0;j<1800;j++){
  const x=1030+random()*5950,y=650+random()*4900;if(plots.some(p=>x>p.x-45&&x<p.x+p.w+45&&y>p.y-45&&y<p.y+p.h+45)||roads.some(r=>roadDistance({x,y},r)<r.width/2+28)||Math.hypot(x-6050,y-3960)<180)continue;
  const asset=j%5===0?'apple-rich':j%4===0?'birch-gold-rich':j%3===0?'birch-rich':'spruce-rich';obj('tree',asset,x,y,{name:'Дерево',visualW:100+random()*64,visualH:148+random()*75,radius:9});
  for(let n=0;n<7;n++)deco(n%3===0?shrubs[(j+n)%6]:plants[(j+n)%7],x+(random()-.5)*160,y+(random()-.5)*150,n%3===0?65:27,n%3===0?48:29,{vegetation:true});
 }
 // Road verges are planted continuously; only the walkable road stays open.
 for(const r of roads.filter(r=>!r.yard&&r.kind!=='asphalt'))for(let s=1;s<r.points.length;s++){
  const a=r.points[s-1],b=r.points[s],dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy);
  for(let k=0;k<len;k+=13)for(const sign of [-1,1]){const t=k/len,off=sign*(r.width/2+13+random()*25),x=a[0]+dx*t-dy/len*off,y=a[1]+dy*t+dx/len*off;if(plots.some(p=>Math.abs(x-p.house.x)<85&&Math.abs(y-p.house.y)<80))continue;deco(plants[(k/13|0)%7],x,y,21+random()*15,23+random()*14,{vegetation:true});if(k%65<13)deco(shrubs[(k/13|0)%6],x-dy/len*sign*22,y+dx/len*sign*22,56,42,{vegetation:true});}
 }
 for(let i=0;i<30;i++){const r=roads[i%5],a=r.points[i%(r.points.length-1)],b=r.points[i%(r.points.length-1)+1],t=random();deco('puddle',a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,35+random()*35,12+random()*14,{ground:true});}
 const randomActors=rng(seed+9292);for(let i=0;i<55;i++){const pl=plots[i%plots.length],x=pl.x+pl.w+55,y=pl.y+pl.h-35;if(Math.hypot(x-VILLAGE_SPAWN.x,y-VILLAGE_SPAWN.y)<440)continue;actors.push({id:'va'+i,kind:i%15===0?'bandit':'infected',x,y,homeX:x,homeY:y,health:45,maxHealth:45,action:'idle',direction:'south',elapsed:0,cooldown:0,alert:0,dead:false,looted:false,skin:i%15===0?'04-egor':String(1+(randomActors()*6|0)).padStart(2,'0')+'-'+['A','B','C'][i%3],name:i%15===0?'Мародёр':'Заражённый'});}
 // Existing lanes always cut through plot boundaries. A fence never blocks a road.
 const clearFences=fences.filter(f=>!roads.some(r=>roadDistance({x:(f.a.x+f.b.x)/2,y:(f.a.y+f.b.y)/2},r)<r.width/2+15));
 const result={objects,actors,roads,plots,decor,fences:clearFences,wires};cache.set(seed,result);if(cache.size>4)cache.delete(cache.keys().next().value);return result;
}
export function generateVillage(seed){const s=villageScenery(seed);return {objects:structuredClone(s.objects),actors:structuredClone(s.actors),villageMode:true,mapId:VILLAGE_ID,bounds:{...VILLAGE_BOUNDS},raidMode:false,viewVersion:2,clock:13*60+30,weather:'clear',weatherLeft:420,enabled:true,dead:false};}
const bins=new WeakMap();
function sceneryBins(scene){if(bins.has(scene))return bins.get(scene);const map=new Map();const add=(r)=>{for(let y=Math.floor(r.y/128);y<=Math.floor((r.y+r.h)/128);y++)for(let x=Math.floor(r.x/128);x<=Math.floor((r.x+r.w)/128);x++){const key=x+','+y;if(!map.has(key))map.set(key,[]);map.get(key).push(r);}};
 for(const f of scene.fences)if(!f.missing)add({x:Math.min(f.a.x,f.b.x)-3,y:Math.min(f.a.y,f.b.y)-3,w:Math.abs(f.b.x-f.a.x)+6,h:Math.abs(f.b.y-f.a.y)+6});
 for(const d of scene.decor)if(d.solid)add({x:d.x-d.solid.w/2,y:d.y-d.solid.h/2,w:d.solid.w,h:d.solid.h});bins.set(scene,map);return map;
}
export function villageBlocked(p,objects,seed=1){
 const b=VILLAGE_BOUNDS;if(p.x<b.left||p.x>b.right||p.y<b.top||p.y>b.bottom)return true;
 if(((p.x-6050)/128)**2+((p.y-3960)/87)**2<1)return true;
 for(const o of objects)if(villageObstacle(p,o))return true;
 const map=sceneryBins(villageScenery(seed));for(let y=Math.floor((p.y-6)/128);y<=Math.floor((p.y+6)/128);y++)for(let x=Math.floor((p.x-6)/128);x<=Math.floor((p.x+6)/128);x++)for(const r of map.get(x+','+y)??[])if(p.x+6>r.x&&p.x-6<r.x+r.w&&p.y+6>r.y&&p.y-6<r.y+r.h)return true;
 return false;
}
export function moveVillage(p,dx,dy,seed,objects){const n=Math.max(1,Math.ceil(Math.hypot(dx,dy)/3));let {x,y}=p;for(let i=0;i<n;i++){if(!villageBlocked({x:x+dx/n,y},objects,seed))x+=dx/n;if(!villageBlocked({x,y:y+dy/n},objects,seed))y+=dy/n;}return {x,y};}

export function migrateVillageFacing(world,p,ground=[]){if(!world.villageMode||world.viewVersion===2)return false;const scene=villageScenery(world.seed),old=new Map(world.objects.map(o=>[o.id,o])),inside=world.objects.find(o=>villageInside(p,o)),local=inside?houseLocal(p,inside):null;for(const stack of ground){const home=world.objects.find(o=>villageInside(stack,o)),newHome=home&&scene.objects.find(o=>o.id===home.id);if(newHome){const q=houseLocal(stack,home);Object.assign(stack,housePoint(newHome,q.x,q.y));}}const preserved=['stock','condition','used','doorOpen','fuel','burning','crop','growth','occupied'];world.objects=scene.objects.map(o=>{const prior=old.get(o.id),next=structuredClone(o);if(prior)for(const key of preserved)if(prior[key]!==undefined)next[key]=structuredClone(prior[key]);return next;});for(const o of old.values())if(!world.objects.some(n=>n.id===o.id))world.objects.push(o);if(inside&&local){const home=world.objects.find(o=>o.id===inside.id);Object.assign(p,housePoint(home,local.x,local.y));}world.viewVersion=2;return true;}
