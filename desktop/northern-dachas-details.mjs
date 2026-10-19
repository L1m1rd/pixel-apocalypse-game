const random=n=>{let x=(n+0x9e3779b9)>>>0;x=Math.imul(x^(x>>>16),0x21f0aaad);x=Math.imul(x^(x>>>15),0x735a2d97);return ((x^(x>>>15))>>>0)/4294967296;};
export function dressDistrict({PLOTS,OBJECTS,FENCES,LANDMARKS,riverBank}){
 const decals=[],wires=[];
 const add=(id,asset,x,y,w,h,type='detail',extra={})=>OBJECTS.push({id,asset,x,y,w,h,type,solid:type==='tree'?{w:12,h:12}:type==='vehicle'?{w:80,h:40}:null,...extra});
 const decal=(id,asset,x,y,w,h,rotation=0,alpha=1)=>decals.push({id,asset,x,y,w,h,rotation,alpha});
 // Replace evenly spaced tiny grass tufts with readable clusters and understory.
 for(let n=OBJECTS.length-1;n>=0;n--)if(/-grass-/.test(OBJECTS[n].id))OBJECTS.splice(n,1);
 for(const p of PLOTS){
  const i=p.index,seed=i*1731,rand=n=>random(seed+n),abandoned=p.sectorId===4;
  const house=OBJECTS.find(o=>o.id===p.id+'-house');
  if(house){house.asset=abandoned?'cottage-collapsed':['cottage-blue','cottage-plaster','house','house-plaster'][Math.floor(i/4)%4];house.family='house';}
  for(const o of OBJECTS.filter(o=>o.id.startsWith(p.id+'-')&&o.asset==='tree-apple'))if(i%2===0)o.asset='apple-mature';
  const shed=OBJECTS.find(o=>o.id===p.id+'-shed');if(shed&&i%3===0)shed.asset='shed-workshop';
  for(const o of OBJECTS.filter(o=>o.id.startsWith(p.id+'-bush-'))){o.asset=['bramble','hazel','wild-rose'][Math.floor(rand(o.x)*3)];o.w*=1.55;o.h*=1.65;}
  // Cluster centres favour fence corners; the gate approach remains clear.
  for(let n=0;n<8;n++){
   const x=p.x+18+rand(100+n)*300,y=p.y+16+rand(200+n)*75;
   add(p.id+'-understory-'+n,['bramble','hazel','fern','wild-rose'][n%4],x,y,58+rand(n)*35,48+rand(n+80)*38,'vegetation');
  }
  for(let n=0;n<38;n++){
   let x=p.x+12+rand(300+n)*318,y=p.y+16+rand(400+n)*292;
   if(n<26){if(n%2)x=p.x+(n%4===1?15:325)+rand(500+n)*12;else y=p.y+(n%4===0?22:300)+rand(600+n)*9;}
   if(Math.abs(x-(p.x+p.w/2))<40&&y>p.y+190)continue;
   const a=['meadow-white','meadow-yellow','fern'][n%3],size=32+rand(700+n)*27;
   add(p.id+'-meadow-'+n,a,x,y,size,size*(.65+rand(800+n)*.35),'vegetation');
  }
  for(let n=0;n<3+(abandoned?2:0);n++){
   const x=p.x+22+rand(900+n)*280,y=p.y+28+rand(950+n)*75;
   add(p.id+'-canopy-'+n,['birch-mature','spruce-mature','birch-autumn'][((i+n)%3)],x,y,145+rand(1000+n)*75,200+rand(1100+n)*90,'tree',{height:155+rand(1010+n)*70,plotId:p.id});
  }
  const propX=p.x+45+rand(1200)*30,propY=p.y+140+rand(1250)*40;
  const prop=['wood-shelter','workbench-tools','salvage-boards','rain-barrel-group','crate-group','pallet-aged','broken-window-frame','wood-barricade'][i%8];
  add(p.id+'-yard-story',prop,propX,propY,70+rand(1300)*24,52+rand(1400)*18);
  if(i%5===0)add(p.id+'-truck','truck-canvas',p.x+255,p.y+255,145,100,'vehicle');
  if(i%8===6)decal(p.id+'-glass','glass-scatter',p.x+100,p.y+155,60,42,.3,.85);
  if(i%4===0)add(p.id+'-fallen','fallen-birch',p.x+85,p.y+285,95,56);
  if(abandoned){
   add(p.id+'-roof-debris','roof-debris',p.x+200,p.y+180,110,65);
   add(p.id+'-brick-debris','brick-debris',p.x+120,p.y+155,68,43);
   add(p.id+'-dead-tree','dead-tree',p.x+300,p.y+170,85,155,'tree');
   add(p.id+'-fungi','fungal-stump',p.x+55,p.y+220,53,49);
  }
  if(house){
   add(p.id+'-wall-ivy','ivy-climbing',house.x-61,house.y+10,38,82,'detail',{depthBias:38});
   decal(p.id+'-foundation','foundation-damp',house.x,house.y+26,170,120,rand(1500)*.3,.8);
  }
  for(let n=0;n<15;n++){
   const x=p.x+15+rand(1600+n)*310,y=p.y+10+rand(1700+n)*300;
   const asset=['leaf-litter','root-moss','grass-transition','stone-scatter'][n%4];
   const scale=asset==='root-moss'?.52:asset==='leaf-litter'?.7:1;
   decal(p.id+'-ground-'+n,asset,x,y,(55+rand(1800+n)*90)*scale,(45+rand(1900+n)*70)*scale,rand(2000+n)*6.28,.5+rand(2100+n)*.35);
  }
  decal(p.id+'-entry-ruts','wheel-ruts',p.x+p.w/2,p.y+277,50,110,0,.65);
  if(i%3===0)decal(p.id+'-wet','puddle-shallow',p.x+p.w/2+23,p.y+p.h+55,48,70,rand(2200),.7);
 }
 for(const f of FENCES){const p=PLOTS.find(p=>f.id.startsWith(p.id+'-'));if(p&&p.sectorId===4&&random(f.x+f.y)>.73)f.asset='fence-broken';}
 for(let n=0;n<110;n++){
  const y=650+n*36,x=riverBank(y)+25+random(n+9000)*70;
  add('river-reeds-'+n,n%4?'reeds':'fern',x,y,56+random(n)*25,65+random(n+33)*35,'vegetation');
  if(n%3===0)decal('bank-moss-'+n,'root-moss',x+30,y,100,80,random(n)*6,.8);
 }
 // Roadside transition strips and irregular patches prevent hard material edges.
 for(let r=0;r<=8;r++)for(let c=0;c<44;c++){
  const x=1750+c*100,y=900+r*420,side=c%2?1:-1;
  decal('road-edge-'+r+'-'+c,'grass-transition',x,y+side*(38+random(c+r*91)*13),90+random(c)*50,50,random(c+r)*6,.72);
  if(c%4===0)decal('road-mud-'+r+'-'+c,'wheel-ruts',x,y,60,100,Math.PI/2,.44);
 }
 for(let c=0;c<10;c++)for(let r=0;r<2;r++)wires.push({a:'pole-'+c+'-'+r,b:'pole-'+c+'-'+(r+1)});
 for(let r=0;r<3;r++)for(let c=0;c<9;c++)wires.push({a:'pole-'+c+'-'+r,b:'pole-'+(c+1)+'-'+r});
 add('south-direction-sign','direction-sign',4807,4570,52,84,'detail');
 LANDMARKS.push({id:'marsh-edge',name:'Заросший берег',x:1430,y:3000});
 return {decals,wires};
}
