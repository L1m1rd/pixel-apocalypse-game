import {BOUNDS,PLOTS,OBJECTS,FENCES,GATES,ROADS,SECTORS,LANDMARKS,project,unproject,riverBank,sectorAt,nearbyGate,PROJECTION} from './northern-dachas-map.mjs';
const CHUNK=512,LIMIT=72;
const p2=(c,points)=>{c.beginPath();points.forEach((p,i)=>i?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1]));};
export function createDistrictPainter(images,definitions){
 const cache=new Map(),patterns=new Map(),spriteCache=new Map();
 const stats={visibleObjects:0,cachedChunks:0};
 function pattern(ctx,id){
  if(!patterns.has(ctx))patterns.set(ctx,new Map());const map=patterns.get(ctx);
  if(!map.has(id)){const value=ctx.createPattern(images.get('dacha/'+id),'repeat');value.setTransform(new DOMMatrix().scale(.25));map.set(id,value);}return map.get(id);
 }
 function cutSprite(id){
  if(spriteCache.has(id))return spriteCache.get(id);const img=images.get('dacha/'+id),def=definitions[id];if(!img)return null;
  const r=def?.contentBounds??{x:0,y:0,w:img.width,h:img.height};spriteCache.set(id,{img,r});return spriteCache.get(id);
 }
 function paintGround(c,view){
  c.fillStyle=pattern(c,'grass_short');c.fillRect(view.x,view.y,view.w,view.h);
  c.fillStyle=pattern(c,'water');c.beginPath();c.moveTo(BOUNDS.x-200,BOUNDS.y-200);c.lineTo(riverBank(BOUNDS.y),BOUNDS.y-200);for(let y=BOUNDS.y;y<BOUNDS.y+BOUNDS.h+260;y+=40)c.lineTo(riverBank(y),y);c.lineTo(BOUNDS.x-200,BOUNDS.y+BOUNDS.h+200);c.closePath();c.fill();
  c.strokeStyle='#64644188';c.lineWidth=25;c.beginPath();for(let y=BOUNDS.y;y<=BOUNDS.y+BOUNDS.h;y+=40){if(y===BOUNDS.y)c.moveTo(riverBank(y)+10,y);else c.lineTo(riverBank(y)+10,y);}c.stroke();
  for(const plot of PLOTS){if(plot.x>view.x+view.w||plot.x+plot.w<view.x||plot.y>view.y+view.h||plot.y+plot.h<view.y)continue;
   c.fillStyle=pattern(c,'soil');c.globalAlpha=.34;c.fillRect(plot.x+8,plot.y+8,plot.w-16,plot.h-16);c.globalAlpha=1;
   c.fillStyle=pattern(c,'gravel');c.fillRect(plot.x+plot.w/2-13,plot.y+125,26,plot.h-125);
   c.fillStyle=pattern(c,'mud');for(let i=0;i<3;i++)c.fillRect(plot.x+20+i*95,plot.y+230,65,55);
  }
  for(const road of ROADS){c.strokeStyle=pattern(c,'gravel');c.lineWidth=road.width+14;c.lineCap='round';c.lineJoin='round';p2(c,road.points);c.stroke();c.strokeStyle=pattern(c,road.kind);c.lineWidth=road.width;p2(c,road.points);c.stroke();
   if(road.kind==='asphalt'){c.strokeStyle='#b9b69b88';c.lineWidth=3;c.setLineDash([35,28]);p2(c,road.points);c.stroke();c.setLineDash([]);}
   else{c.strokeStyle='#372c1e22';c.lineWidth=7;p2(c,road.points.map(([x,y])=>[x+10,y+9]));c.stroke();}
  }
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
  for(const o of [...OBJECTS].sort((a,b)=>a.y-b.y)){if(o.type==='building'||o.type==='tree'||o.type==='garden')sprite(c,o.asset,o.x,o.y,o.w,o.h);else if(o.type==='vegetation'){c.fillStyle='#57633199';c.beginPath();c.arc(o.x,o.y,10,0,7);c.fill();}}
  c.restore();c.textAlign='center';c.textBaseline='middle';c.font='bold 11px Segoe UI';
  for(const s of SECTORS){const x=ox+(s.x+s.w/2-BOUNDS.x)*scale,y=oy+(s.y+s.h/2-BOUNDS.y)*scale,lines=s.name.split(' '),tw=Math.max(...lines.map(l=>c.measureText(l).width))+14;c.fillStyle='#182219e6';c.fillRect(x-tw/2,y-18,tw,36);c.fillStyle='#e5dfc5';lines.forEach((line,i)=>c.fillText(line,x,y-7+i*14));}
  const px=ox+(player.x-BOUNDS.x)*scale,py=oy+(player.y-BOUNDS.y)*scale;c.fillStyle='#f9dfa1';c.strokeStyle='#111';c.lineWidth=2;c.beginPath();c.arc(px,py,6,0,7);c.fill();c.stroke();
  c.font='12px Segoe UI';c.textAlign='left';c.fillStyle='#c3c8b3';c.fillText('СЕВЕР ↑ · Твоя позиция отмечена светлой точкой',18,h-12);
 }
 function render(ctx,canvas,player,state,drawHero,zoom=1.5,showHints=true){
  const p=project(player.x,player.y),cx=p.x-canvas.width/(2*zoom),cy=p.y-canvas.height/(2*zoom),left=-Math.round(cx*zoom),top=-Math.round(cy*zoom);
  const corners=[[cx,cy],[cx+canvas.width/zoom,cy],[cx,cy+canvas.height/zoom],[cx+canvas.width/zoom,cy+canvas.height/zoom]].map(([x,y])=>unproject(x,y));
  const minX=Math.min(...corners.map(q=>q.x))-250,minY=Math.min(...corners.map(q=>q.y))-250,maxX=Math.max(...corners.map(q=>q.x))+250,maxY=Math.max(...corners.map(q=>q.y))+250;
  ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle='#263224';ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.setTransform(zoom*PROJECTION.x,zoom*PROJECTION.y,-zoom*PROJECTION.x,zoom*PROJECTION.y,left,top);ctx.imageSmoothingEnabled=true;
  for(let y=Math.floor(minY/CHUNK);y<=Math.floor(maxY/CHUNK);y++)for(let x=Math.floor(minX/CHUNK);x<=Math.floor(maxX/CHUNK);x++)ctx.drawImage(chunk(x,y),x*CHUNK,y*CHUNK);
  ctx.setTransform(zoom,0,0,zoom,left,top);const entries=[];
  const visible=(s,w,h)=>s.x+w/2>cx&&s.x-w/2<cx+canvas.width/zoom&&s.y+30>cy&&s.y-h<cy+canvas.height/zoom;
  for(const o of OBJECTS){const s=project(o.x,o.y);if(!visible(s,o.w,o.h))continue;
   const building=o.type==='building',baseY=s.y+(building?30:0);
   if(o.solid){ctx.fillStyle=o.type==='tree'?'#11201130':'#101a1638';ctx.beginPath();ctx.ellipse(s.x+9,s.y+7,building?o.w*.37:o.w*.22,building?o.h*.11:Math.max(3,o.h*.035),0,0,Math.PI*2);ctx.fill();}
   if(o.type==='ground'){sprite(ctx,o.asset,s.x,s.y,o.w,o.h);continue;}
   entries.push({depth:baseY,draw:()=>{const occludes=o.type==='tree'&&p.y<baseY&&p.y>baseY-o.h&&Math.abs(p.x-s.x)<o.w*.38;sprite(ctx,o.asset,s.x,baseY,o.w,o.h,occludes?.38:1);}});
  }
  for(const f of FENCES){const s=project(f.x,f.y);if(visible(s,78,60))entries.push({depth:s.y+8,draw:()=>sprite(ctx,f.asset,s.x,s.y+12,f.length*1.13,47,1,f.axis==='x')});}
  for(const gate of GATES){const s=project(gate.x,gate.y);if(!state.openedGates.includes(gate.id)&&visible(s,90,60))entries.push({depth:s.y+10,draw:()=>sprite(ctx,'gate',s.x,s.y+12,80,52,1,true)});}
  entries.push({depth:p.y,draw:()=>{ctx.fillStyle='#0c140d70';ctx.beginPath();ctx.ellipse(p.x,p.y+1,8,3,0,0,Math.PI*2);ctx.fill();drawHero(ctx,p.x,p.y);}});
  entries.sort((a,b)=>a.depth-b.depth);for(const entry of entries)entry.draw();
  const target=nearbyGate(player);if(target&&showHints){const s=project(target.x,target.y);ctx.strokeStyle='#e7d39c';ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(s.x,s.y+4,35,13,0,0,Math.PI*2);ctx.stroke();}
  ctx.setTransform(1,0,0,1,0,0);stats.visibleObjects=entries.length;stats.cachedChunks=cache.size;
  return {sector:sectorAt(player)?.name??(player.y>4450?'Кольцевая дорога':'Лесополоса'),target,stats:{...stats}};
 }
 return {render,overview,stats};
}
