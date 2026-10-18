const fs=require('fs'),path=require('path'),sharp=require('sharp');
const slice=require('./slice-grid-silhouettes.cjs');
const root=path.resolve(__dirname,'../desktop/art/locomotion-v2');
async function main(){
 const records=JSON.parse(fs.readFileSync(path.join(root,'generation-records.json'),'utf8'));const all=[];
 for(const job of records.characters){
  const file=path.join(root,'sources',job.id+'.png');const meta=await sharp(file).metadata();if(!meta.hasAlpha)throw Error('Missing transparency '+job.id);
  const cells=await slice(file);const scale=54/Math.max(...cells.map(c=>c.height));
  for(const c of cells){const dir=c.row===0?'west':'east',dest=path.join(root,job.id,dir);fs.mkdirSync(dest,{recursive:true});const w=Math.round(c.width*scale),h=Math.round(c.height*scale);const sprite=await sharp(c.image).resize(w,h,{kernel:'nearest'}).png().toBuffer();const buf=await sharp({create:{width:96,height:96,channels:4,background:'#00000000'}}).composite([{input:sprite,left:Math.round((96-w)/2),top:20}]).png().toBuffer();fs.writeFileSync(path.join(dest,'run-'+c.col+'.png'),buf);all.push({character:job.id,direction:dir,frame:c.col,sourceBounds:{left:c.left,top:c.top,width:c.width,height:c.height},commonScale:scale});}
  console.log(job.id+': 16 side-run poses, full silhouettes retained');
 }
 fs.writeFileSync(path.join(root,'export.json'),JSON.stringify({frames:all.length,nearFarPhases:'8 poses, full two-step cycle',records:all},null,2));
}
main().catch(e=>{console.error(e);process.exit(1)});
