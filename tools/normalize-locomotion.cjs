const sharp=require('sharp');
function measure(data,width,height){
 let top=height,left=width,right=-1,bottom=-1;
 const rows=[];for(let y=0;y<height;y++){let n=0;for(let x=0;x<width;x++)if(data[(y*width+x)*4+3]>96){n++;left=Math.min(left,x);right=Math.max(right,x);bottom=Math.max(bottom,y);}rows.push(n);}
 for(let y=0;y<height-2;y++)if(rows[y]>=3&&rows[y+1]>=3&&rows[y+2]>=3){top=y;break;}
 if(top===height)throw Error('No visible character');
 const headHeight=Math.max(7,Math.round((bottom-top+1)*.21));let weight=0,sum=0;
 for(let y=top;y<Math.min(height,top+headHeight);y++)for(let x=0;x<width;x++){const a=data[(y*width+x)*4+3]/255;if(a>.25){sum+=x*a;weight+=a;}}
 return {headX:sum/weight,headY:top,left,right,bottom,height:bottom-top+1};
}
async function normalize(input,{headY,lockY=false,bodyBob=0,targetX=48}={}){
 const {data,info}=await sharp(input).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const before=measure(data,info.width,info.height);const dx=Math.round(targetX-before.headX);
 const dy=headY===undefined?0:Math.round(headY-before.headY+(lockY?0:bodyBob));
 const out=Buffer.alloc(data.length);let clipped=0;
 for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){const from=(y*info.width+x)*4;if(!data[from+3])continue;const nx=x+dx,ny=y+dy;if(nx<0||nx>=info.width||ny<0||ny>=info.height){if(data[from+3]>96)clipped++;continue;}data.copy(out,(ny*info.width+nx)*4,from,from+4);}
 if(clipped)throw Error('Registration clips '+clipped+' visible pixels');
 const after=measure(out,info.width,info.height);
 return {image:await sharp(out,{raw:info}).png().toBuffer(),before,after,dx,dy};
}
module.exports={normalize,measure};
