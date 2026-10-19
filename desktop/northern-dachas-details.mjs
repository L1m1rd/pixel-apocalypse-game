const random=n=>{let x=(n+0x9e3779b9)>>>0;x=Math.imul(x^(x>>>16),0x21f0aaad);x=Math.imul(x^(x>>>15),0x735a2d97);return ((x^(x>>>15))>>>0)/4294967296;};
export const SCENE_VIEWS=[
 {id:'north-plots',sectorId:0,name:'Северные участки',x:2429,y:1300},
 {id:'birch-street',sectorId:1,name:'Берёзовая улица',x:3269,y:1720},
 {id:'old-dachas',sectorId:2,name:'Старые дачи',x:4109,y:1720},
 {id:'apple-orchards',sectorId:3,name:'Яблоневые сады',x:5369,y:1720},
 {id:'abandoned-plots',sectorId:4,name:'Заброшенные участки',x:2429,y:2980},
 {id:'dacha-sheds',sectorId:5,name:'Дачные сараи',x:3269,y:3400},
 {id:'south-entry',sectorId:6,name:'Южный въезд',x:4529,y:4240},
 {id:'greenhouse-sector',sectorId:7,name:'Тепличный сектор',x:5369,y:3400}
];
const thickets=['thicket-bramble','thicket-fern','thicket-flower','thicket-sapling'];
const grasses=['grass-green','grass-yellow','grass-white','grass-nettle','grass-clover','grass-violet','grass-golden'];
const vehicles=['car-sedan','van-blue','truck-flatbed','pickup-red','truck-canvas','car_abandoned'];
const themes=[
 ['wood-shelter','ladder-orchard','water-tank','crate-group','wheelbarrow','salvage-boards','rain-barrel-group'],
 ['plant-pots','bench','wheelbarrow','ladder-orchard','rain-barrel-group','crate-group','tire-stack'],
 ['well','boiler-rusty','ladder-orchard','workbench-tools','wood-shelter','crate-group','barrel'],
 ['ladder-orchard','crate-group','plant-pots','wheelbarrow','compost-box','water-tank','rain-barrel-group'],
 ['roof-debris','brick-debris','broken-window-frame','pallet-aged','gas-cylinders','salvage-boards','fungal-stump'],
 ['boiler-rusty','tool-rack','salvage-boards','workbench-tools','pallet-aged','wood-shelter','gas-cylinders'],
 ['tire-stack','wood-barricade','direction-sign','crate-group','gas-cylinders','rain-barrel-group','pallet-aged'],
 ['plant-pots','wheelbarrow','compost-box','tool-rack','water-tank','ladder-orchard','crate-group']
];
export function dressDistrict({PLOTS,OBJECTS,FENCES,LANDMARKS,ROADS,BOUNDS,riverBank}){
 const decals=[],wires=[];
 const add=(id,asset,x,y,w,h,type='detail',extra={})=>{const o={id,asset,x,y,w,h,type,solid:type==='tree'?{w:12,h:12}:null,...extra};OBJECTS.push(o);return o;};
 const decal=(id,asset,x,y,w,h,rotation=0,alpha=1)=>decals.push({id,asset,x,y,w,h,rotation,alpha});
 const laneDistance=(x,y)=>{
  let best=Infinity;for(const road of ROADS)for(let n=1;n<road.points.length;n++){
   const [ax,ay]=road.points[n-1],[bx,by]=road.points[n],dx=bx-ax,dy=by-ay,t=Math.max(0,Math.min(1,((x-ax)*dx+(y-ay)*dy)/(dx*dx+dy*dy)));
   best=Math.min(best,Math.hypot(x-ax-dx*t,y-ay-dy*t)-road.width/2);
  }return best;
 };
 for(let n=OBJECTS.length-1;n>=0;n--)if(/-grass-|-bush-/.test(OBJECTS[n].id))OBJECTS.splice(n,1);
 // Enrich the old perimeter assets as well as new tree instances.
 for(const o of OBJECTS){
  if(o.type==='tree'){o.asset=o.asset==='tree_conifer'?'spruce-rich':o.asset==='tree-apple'?'apple-rich':'birch-rich';o.w*=1.2;o.h*=1.07;}
  if(o.type==='vehicle')o.asset=vehicles[Number(o.id.replace(/\D/g,''))%vehicles.length];
 }
 for(const p of PLOTS){
  const i=p.index,seed=i*7919,rand=n=>random(seed+n),sector=p.sectorId,abandoned=sector===4;
  const house=OBJECTS.find(o=>o.id===p.id+'-house');
  if(house){
   const choices=abandoned?['cottage-collapsed','cottage-rich-grey','house-abandoned']:sector===1||sector===3?['cottage-rich-blue','cottage-blue','cottage-plaster']:['cottage-rich-grey','cottage-rich-blue','cottage-plaster','house-plaster'];
   house.asset=choices[(Math.floor(i/3)+i)%choices.length];house.family='house';house.x+=Math.round((rand(21)-.5)*32);house.y+=Math.round((rand(22)-.5)*22);house.w=240;house.h=198;
  }
  for(const o of OBJECTS.filter(o=>o.id.startsWith(p.id+'-')&&o.asset==='garage'))if(i%2===0)o.asset='shed-rich';
  for(const o of OBJECTS.filter(o=>o.id.startsWith(p.id+'-')&&o.asset==='greenhouse')){o.asset='greenhouse-rich';o.w=162;o.h=108;}
  const bedObjects=OBJECTS.filter(o=>o.id.startsWith(p.id+'-bed-'));
  for(let n=0;n<bedObjects.length;n++){const b=bedObjects[n];b.x=p.x+65+n*88+(rand(100+n)-.5)*16;b.y=p.y+218+(rand(110+n)-.5)*32;}
  // Every yard has several distinct work/storage groups, with plants in between.
  const anchors=[[40,143],[112,205],[263,167],[275,260],[55,275],[292,74]];
  for(let group=0;group<anchors.length;group++){
   const [ax,ay]=anchors[group],x=p.x+ax+(rand(200+group)-.5)*24,y=p.y+ay+(rand(220+group)-.5)*20;
   const asset=themes[sector][(i+group)%themes[sector].length],wide=asset==='well'||asset==='wood-shelter';
   add(p.id+'-story-'+group,asset,x,y,wide?72:42+rand(240+group)*26,wide?82:34+rand(260+group)*30,'detail',{plotId:p.id});
   for(let n=0;n<2;n++)add(p.id+'-story-small-'+group+'-'+n,['crate','barrel','boards','plant-pots','tire-stack','pallet-aged'][(i+group+n)%6],x+18+n*14,y+14-n*10,22+rand(280+group+n)*20,18+rand(290+group+n)*18,'detail',{plotId:p.id});
   decal(p.id+'-story-leaves-'+group,group%2?'stone-scatter':'leaf-litter',x,y+12,50,42,rand(300+group)*6,.8);
  }
  // Diverse vehicles sit inside overgrown yards rather than in a repeated row.
  if(i%3===0||sector===6){const v=vehicles[(i+sector)%vehicles.length];add(p.id+'-yard-car',v,p.x+75,p.y+171,126+rand(330)*25,78+rand(331)*15,'vehicle',{plotId:p.id,solid:{w:64,h:34}});}
  if(sector===1&&i%3===1||sector===6&&i%5===1){
   add(p.id+'-swing','playground-swing',p.x+85,p.y+180,110,65,'detail',{plotId:p.id});
   add(p.id+'-slide','playground-slide',p.x+260,p.y+220,95,62,'detail',{plotId:p.id});
   add(p.id+'-roundabout','playground-roundabout',p.x+105,p.y+272,76,43,'detail',{plotId:p.id});
  }
  if(sector===7&&i%2===0)add(p.id+'-extra-greenhouse','greenhouse-rich',p.x+70,p.y+170,155,104,'building',{plotId:p.id,solid:{w:72,h:44}});
  if(abandoned){
   for(let n=0;n<5;n++)add(p.id+'-collapse-'+n,['roof-debris','brick-debris','fallen-birch','broken-window-frame','fungal-stump'][n],p.x+45+rand(350+n)*245,p.y+110+rand(370+n)*140,50+rand(390+n)*50,35+rand(410+n)*35,'detail',{plotId:p.id});
   add(p.id+'-dead-tree','dead-tree',p.x+300,p.y+160,80,155,'tree',{plotId:p.id});
  }
  if(house){
   add(p.id+'-wall-ivy','ivy-climbing',house.x-62,house.y+17,45,90,'detail',{plotId:p.id,depthBias:38});
   decal(p.id+'-foundation','foundation-damp',house.x,house.y+25,165,100,0,.9);
   add(p.id+'-door-pots','plant-pots',house.x+72,house.y+42,37,32,'detail',{plotId:p.id});
  }
  // Clear only the narrow approach from each gate to the house.
  const inPath=(x,y)=>Math.abs(x-(p.x+p.w/2+Math.sin((y-p.y)/70)*8))<21&&y>p.y+158;
  const buildings=OBJECTS.filter(o=>o.plotId===p.id&&o.solid&&o.type==='building');
  const inBuilding=(x,y)=>buildings.some(o=>Math.abs(x-o.x)<o.solid.w/2+7&&Math.abs(y-o.y)<o.solid.h/2+5);
  const workGroups=OBJECTS.filter(o=>o.plotId===p.id&&(o.id.includes('-story-')||o.type==='vehicle'||o.id.includes('-swing')||o.id.includes('-slide')));
  const nearWork=(x,y)=>workGroups.some(o=>Math.abs(x-o.x)<(o.type==='vehicle'?60:27)&&Math.abs(y-o.y)<(o.type==='vehicle'?32:23));
  // Interlocking large patches establish continuous undergrowth, not isolated tufts.
  for(let n=0;n<26;n++){
   let x=p.x+14+rand(450+n)*314,y=p.y+14+rand(490+n)*294;
   if(n<12){x=p.x+(n%2?327:14)+(rand(530+n)-.5)*16;y=p.y+25+Math.floor(n/2)*51;}
   if(inPath(x,y)||inBuilding(x,y)||nearWork(x,y))continue;
   const size=73+rand(570+n)*53;add(p.id+'-thicket-'+n,thickets[(i+n)%4],x,y,size,size*(.59+rand(610+n)*.2),'vegetation',{plotId:p.id});
  }
  for(let n=0;n<112;n++){
   let x=p.x+6+rand(650+n)*331,y=p.y+7+rand(790+n)*311;
   if(n<32){if(n%2)x=p.x+(n%4===1?4:337);else y=p.y+(n%4===0?6:317);}
   if(inPath(x,y)||inBuilding(x,y))continue;
   const size=37+rand(930+n)*26;add(p.id+'-meadow-'+n,grasses[(i+n)%grasses.length],x,y,size,size*(nearWork(x,y)?.38:.55+rand(1070+n)*.3),'vegetation',{plotId:p.id});
  }
  const treeCount=sector===3?8:abandoned?6:4;
  for(let n=0;n<treeCount;n++){
   const x=p.x+26+rand(1210+n)*284,y=p.y+25+rand(1250+n)*140;
   if(inBuilding(x,y)||inPath(x,y))continue;
   const asset=sector===3?'apple-rich':sector===1?'birch-rich':['birch-rich','spruce-rich','birch-gold-rich'][(i+n)%3];
   add(p.id+'-tree-'+n,asset,x,y,175+rand(1290+n)*65,205+rand(1330+n)*75,'tree',{plotId:p.id});
  }
  for(let n=0;n<20;n++)decal(p.id+'-ground-'+n,['leaf-litter','grass-transition','stone-scatter','glass-scatter'][n%4],p.x+rand(1400+n)*p.w,p.y+rand(1440+n)*p.h,36+rand(1480+n)*48,30+rand(1520+n)*40,rand(1560+n)*6,.6);
  decal(p.id+'-entry-ruts','wheel-ruts',p.x+p.w/2,p.y+277,38,102,0,.7);
  if(i%2===0)decal(p.id+'-puddle','puddle-shallow',p.x+p.w/2+30,p.y+p.h+48,43,64,rand(1600),.8);
 }
 for(const f of FENCES){const p=PLOTS.find(p=>f.id.startsWith(p.id+'-'));f.asset=p?.sectorId===7?'fence-plane-mesh':p?.sectorId===4?'fence-plane-patched':'fence-plane-wood';}
 // Fill roadside margins, including vertical lanes which previously had bare edges.
 for(const road of ROADS){if(road.kind==='asphalt')continue;
  for(let n=1;n<road.points.length;n++){
   const [ax,ay]=road.points[n-1],[bx,by]=road.points[n],dx=bx-ax,dy=by-ay,length=Math.hypot(dx,dy),nx=-dy/length,ny=dx/length;
   for(let k=0;k<length;k+=31){const t=k/length,seed=Math.round(ax+ay+k),side=k%62?1:-1,off=road.width/2+16+random(seed)*11,x=ax+dx*t+nx*off*side,y=ay+dy*t+ny*off*side;
    const nearEntry=PLOTS.some(p=>Math.hypot(p.entrance.x-x,p.entrance.y-y)<32);if(nearEntry)continue;
    add('roadside-'+road.id+'-'+n+'-'+k,grasses[seed%grasses.length],x,y,42+random(seed+1)*21,35+random(seed+2)*18,'vegetation');
    if(k%93===0)add('road-bush-'+road.id+'-'+n+'-'+k,thickets[seed%4],x+nx*side*9,y+ny*side*9,72,48,'vegetation');
    if(k%62===0)decal('road-edge-'+road.id+'-'+n+'-'+k,'grass-transition',x,y,67,42,random(seed)*6,.8);
   }
  }
 }
 // Forest and the southern belt are dense too; keep the ring road and footpaths open.
 for(let gy=BOUNDS.y+70;gy<BOUNDS.y+BOUNDS.h-40;gy+=140)for(let gx=BOUNDS.x+80;gx<BOUNDS.x+BOUNDS.w-50;gx+=140){
  const seed=Math.round(gx*13+gy*17),x=gx+(random(seed)-.5)*90,y=gy+(random(seed+1)-.5)*90;
  if(x<riverBank(y)+38||x>1690&&x<6160&&y>740&&y<4420||laneDistance(x,y)<43)continue;
  add('forest-rich-'+gx+'-'+gy,random(seed+2)>.45?'spruce-rich':'birch-rich',x,y,170+random(seed+3)*80,210+random(seed+4)*90,'tree');
  for(let n=0;n<3;n++)add('forest-understory-'+gx+'-'+gy+'-'+n,thickets[n%4],x+(random(seed+10+n)-.5)*130,y+(random(seed+20+n)-.5)*130,90+random(seed+30+n)*45,65+random(seed+40+n)*25,'vegetation');
  for(let n=0;n<6;n++)add('forest-meadow-'+gx+'-'+gy+'-'+n,grasses[n%grasses.length],x+(random(seed+50+n)-.5)*150,y+(random(seed+60+n)-.5)*150,43+random(seed+70+n)*25,38,'vegetation');
 }
 for(let n=0;n<170;n++){
  const y=650+n*27,x=riverBank(y)+25+random(n+17000)*55;
  add('river-reeds-'+n,n%3?'grass-reeds':'thicket-fern',x,y,65+random(n)*25,63+random(n+9)*32,'vegetation');
 }
 for(let n=0;n<18;n++){
  const x=4740+(n%2?1:-1)*(76+random(n+41)*90),y=4350+n*31;
  add('entry-garden-'+n,thickets[n%4],x,y,125,86,'vegetation');
  if(n%4===0)add('entry-scrap-'+n,['van-blue','water-tank','boiler-rusty','wood-barricade','tire-stack'][n/4|0],x+30,y+18,105,76,'detail');
 }
 add('south-direction-sign','direction-sign',4807,4570,52,84,'detail');
 for(let c=0;c<10;c++)for(let r=0;r<2;r++)wires.push({a:'pole-'+c+'-'+r,b:'pole-'+c+'-'+(r+1)});
 for(let r=0;r<3;r++)for(let c=0;c<9;c++)wires.push({a:'pole-'+c+'-'+r,b:'pole-'+(c+1)+'-'+r});
 LANDMARKS.push({id:'marsh-edge',name:'Заросший берег',x:1430,y:3000});
 return {decals,wires};
}
