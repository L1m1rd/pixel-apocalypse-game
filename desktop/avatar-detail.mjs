// Detailed canonical survivor skins, keyed at runtime and bound to the animation rig.
export function createDetailSkin(assets,images){
 const skins=new Map(),variants=new Map(),factor=4;
 const canvas=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};
 for(const [id,views]of Object.entries(assets.avatar.detailSkins??{}))for(const [dir,r]of Object.entries(views)){
  const c=canvas(r.w,r.h),s=c.getContext('2d',{willReadFrequently:true});s.drawImage(images.get('avatar-detail'),r.x,r.y,r.w,r.h,0,0,r.w,r.h);const im=s.getImageData(0,0,r.w,r.h),p=im.data;let l=r.w,t=r.h,rt=0,b=0;
  // Chroma key is a runtime material operation; source art stays intact.
  for(let y=0;y<r.h;y++)for(let x=0;x<r.w;x++){const i=(y*r.w+x)*4;if(p[i+1]>p[i]+40&&p[i+1]>p[i+2]+40){p[i+3]=0;continue;}p[i+1]=Math.min(p[i+1],Math.max(p[i],p[i+2])+10);if(p[i+3]>128){l=Math.min(l,x);rt=Math.max(rt,x);t=Math.min(t,y);b=Math.max(b,y);}}
  s.putImageData(im,0,0);const crop=canvas(rt-l+1,b-t+1),sc=crop.getContext('2d',{willReadFrequently:true});sc.drawImage(c,l,t,crop.width,crop.height,0,0,crop.width,crop.height);skins.set(id+'/'+dir,{image:crop,p:sc.getImageData(0,0,crop.width,crop.height).data,w:crop.width,h:crop.height});
 }
 function dressed(skin,key,mats,sample,holding){
  if(variants.has(key))return variants.get(key);const c=canvas(skin.w,skin.h),s=c.getContext('2d'),im=s.createImageData(skin.w,skin.h);im.data.set(skin.p);
  for(let y=0;y<skin.h;y++)for(let x=0;x<skin.w;x++){const i=(y*skin.w+x)*4;if(!im.data[i+3])continue;const u=x/skin.w,v=y/skin.h,arm=(u<.25||u>.75)&&v>.23&&v<.65,hand=arm&&v>.46&&im.data[i]>im.data[i+1]*1.23&&im.data[i]>im.data[i+2]*1.5;let slot=null;
   if(v>.21&&v<.6)slot=hand?(mats.gloves?'gloves':null):arm?(mats.jacket?'jacket':mats.shirt?'shirt':null):(mats.vest?'vest':mats.jacket?'jacket':mats.shirt?'shirt':null);
   if(v>=.6)slot=v>.925&&mats.boots?'boots':v>.79&&mats.greaves?'greaves':mats.pants?'pants':null;
   if(holding&&arm){im.data[i+3]=0;continue;}const mat=mats[slot];if(!mat)continue;const color=sample(mat,Math.max(.06,Math.min(.94,u)),Math.max(.08,Math.min(.92,(v-.21)/.39))),lum=(skin.p[i]*.2126+skin.p[i+1]*.7152+skin.p[i+2]*.0722)/255;for(let k=0;k<3;k++)im.data[i+k]=Math.min(255,color[k]*(.63+lum*.8));
  }s.putImageData(im,0,0);variants.set(key,c);if(variants.size>100)variants.delete(variants.keys().next().value);return c;
 }
 function render(ch,dir,f,p,slotAt,mats,sample,holding){
  const skin=skins.get(ch.id+'/'+dir);if(!skin)return null;const key=ch.id+'/'+dir+'/'+holding+'/'+Object.keys(mats).map(k=>k+':'+mats[k].key).join(','),img=dressed(skin,key,mats,sample,holding),m=f.anatomy,c=canvas(384,384),ctx=c.getContext('2d');ctx.scale(4,4);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';const h=m.bottom-m.top+1,scale=h/skin.h,width=skin.w*scale,center=m.spine.x;
  const band=(y0,y1,ty,th)=>ctx.drawImage(img,0,skin.h*y0,skin.w,skin.h*(y1-y0),center-width/2,ty,width,th);
  // Preserve facial proportions. Only the neck/torso and individual legs deform.
  band(0,.23,m.top,skin.h*.23*scale);
  const torsoTop=m.top+h*.205;band(.205,.61,torsoTop,m.hip+2-torsoTop);
  const feet=f.legs?.map(l=>({x:l.ankle.x,bottom:l.ankle.y}))??m.feet;
  for(let n=0;n<feet.length;n++){
   const foot=feet[n],left=feet.length===1?0:n===0?0:skin.w/2,sw=feet.length===1?skin.w:skin.w/2,sy=skin.h*.6,sh=skin.h*.4;
   const targetCenter=feet.length===1?foot.x:foot.x+(n===0?width*.075:-width*.075),tw=sw*scale,hipX=m.pelvis.x+(n===0?-2:2),bottom=foot.bottom+1,dy=bottom-m.hip;
   ctx.save();ctx.translate(targetCenter,m.hip);ctx.transform(1,0,(targetCenter-hipX)/Math.max(1,dy)*.25,1,0,0);ctx.drawImage(img,left,sy,sw,sh,-tw/2,0,tw,dy);ctx.restore();
  }
  return c;
 }
 return {render,factor};
}
