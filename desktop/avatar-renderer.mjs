import {sideWalkPose} from './avatar-motion.mjs';
export function createAvatarRenderer(assets,images){
 const surface=document.createElement('canvas');surface.width=surface.height=128;const ctx=surface.getContext('2d');
 const body=document.createElement('canvas');body.width=body.height=96;const b=body.getContext('2d');
 const layer=document.createElement('canvas');layer.width=layer.height=96;const l=layer.getContext('2d');let last=null;
 const trim=(context,key,x,y,w,h,mirror=false)=>{const img=images.get('item/'+key),r=assets.avatar.itemBounds[key];if(!img||!r)return;context.save();context.translate(Math.round(x),Math.round(y));if(mirror)context.scale(-1,1);context.drawImage(img,r.x,r.y,r.w,r.h,-w/2,0,w,h);context.restore();};
 function bone(c,img,region,a,z){c.save();c.translate(a.x,a.y);c.rotate(-Math.atan2(z.x-a.x,z.y-a.y));c.drawImage(img,region.x,region.y,region.w,region.h,-region.w/2,-1,region.w,Math.hypot(z.x-a.x,z.y-a.y)+2);c.restore();}
 function makeBody(ch,direction,action,time){const img=images.get(ch.id),di=assets.directions.indexOf(direction),row=di*7+assets.actions.indexOf(action),count=ch.frameCounts[direction][action],duration=ch.timingsByDirection[direction][action],frame=Math.floor(time/duration)%count,base=assets.avatar.characters[ch.id][direction],rig={...base,direction};b.clearRect(0,0,96,96);b.imageSmoothingEnabled=false;const walking=action==='walk'&&(direction==='east'||direction==='west');let legs=null;
  if(walking){legs=sideWalkPose(time,rig);for(const i of [0,1]){const source=rig.legs[i],p=legs[i];b.save();if(i===0)b.filter='brightness(.73)';bone(b,img,{x:source.x,y:rig.row*96+rig.hip,w:source.w,h:rig.knee-rig.hip+1},p.hip,p.knee);bone(b,img,{x:source.x,y:rig.row*96+rig.knee,w:source.w,h:rig.bottom-3-rig.knee},p.knee,p.ankle);b.drawImage(img,source.bootX,rig.row*96+rig.bottom-3,source.bootW,4,Math.round(p.ankle.x-source.bootW/2),Math.round(p.ankle.y-3),source.bootW,4);b.restore();}const bob=Math.round(Math.cos(time/960*Math.PI*4));b.drawImage(img,0,rig.row*96,96,rig.hip+2,0,bob,96,rig.hip+2);}
  else b.drawImage(img,frame*96,row*96,96,96,0,0,96,96);
  // The mask and attachment coordinates follow the actual rendered body, including run frames.
  const pixels=b.getImageData(0,0,96,96).data;let top=96,bottom=0,left=96,right=0;for(let y=0;y<96;y++)for(let x=0;x<96;x++)if(pixels[(y*96+x)*4+3]>96){top=Math.min(top,y);bottom=Math.max(bottom,y);left=Math.min(left,x);right=Math.max(right,x);}
  const hip=bottom-Math.round((bottom-top+1)*.39),shoulder=top+Math.round((bottom-top+1)*.32);return {rig,walking,legs,frame:walking?Math.floor(time/80)%12:frame,top,bottom,left,right,hip,shoulder,center:rig.center};
 }
 function clothing(key,area,mirror=false){if(!key)return;const r=assets.avatar.itemBounds[key],img=images.get('item/'+key);if(!r||!img)return;l.clearRect(0,0,96,96);l.save();l.translate(area.x+(mirror?area.w:0),area.y);if(mirror)l.scale(-1,1);l.drawImage(img,r.x+r.w*.15,r.y+r.h*.12,r.w*.7,r.h*.76,0,0,area.w,area.h);l.restore();l.globalCompositeOperation='destination-in';l.drawImage(body,0,0);l.globalCompositeOperation='source-over';ctx.drawImage(layer,16,12);}
 function gun(key,pose,direction,m,weaponAction,time){const data=assets.avatar.weapons[key],tool=!data;let img,r,sourceX=0,width,height,originX,originY,scale;
  if(data){const active=weaponAction?.key===key?weaponAction:null,kind=active?.kind??'idle';img=images.get('weapon/'+key+'/'+kind);sourceX=(active?.frame??0)*192;width=height=192;originX=data.origin.x*192;originY=data.origin.y*192;scale=.20;}
  else{img=images.get('item/'+key);r=assets.avatar.itemBounds[key];if(!img||!r)return;width=r.w;height=r.h;originX=r.w*.4;originY=r.h*.6;scale=Math.min(.5,22/Math.max(width,height));}
  const side=direction==='east'||direction==='west',sign=direction==='west'?-1:1,angle=direction==='north'?-1.25:direction==='south'?1.10:0;const recoil=weaponAction?.kind==='fire'?Math.sin(Math.min(1,weaponAction.elapsed/160)*Math.PI)*1.8:0;
  const gx=16+m.center+(side?sign*5:1),gy=12+m.shoulder+10;
  // Bent forearms connect to the grip; hands cover the weapon grip rather than its barrel.
  ctx.save();ctx.translate(gx,gy);if(direction==='west')ctx.scale(-1,1);ctx.rotate(angle);ctx.translate(-recoil,0);ctx.imageSmoothingEnabled=false;ctx.drawImage(img,(r?.x??sourceX),(r?.y??0),width,height,-originX*scale,-originY*scale,width*scale,height*scale);ctx.fillStyle='#b18b68';ctx.fillRect(-2,1,3,3);if(!tool){ctx.fillStyle='#bd9670';ctx.fillRect(7,-1,3,3);}ctx.restore();
  ctx.strokeStyle='#292822';ctx.lineWidth=4;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(16+m.center+(side?-sign*3:-7),12+m.shoulder+3);ctx.lineTo(gx-sign*6,gy+5);ctx.lineTo(gx-1,gy+2);ctx.stroke();ctx.strokeStyle='#b18b68';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(gx-sign*5,gy+4);ctx.lineTo(gx-1,gy+2);ctx.stroke();
  return {key,action:weaponAction?.kind??'idle',frame:weaponAction?.frame??0};
 }
 function compose(ch,direction,action,time,equipment,weaponAction){ctx.clearRect(0,0,128,128);ctx.imageSmoothingEnabled=false;const m=makeBody(ch,direction,action,time),side=direction==='east'||direction==='west',mirror=direction==='west',headX=m.center,headW=side?17:22,headH=Math.max(12,m.shoulder-m.top+2);const pack=equipment.backpack?.key;
  if(pack&&direction!=='north')trim(ctx,pack,16+headX+(side?(mirror?8:-8):0),12+m.shoulder-3,side?15:23,24,mirror);
  ctx.drawImage(body,16,12);
  const torso={x:headX-(side?6:10),y:m.shoulder,w:side?13:20,h:m.hip-m.shoulder+3};
  clothing(equipment.shirt?.key,torso,mirror);clothing(equipment.jacket?.key,{...torso,x:torso.x-3,w:torso.w+6},mirror);
  clothing(equipment.pants?.key,{x:m.left,y:m.hip,w:m.right-m.left+1,h:m.bottom-m.hip+1},mirror);
  clothing(equipment.greaves?.key,{x:m.left,y:m.hip+8,w:m.right-m.left+1,h:m.bottom-m.hip-9},mirror);
  clothing(equipment.boots?.key,{x:m.left,y:m.bottom-6,w:m.right-m.left+1,h:7},mirror);
  if(equipment.vest)trim(ctx,equipment.vest.key,16+headX,12+m.shoulder-2,side?12:20,m.hip-m.shoulder+3,mirror);
  if(pack&&direction==='north')trim(ctx,pack,16+headX,12+m.shoulder-4,22,26);
  if(equipment.head)trim(ctx,equipment.head.key,16+headX,12+m.top-3,headW+3,headH,mirror);
  if(equipment.mask&&direction!=='north')trim(ctx,equipment.mask.key,16+headX+(side?(mirror?-4:4):0),12+m.top+7,side?10:14,14,mirror);
  if(equipment.gloves){for(const sign of [-1,1])trim(ctx,equipment.gloves.key,16+headX+sign*(side?5:10),12+m.hip-4,5,6,mirror);}
  const held=equipment.weapon?.key??equipment.hand?.key;const heldInfo=held?gun(held,m,direction,m,weaponAction,time):null;
  last={character:ch.id,direction,action,frame:m.frame,articulatedWalk:m.walking,legs:m.legs,layers:Object.keys(equipment),weapon:heldInfo};return surface;
 }
 function draw(context,ch,direction,action,time,x,y,scale,equipment={},weaponAction=null){const img=compose(ch,direction,action,time,equipment,weaponAction);context.save();context.imageSmoothingEnabled=false;context.drawImage(img,Math.round(x-64*scale),Math.round(y-84*scale),128*scale,128*scale);context.restore();}
 return {draw,compose,diagnostics:()=>last};
}
