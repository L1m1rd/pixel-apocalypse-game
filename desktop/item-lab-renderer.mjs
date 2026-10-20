const project=(x,y)=>({x:(x-y)*.9,y:(x+y)*.55});
export const LAB_MAP_ID='item-lab-v1';
export function createLabPainter(images,definitions){
 let texture=null;
 return {render(ctx,canvas,player,inventory,drawHero,zoom){
  const center=project(player.x,player.y),sx=canvas.width/2,sy=canvas.height/2;
  ctx.fillStyle='#807962';ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.save();ctx.translate(sx,sy);ctx.scale(zoom,zoom);ctx.translate(-center.x,-center.y);
  if(!texture){texture=ctx.createPattern(images.get('dacha/gravel-rich'),'repeat');texture.setTransform(new DOMMatrix().scale(.35));}
  ctx.fillStyle=texture;ctx.fillRect(center.x-canvas.width/zoom,center.y-canvas.height/zoom,canvas.width*2/zoom,canvas.height*2/zoom);
  const objects=inventory.state.ground.filter(s=>Math.hypot(s.x-player.x,s.y-player.y)<1500).map(s=>({s,y:s.x+s.y}));objects.push({hero:true,y:player.x+player.y});objects.sort((a,b)=>a.y-b.y);
  for(const o of objects){if(o.hero){ctx.save();ctx.fillStyle='#17201538';ctx.beginPath();ctx.ellipse(center.x+9,center.y+3,18,6,-.3,0,Math.PI*2);ctx.fill();ctx.restore();drawHero(ctx,center.x,center.y);}else{const p=project(o.s.x,o.s.y),img=images.get('item/'+o.s.key);if(img){const size=32;ctx.drawImage(img,p.x-size/2,p.y-size,size,size);}ctx.fillStyle='#f5e7b6';ctx.font='10px Consolas';ctx.fillText('×'+o.s.qty,p.x+13,p.y);}}
  ctx.restore();
  return {sector:'Пустой полигон',target:inventory.nearby(player)[0],stats:{visibleObjects:objects.length-1,mapId:LAB_MAP_ID}};
 },overview(canvas,player){const c=canvas.getContext('2d');c.fillStyle='#807962';c.fillRect(0,0,canvas.width,canvas.height);c.fillStyle='#f4e4a4';c.font='18px Consolas';c.fillText('Пустой полигон · 8192 × 8192',25,35);c.fillRect(player.x/8192*canvas.width-4,player.y/8192*canvas.height-4,8,8);},visualDiagnostics:()=>({mapId:LAB_MAP_ID,sceneryObjects:0})};
}
