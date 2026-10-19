const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),sharp=require('sharp');
const ROOT=path.resolve(__dirname,'..');
async function prepareDistrict(data,out){
 const pack=path.join(ROOT,'assets/northern-dachas-v1'),manifest=JSON.parse(fs.readFileSync(path.join(pack,'manifest.json'),'utf8'));
 const assets={};fs.mkdirSync(path.join(out,'dachas'),{recursive:true});
 for(const row of [...manifest.bindings,...manifest.entities]){
  const src=path.join(pack,row.file),bytes=fs.readFileSync(src),sha=crypto.createHash('sha256').update(bytes).digest('hex');
  if(sha!==row.sha256)throw Error('Changed northern asset '+row.id);
  const file='dachas/'+row.id+'.png';fs.copyFileSync(src,path.join(out,file));
  const item={file,kind:row.kind,canonicalId:row.canonicalId,title:row.title,visualPass:row.visualPass,category:row.category,width:row.width,height:row.height,sha256:sha,source:'assets/northern-dachas-v1/'+row.file};
  if(row.kind==='sprite'){
   const {data:pixels,info}=await sharp(bytes).ensureAlpha().raw().toBuffer({resolveWithObject:true});let x0=info.width,y0=info.height,x1=0,y1=0;
   for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++)if(pixels[(y*info.width+x)*4+3]>24){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}
   if(x0>x1||y0>y1)throw Error('Empty sprite '+row.id);
   item.contentBounds={x:x0,y:y0,w:x1-x0+1,h:y1-y0+1};
  }
  assets[row.id]=item;
 }
 data.northernDachas={mapId:'northern-dachas-v1',assets,plots:80,sectors:8};
 return data.northernDachas;
}
module.exports={prepareDistrict};
if(require.main===module){
 const out=path.join(ROOT,'desktop/media'),file=path.join(out,'asset-manifest.json'),data=JSON.parse(fs.readFileSync(file,'utf8'));
 prepareDistrict(data,out).then(()=>{fs.writeFileSync(file,JSON.stringify(data,null,2));fs.writeFileSync(path.join(out,'data.js'),'window.GAME_ASSETS='+JSON.stringify(data)+';\n');console.log(JSON.stringify({assets:Object.keys(data.northernDachas.assets).length}));}).catch(e=>{console.error(e);process.exitCode=1;});
}
