// Extract existing painted silhouettes intact; never synthesize poses or in-between frames.
const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto'),os=require('node:os');let sharp;try{sharp=require('sharp');}catch{sharp=require(path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp'));}
module.exports=async function scan(file,cacheRoot){
 const source=await fs.readFile(file),sha=crypto.createHash('sha256').update(source).digest('hex'),cache=cacheRoot&&path.join(cacheRoot,path.basename(file,'.png'));
 if(cache)try{const old=JSON.parse(await fs.readFile(path.join(cache,'cells.json'),'utf8'));if(old.sha===sha&&old.version===1){for(const c of old.cells)c.image=await fs.readFile(path.join(cache,c.file));return old;}}catch{}
 const {data,info}=await sharp(source).ensureAlpha().raw().toBuffer({resolveWithObject:true}),W=info.width,H=info.height,N=W*H,cw=W/6,ch=H/4;
 const labels=new Int32Array(N),queue=new Int32Array(N),components=[null];
 for(let seed=0;seed<N;seed++){
  if(labels[seed]||data[seed*4+3]<=64)continue;const id=components.length;let head=0,tail=1,sx=0,sy=0,x0=W,y0=H,x1=-1,y1=-1;queue[0]=seed;labels[seed]=id;
  while(head<tail){const p=queue[head++],x=p%W,y=Math.floor(p/W);sx+=x;sy+=y;x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);
   for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const xx=x+dx,yy=y+dy;if(xx<0||xx>=W||yy<0||yy>=H)continue;const q=yy*W+xx;if(!labels[q]&&data[q*4+3]>64){labels[q]=id;queue[tail++]=q;}}
  }components.push({id,n:tail,cx:sx/tail,cy:sy/tail,x0,y0,x1,y1});
 }
 const mains=Array(24).fill(null);
 for(const c of components.slice(1)){const k=Math.min(3,Math.floor(c.cy/ch))*6+Math.min(5,Math.floor(c.cx/cw));if(!mains[k]||mains[k].n<c.n)mains[k]=c;}
 if(mains.some(c=>!c||c.n<80))throw Error(path.basename(file)+': cannot identify 24 distinct animal silhouettes');
 const owners=new Uint8Array(components.length);
 for(const c of components.slice(1)){
  let owner=mains.indexOf(c);
  if(owner<0){let best=Infinity;for(let k=0;k<24;k++){const m=mains[k],dx=Math.max(m.x0-c.cx,0,c.cx-m.x1),dy=Math.max(m.y0-c.cy,0,c.cy-m.y1),d=dx*dx+dy*dy+.002*((m.cx-c.cx)**2+(m.cy-c.cy)**2);if(d<best){best=d;owner=k;}}if(c.n<=2&&best>(cw*.10)**2)continue;}
  owners[c.id]=owner+1;
 }
 const assignment=new Uint8Array(N);for(let p=0;p<N;p++)if(labels[p])assignment[p]=owners[labels[p]];
 const original=assignment.slice();for(let p=0;p<N;p++)if(!assignment[p]&&data[p*4+3]>0){const x=p%W,y=Math.floor(p/W);let best=Infinity,owner=0;for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){const xx=x+dx,yy=y+dy;if(xx<0||xx>=W||yy<0||yy>=H)continue;const o=original[yy*W+xx],d=dx*dx+dy*dy;if(o&&d<best){best=d;owner=o;}}assignment[p]=owner;}
 const cells=Array.from({length:24},(_,k)=>({row:Math.floor(k/6),col:k%6,x0:W,y0:H,x1:-1,y1:-1,pixels:0}));
 for(let p=0;p<N;p++)if(assignment[p]){const c=cells[assignment[p]-1],x=p%W,y=Math.floor(p/W);c.x0=Math.min(c.x0,x);c.x1=Math.max(c.x1,x);c.y0=Math.min(c.y0,y);c.y1=Math.max(c.y1,y);c.pixels++;}
 if(cache)await fs.mkdir(cache,{recursive:true});
 for(const c of cells){const w=c.x1-c.x0+1,h=c.y1-c.y0+1;if(w>cw*1.5||h>ch*1.5)throw Error(path.basename(file)+': connected or oversized frames at '+c.row+','+c.col);const raw=Buffer.alloc(w*h*4);for(let y=c.y0;y<=c.y1;y++)for(let x=c.x0;x<=c.x1;x++){const p=y*W+x;if(assignment[p]===c.row*6+c.col+1)data.copy(raw,((y-c.y0)*w+x-c.x0)*4,p*4,p*4+4);}c.image=await sharp(raw,{raw:{width:w,height:h,channels:4}}).png().toBuffer();c.file=c.row+'-'+c.col+'.png';if(cache)await fs.writeFile(path.join(cache,c.file),c.image);}
 const result={version:1,sha,width:W,height:H,cellWidth:cw,cellHeight:ch,cells};if(cache)await fs.writeFile(path.join(cache,'cells.json'),JSON.stringify({...result,cells:cells.map(({image,...c})=>c)},null,2)+'\n');return result;
};
