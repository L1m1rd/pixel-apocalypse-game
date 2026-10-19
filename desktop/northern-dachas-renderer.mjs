import {BOUNDS,PLOTS,OBJECTS,FENCES,GATES,ROADS,SECTORS,DECALS,WIRES,project,unproject,riverBank,sectorAt,nearbyGate,PROJECTION} from './northern-dachas-map.mjs';
import {createSunlight} from './northern-dachas-lighting.mjs';
const CHUNK=512,LIMIT=72;
const p2=(c,points)=>{c.beginPath();points.forEach((p,i)=>i?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1]));};
const noise=n=>{let x=Math.imul((n|0)^0x45d9f3b,0x45d9f3b);return ((x^(x>>>16))>>>0)/4294967296;};
export function createDistrictPainter(images,definitions){
 const cache=new Map(),patterns=new Map(),spriteCache=new Map(),sunlight=createSunlight();
 const byId=new Map(OBJECTS.map(o=>[o.id,o]));
 const stats={visibleObjects:0,cachedChunks:0,shadowCasters:0,groundDecals:DECALS.length};
 function pattern(ctx,id){
  if(!patterns.has(ctx))patterns.set(ctx,new Map());const map=patterns.get(ctx);
  if(!map.has(id)){const value=ctx.createPattern(images.get('dacha/'+id),'repeat');value.setTransform(new DOMMatrix().scale(id==='forest-floor'?.65:.5));map.set(id,value);}return map.get(id);
 }
 function cutSprite(id){
  if(spriteCache.has(id))return spriteCache.get(id);const img=images.get('dacha/'+id),def=definitions[id];if(!img)return null;
  const r=def?.contentBounds??{x:0,y:0,w:img.width,h:img.height};spriteCache.set(id,{img,r});return spriteCache.get(id);
 }
 function groundDecal(c,d){
  const s=cutSprite(d.asset);if(!s)return;c.save();c.translate(d.x,d.y);c.rotate(d.rotation??0);c.globalAlpha=d.alpha??1;
  c.drawImage(s.img,s.r.x,s.r.y,s.r.w,s.r.h,-d.w/2,-d.h/2,d.w,d.h);c.restore();
 }
 function earthPatch(c,x,y,w,h,seed,alpha=.4){
  c.save();c.fillStyle=pattern(c,'forest-floor');c.globalAlpha=alpha;c.beginPath();
  for(let n=0;n<18;n++){const a=n/18*Math.PI*2,r=.8+noise(seed+n)*.2,px=x+Math.cos(a)*w*.5*r,py=y+Math.sin(a)*h*.5*r;n?c.lineTo(px,py):c.moveTo(px,py);}c.closePath();c.fill();c.restore();
 }
 function paintGround(c,view){
  c.fillStyle=pattern(c,'grass_short');c.fillRect(view.x,view.y,view.w,view.h);
  for(let y=Math.floor((view.y-220)/280)*280;y<view.y+view.h+220;y+=280)for(let x=Math.floor((view.x-220)/280)*280;x<view.x+view.w+220;x+=280){
   const seed=x*17+y*23;earthPatch(c,x+noise(seed)*180,y+noise(seed+1)*170,240+noise(seed+2)*150,180+noise(seed+3)*160,seed,.24);
  }
  c.fillStyle=pattern(c,'water');c.beginPath();c.moveTo(BOUNDS.x-200,BOUNDS.y-200);c.lineTo(riverBank(BOUNDS.y),BOUNDS.y-200);for(let y=BOUNDS.y;y<BOUNDS.y+BOUNDS.h+260;y+=40)c.lineTo(riverBank(y),y);c.lineTo(BOUNDS.x-200,BOUNDS.y+BOUNDS.h+200);c.closePath();c.fill();
  c.strokeStyle='#64644188';c.lineWidth=25;c.beginPath();for(let y=BOUNDS.y;y<=BOUNDS.y+BOUNDS.h;y+=40){if(y===BOUNDS.y)c.moveTo(riverBank(y)+10,y);else c.lineTo(riverBank(y)+10,y);}c.stroke();
  for(const plot of PLOTS){if(plot.x>view.x+view.w+100||plot.x+plot.w<view.x-100||plot.y>view.y+view.h+100||plot.y+plot.h<view.y-100)continue;
   earthPatch(c,plot.x+plot.w*.45,plot.y+plot.h*.45,plot.w,plot.h,plot.index*31,.45);
   c.strokeStyle=pattern(c,'rutted-soil');c.lineWidth=23;c.lineCap='round';c.beginPath();c.moveTo(plot.x+plot.w/2,plot.y+plot.h+10);c.bezierCurveTo(plot.x+plot.w/2-10,plot.y+240,plot.x+plot.w/2+15,plot.y+200,plot.x+174,plot.y+140);c.stroke();
  }
  for(const road of ROADS){
   const asphalt=road.kind==='asphalt',points=road.points;
   if(!asphalt){c.globalAlpha=.35;c.strokeStyle=pattern(c,'soil');c.lineWidth=road.width+22;c.lineCap='round';c.lineJoin='round';p2(c,points);c.stroke();c.globalAlpha=1;}
   c.strokeStyle=pattern(c,asphalt?'asphalt':road.kind==='soil'?'rutted-soil':'gravel');c.lineWidth=road.width;c.lineCap='round';c.lineJoin='round';p2(c,points);c.stroke();
   if(asphalt){c.strokeStyle='#b9b69b88';c.lineWidth=3;c.setLineDash([35,28]);p2(c,points);c.stroke();c.setLineDash([]);}
   else for(let n=1;n<points.length;n++){
    const a=points[n-1],b=points[n],dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy),nx=-dy/length,ny=dx/length;
    for(const side of [-1,1]){c.beginPath();for(let k=0;k<=Math.ceil(length/32);k++){const t=Math.min(1,k*32/length),bend=Math.sin(t*length/120+n)*2,offset=side*road.width*.23+bend,x=a[0]+dx*t+nx*offset,y=a[1]+dy*t+ny*offset;k?c.lineTo(x,y):c.moveTo(x,y);}c.strokeStyle='#44382b39';c.lineWidth=6;c.stroke();}
   }
  }
  for(const d of DECALS){const radius=Math.max(d.w,d.h);if(d.x+radius<view.x||d.y+radius<view.y||d.x-radius>view.x+view.w||d.y-radius>view.y+view.h)continue;groundDecal(c,d);}
  c.fillStyle=pattern(c,'floor_wood');c.fillRect(810,4960,610,80);c.strokeStyle='#4a4131';c.lineWidth=3;for(let x=820;x<1420;x+=16){c.beginPath();c.moveTo(x,4960);c.lineTo(x,5040);c.stroke();}
 }
 function chunk(x,y){
  const key=x+','+y;if(cache.has(key)){const value=cache.get(key);cache.delete(key);cache.set(key,value);return value;}
  const canvas=document.createElement('canvas');canvas.width=canvas.height=CHUNK;const c=canvas.getContext('2d');c.translate(-x*CHUNK,-y*CHUNK);paintGround(c,{x:x*CHUNK,y:y*CHUNK,w:CHUNK,h:CHUNK});patterns.delete(c);cache.set(key,canvas);if(cache.size>LIMIT)cache.delete(cache.keys().next().value);return canvas;
 }
 function sprite(c,id,x,y,w,h,alpha=1,mirror=false){const s=cutSprite(id);if(!s)return;c.save();c.globalAlpha=alpha;c.translate(x,y);if(mirror)c.scale(-1,1);c.imageSmoothingEnabled=true;c.drawImage(s.img,s.r.x,s.r.y,s.r.w,s.r.h,-w/2,-h,w,h);c.restore();}
 function overview(canvas,player,state){
  const c=canvas.getContext('2d'),w=canvas.width,h=canvas.height,pad=28;
  const scale=Math.min((w-pad*2)/BOUNDS.w,(h-pad*2)/BOUNDS.h),ox=(w-BOUNDS.w*scale)/2,oy=(h-BOUNDS.h*scale)/2;
  c.fillStyle='#17251d';c.fillRect(0,0,w,h);c.save();c.translate(ox,oy);c.scale(scale,scale);c.translate(-BOUNDS.x,-BOUNDS.y);paintGround(c,BOUNDS);
  for(const p of PLOTS){c.strokeStyle='#3c3d2a';c.lineWidth=8;c.strokeRect(p.x,p.y,p.w,p.h);}
  for(const o of [...OBJECTS].sort((a,b)=>a.y-b.y)){if(o.type==='building'||o.type==='tree'||o.type==='garden')sprite(c,o.asset,o.x,o.y,o.w,o.h);}
  c.restore();c.textAlign='center';c.textBaseline='middle';c.font='bold 11px Segoe UI';
  for(const s of SECTORS){const x=ox+(s.x+s.w/2-BOUNDS.x)*scale,y=oy+(s.y+s.h/2-BOUNDS.y)*scale,lines=s.name.split(' '),tw=Math.max(...lines.map(l=>c.measureText(l).width))+14;c.fillStyle='#182219e6';c.fillRect(x-tw/2,y-18,tw,36);c.fillStyle='#e5dfc5';lines.forEach((line,i)=>c.fillText(line,x,y-7+i*14));}
  const px=ox+(player.x-BOUNDS.x)*scale,py=oy+(player.y-BOUNDS.y)*scale;c.fillStyle='#f9dfa1';c.strokeStyle='#111';c.lineWidth=2;c.beginPath();c.arc(px,py,6,0,7);c.fill();c.stroke();
  c.font='12px Segoe UI';c.textAlign='left';c.fillStyle='#c3c8b3';c.fillText('СЕВЕР ↑ · Твоя позиция отмечена светлой точкой',18,h-12);
 }
 function wire(ctx,a,b){
  const p=project(a.x,a.y),q=project(b.x,b.y),ay=p.y-a.h*.88,by=q.y-b.h*.88;
  ctx.save();ctx.strokeStyle='#1b211bc0';ctx.lineWidth=.8;
  for(const offset of [-3,3]){ctx.beginPath();ctx.moveTo(p.x+offset,ay);ctx.quadraticCurveTo((p.x+q.x)/2+offset,(ay+by)/2+38,q.x+offset,by);ctx.stroke();}ctx.restore();
 }
 function render(ctx,canvas,player,state,drawHero,zoom=1.5,showHints=true){
  const p=project(player.x,player.y),cx=p.x-canvas.width/(2*zoom),cy=p.y-canvas.height/(2*zoom),left=-Math.round(cx*zoom),top=-Math.round(cy*zoom);
  const corners=[[cx,cy],[cx+canvas.width/zoom,cy],[cx,cy+canvas.height/zoom],[cx+canvas.width/zoom,cy+canvas.height/zoom]].map(([x,y])=>unproject(x,y));
  const minX=Math.min(...corners.map(q=>q.x))-350,minY=Math.min(...corners.map(q=>q.y))-350,maxX=Math.max(...corners.map(q=>q.x))+350,maxY=Math.max(...corners.map(q=>q.y))+350;
  ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle='#263224';ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.setTransform(zoom*PROJECTION.x,zoom*PROJECTION.y,-zoom*PROJECTION.x,zoom*PROJECTION.y,left,top);ctx.imageSmoothingEnabled=true;
  for(let y=Math.floor(minY/CHUNK);y<=Math.floor(maxY/CHUNK);y++)for(let x=Math.floor(minX/CHUNK);x<=Math.floor(maxX/CHUNK);x++)ctx.drawImage(chunk(x,y),x*CHUNK,y*CHUNK);
  ctx.setTransform(zoom,0,0,zoom,left,top);const entries=[],visibleObjects=[];let casters=0;
  const visible=(s,w,h,pad=0)=>s.x+w/2+pad>cx&&s.x-w/2-pad<cx+canvas.width/zoom&&s.y+30+pad>cy&&s.y-h-pad<cy+canvas.height/zoom;
  for(const o of OBJECTS){const s=project(o.x,o.y);if(!visible(s,o.w,o.h,230))continue;
   const building=o.type==='building',baseY=s.y+(building?30:0),tree=o.type==='tree';
   if(o.type==='ground'){sprite(ctx,o.asset,s.x,s.y,o.w,o.h);continue;}
   if(tree||building||o.type==='pole'||o.type==='vehicle'||o.solid||(o.type==='detail'&&o.asset!=='ivy-climbing')){
    const height=o.height??(tree?o.h*.72:building?o.h*.65:o.type==='pole'?o.h*.88:o.h*.5);
    if(sunlight.cast(ctx,o.asset,cutSprite(o.asset),s.x,baseY,o.w,o.h,{height,opacity:tree?.72:1}))casters++;
    sunlight.contact(ctx,s.x,baseY+1,o.w*(building?.4:tree?.22:.28),Math.max(5,o.h*.09));
   }
   if(visible(s,o.w,o.h))visibleObjects.push({o,s,baseY});
  }
  for(const f of FENCES){const s=project(f.x,f.y);if(visible(s,100,70,40)){
   if(sunlight.cast(ctx,f.asset,cutSprite(f.asset),s.x,s.y+12,f.length*1.13,47,{height:32,opacity:.65,mirror:f.axis==='x'}))casters++;
   entries.push({depth:s.y+8,draw:()=>sprite(ctx,f.asset,s.x,s.y+12,f.length*1.13,47,1,f.axis==='x')});
  }}
  for(const gate of GATES){const s=project(gate.x,gate.y);if(!state.openedGates.includes(gate.id)&&visible(s,90,60)){
   sunlight.cast(ctx,'gate',cutSprite('gate'),s.x,s.y+12,80,52,{height:35,mirror:true});
   entries.push({depth:s.y+10,draw:()=>sprite(ctx,'gate',s.x,s.y+12,80,52,1,true)});
  }}
  for(const {o,s,baseY}of visibleObjects)entries.push({depth:baseY+(o.depthBias??0),draw:()=>{
   const occludes=(o.type==='tree'||o.type==='vegetation')&&p.y<baseY&&p.y>baseY-o.h&&Math.abs(p.x-s.x)<o.w*.38;
   sprite(ctx,o.asset,s.x,baseY,o.w,o.h,occludes?.42:1);
  }});
  for(const link of WIRES){const a=byId.get(link.a),b=byId.get(link.b),p=project(a.x,a.y),q=project(b.x,b.y);
   if(Math.max(p.x,q.x)<cx||Math.min(p.x,q.x)>cx+canvas.width/zoom||Math.max(p.y,q.y)<cy||Math.min(p.y,q.y)-200>cy+canvas.height/zoom)continue;
   entries.push({depth:Math.max(p.y,q.y),draw:()=>wire(ctx,a,b)});
  }
  entries.push({depth:p.y,draw:()=>{sunlight.contact(ctx,p.x,p.y+1,10,3,.32);drawHero(ctx,p.x,p.y);}});
  entries.sort((a,b)=>a.depth-b.depth);for(const entry of entries)entry.draw();
  sunlight.grade(ctx,canvas);
  const target=nearbyGate(player);if(target&&showHints){ctx.setTransform(zoom,0,0,zoom,left,top);const s=project(target.x,target.y);ctx.strokeStyle='#e7d39c';ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(s.x,s.y+4,35,13,0,0,Math.PI*2);ctx.stroke();}
  ctx.setTransform(1,0,0,1,0,0);Object.assign(stats,{visibleObjects:entries.length,cachedChunks:cache.size,shadowCasters:casters,sun:{...sunlight.sun,enabled:sunlight.enabled}});
  return {sector:sectorAt(player)?.name??(player.y>4450?'Кольцевая дорога':'Лесополоса'),target,stats:{...stats}};
 }
 return {render,overview,stats,setSunEnabled:value=>sunlight.setEnabled(value)};
}
