// Exports generated item artwork; does not draw new item shapes or implement interactions.
const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
function dep(n){try{return require(n);}catch{return require(path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules',n));}}
const sharp=dep('sharp'),OUT=path.resolve(__dirname,'../assets/item-visuals-v1'),escape=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const scan=require('./slice-item-components.cjs');
const text=(w,h,title,sub='')=>Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="'+w+'" height="'+h+'"><rect width="100%" height="100%" fill="#1b2820"/><text x="'+w/2+'" y="'+(sub?32:24)+'" text-anchor="middle" fill="#e6e2cf" font-family="Arial" font-size="'+(sub?23:16)+'">'+escape(title)+'</text>'+(sub?'<text x="'+w/2+'" y="54" text-anchor="middle" fill="#adbf9d" font-family="Arial" font-size="12">'+escape(sub)+'</text>':'')+'</svg>');
async function centered(input,size,inside){const meta=await sharp(input).metadata(),scale=Math.min(inside/meta.width,inside/meta.height),w=Math.max(1,Math.round(meta.width*scale)),h=Math.max(1,Math.round(meta.height*scale));return sharp({create:{width:size,height:size,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite([{input:await sharp(input).resize(w,h,{kernel:'nearest'}).png().toBuffer(),left:Math.floor((size-w)/2),top:Math.floor((size-h)/2)}]).png().toBuffer();}
async function main(){
 const catalog=JSON.parse(await fs.readFile(path.join(OUT,'catalog.json'),'utf8')),categories=[];let total=0;
 for(const d of ['art','sprites','sheets'])await fs.mkdir(path.join(OUT,d),{recursive:true});
 for(const c of catalog.categories){
  let bytes;try{bytes=await fs.readFile(path.join(OUT,c.source));}catch{continue;}
  const{data,info}=await sharp(bytes).ensureAlpha().raw().toBuffer({resolveWithObject:true});if(info.width!==1536||info.height!==1024)throw Error(c.id+': expected 1536x1024 source');
  let zeros=0;for(let i=3;i<data.length;i+=4)if(data[i]===0)zeros++;if(zeros<1536*1024*.1)throw Error(c.id+': background is not transparent');
  const components=await scan(path.join(OUT,c.source));
  const items=[],inputs=[{input:await sharp(text(960,64,c.name,'PIXEL APOCALYPSE · СТАТИЧНЫЕ ВИЗУАЛЫ')).png().toBuffer(),left:0,top:0}];
  for(const item of c.items){
   const col=item.cell%3,row=Math.floor(item.cell/3),sx=col*512,sy=row*512;let x0=512,y0=512,x1=-1,y1=-1,visible=0,edge=0;
   for(let y=0;y<512;y++)for(let x=0;x<512;x++){const a=data[((sy+y)*1536+sx+x)*4+3];if(a>64){visible++;x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);if(x<2||y<2||x>509||y>509)edge++;}}
   if(visible<200)throw Error(item.id+': empty cell');
   x0=Math.max(0,x0-2);y0=Math.max(0,y0-2);x1=Math.min(511,x1+2);y1=Math.min(511,y1+2);
   const component=components[item.cell],cropped=component.image;
   const art=await centered(cropped,256,224),spriteSize=c.kind==='inventory'?64:c.kind==='world'?128:96,sprite=await centered(cropped,spriteSize,spriteSize-8);
   await fs.writeFile(path.join(OUT,item.art),art);await fs.writeFile(path.join(OUT,item.sprite),sprite);
   const card=await sharp({create:{width:320,height:352,channels:4,background:'#1b2820'}}).composite([{input:art,left:32,top:24},{input:await sharp(text(320,40,item.name)).png().toBuffer(),left:0,top:296}]).png().toBuffer();inputs.push({input:card,left:col*320,top:64+row*352});
   items.push({...item,artSize:256,spriteSize,sourceBounds:{left:component.x0,top:component.y0,width:component.x1-component.x0+1,height:component.y1-component.y0+1},visibleSourcePixels:component.pixels,sourceEdgePixels:component.canvasEdge,sha256:crypto.createHash('sha256').update(sprite).digest('hex')});total++;
  }
  await sharp({create:{width:960,height:768,channels:4,background:'#1b2820'}}).composite(inputs).png().toFile(path.join(OUT,c.sheet));categories.push({...c,sourceSha256:crypto.createHash('sha256').update(bytes).digest('hex'),sourceTransparentFraction:zeros/(1536*1024),items});console.log(c.id+': 6 visual items');
 }
 const m={status:categories.length===16?'complete-static-visual-prototype':'in-progress',tool:'built-in image_gen',totalCategories:categories.length,totalItems:total,animations:0,gameplayImplemented:false,categories,notes:catalog.notes};await fs.writeFile(path.join(OUT,'manifest.json'),JSON.stringify(m,null,2)+'\n');await fs.writeFile(path.join(OUT,'manifest.js'),'window.ITEM_VISUALS='+JSON.stringify(m)+';\n');
 if(categories.length===16){
  const tiles=[];for(const[i,c]of categories.entries()){const images=[{input:await sharp(text(320,32,c.name)).png().toBuffer(),left:0,top:0}];for(const[j,item]of c.items.entries())images.push({input:await sharp(path.join(OUT,item.art)).resize(112,112,{kernel:'nearest'}).png().toBuffer(),left:j%3*104+4,top:Math.floor(j/3)*128+36});const tile=await sharp({create:{width:320,height:288,channels:4,background:'#1b2820'}}).composite(images).png().toBuffer();tiles.push({input:tile,left:i%4*320,top:Math.floor(i/4)*288});}await sharp({create:{width:1280,height:1152,channels:4,background:'#101a15'}}).composite(tiles).png().toFile(path.join(OUT,'overview.png'));
 }
 console.log(JSON.stringify({categories:categories.length,items:total}));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
