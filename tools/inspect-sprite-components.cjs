const sharp=require('sharp');
async function main(){
 const {data,info}=await sharp(process.argv[2]).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const {width:w,height:h}=info, seen=new Uint8Array(w*h),q=new Int32Array(w*h),comps=[];
 for(let seed=0;seed<w*h;seed++){
  if(seen[seed]||data[seed*4+3]<=64)continue;
  let head=0,tail=1,n=0,sx=0,sy=0,x0=w,y0=h,x1=0,y1=0;q[0]=seed;seen[seed]=1;
  while(head<tail){const i=q[head++],x=i%w,y=Math.floor(i/w);n++;sx+=x;sy+=y;x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);
   for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const xx=x+dx,yy=y+dy;if(xx<0||xx>=w||yy<0||yy>=h)continue;const j=yy*w+xx;if(!seen[j]&&data[j*4+3]>64){seen[j]=1;q[tail++]=j;}}
  }
  if(n>1000)comps.push({n,cell:[Math.floor(sy/n/256),Math.floor(sx/n/256)],bbox:[x0,y0,x1-x0+1,y1-y0+1]});
 }
 console.log(JSON.stringify(comps));
}
main();
