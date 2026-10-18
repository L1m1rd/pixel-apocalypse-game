// Assign whole disconnected components to six item cells, preserving parts that cross an invisible cell boundary.
const path=require('node:path'),os=require('node:os');let sharp;try{sharp=require('sharp');}catch{sharp=require(path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp'));}
module.exports=async function(source){
 const{data,info}=await sharp(source).ensureAlpha().raw().toBuffer({resolveWithObject:true}),W=info.width,H=info.height,N=W*H;
 if(W!==1536||H!==1024)throw Error('Expected 1536x1024');const labels=new Int32Array(N),queue=new Int32Array(N),parts=[null];
 for(let seed=0;seed<N;seed++){
  if(labels[seed]||data[seed*4+3]<=64)continue;const id=parts.length;let head=0,tail=1,sx=0,sy=0;labels[seed]=id;queue[0]=seed;
  while(head<tail){const p=queue[head++],x=p%W,y=Math.floor(p/W);sx+=x;sy+=y;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const xx=x+dx,yy=y+dy;if(xx<0||xx>=W||yy<0||yy>=H)continue;const q=yy*W+xx;if(!labels[q]&&data[q*4+3]>64){labels[q]=id;queue[tail++]=q;}}}
  parts.push({owner:Math.min(1,Math.floor(sy/tail/512))*3+Math.min(2,Math.floor(sx/tail/512)),pixels:tail});
 }
 const assigned=new Uint8Array(N);for(let p=0;p<N;p++)if(labels[p])assigned[p]=parts[labels[p]].owner+1;const original=assigned.slice();
 for(let p=0;p<N;p++)if(!assigned[p]&&data[p*4+3]>0){const x=p%W,y=Math.floor(p/W);let best=Infinity;for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){const xx=x+dx,yy=y+dy;if(xx<0||xx>=W||yy<0||yy>=H)continue;const o=original[yy*W+xx],dist=dx*dx+dy*dy;if(o&&dist<best){best=dist;assigned[p]=o;}}}
 const cells=Array.from({length:6},()=>({x0:W,y0:H,x1:-1,y1:-1,pixels:0,canvasEdge:0}));for(let p=0;p<N;p++)if(assigned[p]){const c=cells[assigned[p]-1],x=p%W,y=Math.floor(p/W);c.x0=Math.min(c.x0,x);c.x1=Math.max(c.x1,x);c.y0=Math.min(c.y0,y);c.y1=Math.max(c.y1,y);if(data[p*4+3]>64){c.pixels++;if(x===0||y===0||x===W-1||y===H-1)c.canvasEdge++;}}
 for(let k=0;k<6;k++){const c=cells[k],w=c.x1-c.x0+1,h=c.y1-c.y0+1;if(c.pixels<200||w>650||h>650)throw Error('Empty or merged item '+k);if(c.canvasEdge>10)throw Error('Item clipped by source image edge '+k);const bytes=Buffer.alloc(w*h*4);for(let y=c.y0;y<=c.y1;y++)for(let x=c.x0;x<=c.x1;x++){const p=y*W+x;if(assigned[p]===k+1)data.copy(bytes,((y-c.y0)*w+x-c.x0)*4,p*4,p*4+4);}c.image=await sharp(bytes,{raw:{width:w,height:h,channels:4}}).png().toBuffer();}
 return cells;
};
