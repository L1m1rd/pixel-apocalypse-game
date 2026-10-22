const fs=require('fs'),path=require('path'),sharp=require('sharp');
module.exports=async function capture(page,out){
 for(const direction of ['east','west','south','north'])for(const action of ['walk','run']){
  const result=await page.evaluate(async({direction,action})=>{
   const {actorFrame}=await import('./actor-motion.mjs'),{moveToward}=await import('./survival-world.mjs'),{unproject,setProjectionMode}=await import('./item-lab-movement.mjs');setProjectionMode('isometric');
   const defs=window.GAME_ASSETS.survival.actors,ids=Object.keys(defs).filter(id=>/^\d/.test(id)),loaded={},actors={};for(const id of ids){const img=new Image();img.src='media/'+defs[id].files[direction];await img.decode();loaded[id]=img;actors[id]={skin:id,x:0,y:0,direction,action,elapsed:0};}
   const v={east:[1,0],west:[-1,0],south:[0,1],north:[0,-1]}[direction],target=unproject(v[0]*10000,v[1]*10000),frames=[],visited={};
   for(let frame=0;frame<36;frame++){const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=570;const c=canvas.getContext('2d');c.fillStyle='#253529';c.fillRect(0,0,1080,570);c.imageSmoothingEnabled=false;
    for(const [i,id]of ids.entries()){const d=defs[id],a=actors[id];a.elapsed+=40;moveToward(a,target,.04,action==='run'?65:48,[]);if(a.direction!==direction||a.action!==action)throw Error('Facing/action mismatch '+id);const f=actorFrame(a,d);(visited[id]??=new Set()).add(f.frame);const x=i%6*180+90,y=Math.floor(i/6)*190+150,scale=f.scale*1.8;c.drawImage(loaded[id],f.x,f.y,f.w,f.h,x-f.w*scale*f.originX,y-f.h*scale*f.originY,f.w*scale,f.h*scale);c.fillStyle='#e7e2c3';c.font='13px Consolas';c.textAlign='center';c.fillText(id+' · '+action+' '+direction,x,y+24);}
    frames.push(canvas.toDataURL());
   }for(const id of ids)if(visited[id].size!==6)throw Error('Incomplete stride '+id);return frames;
  },{direction,action});
  const images=result.map(v=>Buffer.from(v.split(',')[1],'base64'));await sharp(images,{join:{animated:true}}).gif({delay:40,loop:0}).toFile(path.join(out,'motion-'+action+'-'+direction+'.gif'));if(direction==='east'&&action==='walk')fs.writeFileSync(path.join(out,'motion-walk-east-frame.png'),images[9]);
 }
};
