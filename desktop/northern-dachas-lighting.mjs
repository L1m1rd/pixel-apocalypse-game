// One fixed directional sun. Directions are in projected screen coordinates;
// translating the camera never changes the light or a caster's shadow.
export const SUN=Object.freeze({
 id:'northern-dachas-afternoon',static:true,azimuthDegrees:315,elevationDegrees:43,
 direction:Object.freeze({x:-Math.SQRT1_2,y:-Math.SQRT1_2}),
 color:'#ffe5b7',ambient:'#9baeb7',shadowColor:'#182b28',
 shadowOpacity:.29,warmth:.045
});
export function shadowVector(height,sun=SUN){
 const length=Math.max(0,height)/Math.tan(sun.elevationDegrees*Math.PI/180);
 return {x:-sun.direction.x*length,y:-sun.direction.y*length*.62};
}
export function createSunlight(){
 const silhouettes=new Map();let enabled=true;
 function mask(id,sprite){
  if(silhouettes.has(id))return silhouettes.get(id);
  const {img,r}=sprite,scale=Math.min(1,256/r.w,320/r.h);
  const c=document.createElement('canvas');c.width=Math.max(1,Math.ceil(r.w*scale));c.height=Math.max(1,Math.ceil(r.h*scale));
  const x=c.getContext('2d');x.drawImage(img,r.x,r.y,r.w,r.h,0,0,c.width,c.height);
  x.globalCompositeOperation='source-in';x.fillStyle=SUN.shadowColor;x.fillRect(0,0,c.width,c.height);
  silhouettes.set(id,c);return c;
 }
 function cast(ctx,id,sprite,x,y,w,h,{height=h*.72,opacity=1,mirror=false}={}){
  if(!enabled||!sprite||height<=0)return false;
  const image=mask(id,sprite),v=shadowVector(height);
  ctx.save();ctx.globalAlpha=SUN.shadowOpacity*opacity;
  ctx.translate(x+v.x,y+v.y);
  // The image's bottom is attached to the ground; its top extends away from sun.
  ctx.transform(mirror?-w/image.width:w/image.width,0,-v.x/image.height,-v.y/image.height,mirror?w/2:-w/2,0);
  ctx.drawImage(image,0,0);ctx.restore();return true;
 }
 function contact(ctx,x,y,w,h,opacity=.17){
  ctx.save();ctx.globalAlpha=enabled?opacity:opacity*.45;
  const g=ctx.createRadialGradient(x,y,0,x,y,Math.max(2,w));
  g.addColorStop(0,SUN.shadowColor);g.addColorStop(1,'#182b2800');
  ctx.fillStyle=g;ctx.translate(x,y);ctx.scale(1,h/w);ctx.beginPath();ctx.arc(0,0,w,0,Math.PI*2);ctx.fill();ctx.restore();
 }
 function grade(ctx,canvas){
  if(!enabled)return;
  ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.globalCompositeOperation='soft-light';
  ctx.globalAlpha=SUN.warmth*3;ctx.fillStyle=SUN.color;ctx.fillRect(0,0,canvas.width,canvas.height);ctx.restore();
 }
 return {cast,contact,grade,setEnabled(value){enabled=!!value;},get enabled(){return enabled;},sun:SUN};
}
