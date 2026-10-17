// Separates disconnected sprite silhouettes without cutting limbs at rectangular grid lines.
// Artwork and poses are unchanged. Only per-frame extraction and alpha-edge ownership.
const sharp=require('sharp');
module.exports=async function scan(source,options={}){
 const {data,info}=await sharp(source).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const W=info.width,H=info.height,N=W*H;
 if(W!==1536||H!==1024)throw Error(source+': expected 1536x1024');
 const labels=new Int32Array(N),queue=new Int32Array(N),components=[null];
 for(let seed=0;seed<N;seed++){
  if(labels[seed]||data[seed*4+3]<=64)continue;
  const id=components.length;let head=0,tail=1,sx=0,sy=0,x0=W,y0=H,x1=0,y1=0;queue[0]=seed;labels[seed]=id;
  while(head<tail){const p=queue[head++],x=p%W,y=Math.floor(p/W);sx+=x;sy+=y;x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);
   for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const xx=x+dx,yy=y+dy;if(xx<0||xx>=W||yy<0||yy>=H)continue;const q=yy*W+xx;if(!labels[q]&&data[q*4+3]>64){labels[q]=id;queue[tail++]=q;}}
  }
  components.push({id,n:tail,cx:sx/tail,cy:sy/tail,x0,y0,x1,y1});
 }
 const mains=Array(24).fill(null);
 for(const c of components.slice(1)){
  const slot=Math.min(3,Math.floor(c.cy/256))*6+Math.min(5,Math.floor(c.cx/256));
  if(!mains[slot]||mains[slot].n<c.n)mains[slot]=c;
 }
 if(mains.some(c=>!c||c.n<(options.minMainPixels??1000)))throw Error(source+': cannot find 24 separate main silhouettes');
 const owners=new Int16Array(components.length);
 for(const c of components.slice(1)){
  if(options.cellCenters){let best=Infinity,owner=0;for(let row=0;row<4;row++)for(let col=0;col<6;col++){const d=(c.cx-options.cellCenters.x[col])**2+(c.cy-options.cellCenters.y[row])**2;if(d<best){best=d;owner=row*6+col;}}owners[c.id]=owner+1;continue;}
  let owner=mains.indexOf(c);
  if(owner<0){let best=Infinity;for(let k=0;k<24;k++){const m=mains[k];const dx=Math.max(m.x0-c.cx,0,c.cx-m.x1),dy=Math.max(m.y0-c.cy,0,c.cy-m.y1);const d=dx*dx+dy*dy+.002*((m.cx-c.cx)**2+(m.cy-c.cy)**2);if(d<best){best=d;owner=k;}}}
  owners[c.id]=owner+1;
 }
 const assignment=new Uint8Array(N);
 for(let p=0;p<N;p++)if(labels[p])assignment[p]=owners[labels[p]];
 // Preserve faint antialiased pixels only adjacent to the extracted silhouette.
 const original=assignment.slice();
 for(let p=0;p<N;p++)if(!assignment[p]&&data[p*4+3]>0){const x=p%W,y=Math.floor(p/W);let best=Infinity,owner=0;
  for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){const xx=x+dx,yy=y+dy;if(xx<0||xx>=W||yy<0||yy>=H)continue;const o=original[yy*W+xx],d=dx*dx+dy*dy;if(o&&d<best){best=d;owner=o;}}
  assignment[p]=owner;
 }
 const cells=Array.from({length:24},(_,i)=>({row:Math.floor(i/6),col:i%6,x0:W,y0:H,x1:-1,y1:-1,severedPixels:0}));
 for(let p=0;p<N;p++)if(assignment[p]){const c=cells[assignment[p]-1],x=p%W,y=Math.floor(p/W);c.x0=Math.min(c.x0,x);c.x1=Math.max(c.x1,x);c.y0=Math.min(c.y0,y);c.y1=Math.max(c.y1,y);}
 for(let k=0;k<24;k++){
  const c=cells[k],w=c.x1-c.x0+1,h=c.y1-c.y0+1;
  if(w>390||h>300)throw Error(source+': suspected connected/merged frames at '+k+' ('+w+'x'+h+')');
  const pixels=Buffer.alloc(w*h*4);
  for(let y=c.y0;y<=c.y1;y++)for(let x=c.x0;x<=c.x1;x++){const p=y*W+x;if(assignment[p]===k+1)data.copy(pixels,((y-c.y0)*w+x-c.x0)*4,p*4,p*4+4);}
  c.image=await sharp(pixels,{raw:{width:w,height:h,channels:4}}).png().toBuffer();
 }
 return cells;
};
