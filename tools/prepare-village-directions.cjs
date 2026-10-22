const fs=require('fs'),path=require('path'),sharp=require('sharp'),crypto=require('crypto');
const ROOT=path.resolve(__dirname,'..'),PACK=path.join(ROOT,'assets/village-directions-v1');
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
async function bounds(input){
 const {data,info}=await sharp(input).ensureAlpha().raw().toBuffer({resolveWithObject:true}),w=info.width,h=info.height,seen=new Uint8Array(w*h),queue=new Int32Array(w*h);let best=null;
 // Atlas cells can contain a detached sliver of their neighbour. Bound the main
 // connected silhouette instead of enlarging the sprite around that sliver.
 for(let start=0;start<w*h;start++){if(seen[start]||data[start*4+3]<=24)continue;let head=0,tail=1,x0=w,y0=h,x1=0,y1=0;queue[0]=start;seen[start]=1;while(head<tail){const p=queue[head++],x=p%w,y=Math.floor(p/w);x0=Math.min(x,x0);y0=Math.min(y,y0);x1=Math.max(x,x1);y1=Math.max(y,y1);for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const xx=x+dx,yy=y+dy,n=yy*w+xx;if(xx<0||xx>=w||yy<0||yy>=h||seen[n]||data[n*4+3]<=24)continue;seen[n]=1;queue[tail++]=n;}}if(!best||tail>best.count)best={x:x0,y:y0,w:x1-x0+1,h:y1-y0+1,count:tail};}
 if(!best)throw Error('Empty view');return {...best,coverage:best.count/(w*h)};
}
async function exportViews(){const registry=JSON.parse(fs.readFileSync(path.join(process.env.PIXEL_ASSET_SOURCE||ROOT,'docs/asset-registry.json'))),bindings=[];
 for(const axial of [false,true])for(const family of ['house','vehicle','table','bed','wardrobe','shelves','stove']){
  for(const variant of family==='house'?[0,1,2,3,4,5]:[0]){
  const source='sources/'+(axial?'axial-':'')+family+(family==='house'?'-'+variant:'')+'.png',input=path.join(PACK,source),m=await sharp(input).metadata(),rows=family==='vehicle'?6:2,cols=rows===6?4:2,canonicalId=family==='vehicle'?'world/car_abandoned':family==='stove'?'item/base-stove':'world/'+family,entity=registry.entities.find(e=>e.id===canonicalId);if(!entity)throw Error('Missing canonical '+canonicalId);
  for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){
   const style=rows===6?row:variant,orientation=(rows===6?col:row*2+col)+(axial?.5:0),id=family+'-'+style+'-'+String(orientation).replace('.','_'),left=Math.round(col*m.width/cols),top=Math.round(row*m.height/rows),width=Math.round((col+1)*m.width/cols)-left,height=Math.round((row+1)*m.height/rows)-top;
   const cell=await sharp(input).extract({left,top,width,height}).png().toBuffer(),r=await bounds(cell);if(r.coverage<.08||r.coverage>.95)throw Error('Invalid cutout '+id);
   const file='sprites/'+id+'.png',dest=path.join(PACK,file);fs.mkdirSync(path.dirname(dest),{recursive:true});await sharp(cell).extract({left:r.x,top:r.y,width:r.w,height:r.h}).extend({top:4,bottom:4,left:4,right:4,background:'#0000'}).png().toFile(dest);const dim=await sharp(dest).metadata();
   bindings.push({id,family,variant:style,orientation,canonicalId,owner:entity.owner,file,source,sourceCrop:{x:left,y:top,w:width,h:height},width:dim.width,height:dim.height,sha256:hash(dest),transparent:true});
  }
 }}
 const manifest={version:2,style:'isometric-eight-directions-v2',role:'style-variants-of-existing-canonical-entities',tool:'built-in image_gen',prompts:'prompts.json',axialPrompts:'axial-prompts.json',orientationOrder:[0,.5,1,1.5,2,2.5,3,3.5],bindings};fs.writeFileSync(path.join(PACK,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');console.log(JSON.stringify({views:bindings.length,canonicalEntities:new Set(bindings.map(b=>b.canonicalId)).size,newEntities:0}));return manifest;
}
async function prepareDirectionalAssets(){const manifest=JSON.parse(fs.readFileSync(path.join(PACK,'manifest.json'))),data={};for(const b of manifest.bindings){const file='directions/'+b.id+'.png',dest=path.join(ROOT,'desktop/media',file);fs.mkdirSync(path.dirname(dest),{recursive:true});if(hash(path.join(PACK,b.file))!==b.sha256)throw Error('Changed direction '+b.id);fs.copyFileSync(path.join(PACK,b.file),dest);data[b.id]={...b,file,source:'assets/village-directions-v1/'+b.file};}fs.writeFileSync(path.join(ROOT,'desktop/media/direction-data.js'),'window.DIRECTION_ASSETS='+JSON.stringify(data)+';\n');fs.writeFileSync(path.join(ROOT,'desktop/media/direction-manifest.json'),JSON.stringify(data,null,2)+'\n');return data;}
module.exports={prepareDirectionalAssets,exportViews};if(require.main===module)(async()=>{if(process.argv.includes('--export'))await exportViews();await prepareDirectionalAssets();})().catch(e=>{console.error(e);process.exitCode=1;});
