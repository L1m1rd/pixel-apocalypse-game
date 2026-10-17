// Review layout and archiving only; creature artwork is generated with image_gen.
const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
const sharp=require('sharp'),JSZip=require('jszip');
const ROOT=path.resolve(__dirname,'..'),OUT=path.join(ROOT,'assets/infected-redesign-realistic-v1');
const esc=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
async function main(){
 const data=JSON.parse(await fs.readFile(path.join(OUT,'prototypes.json'),'utf8')),records=[],overviews=[];
 for(const[typeIndex,t]of data.types.entries()){
  const inputs=[];
  for(const[i,v]of t.variants.entries()){
   const file=path.join(OUT,'art',v.code+'.png'),bytes=await fs.readFile(file),meta=await sharp(bytes).metadata();if(meta.width<1000||meta.height<1000)throw Error('Low resolution '+v.code);
   records.push({id:v.code,type:t.id,name:v.name,file:'art/'+v.code+'.png',width:meta.width,height:meta.height,bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')});
   const photo=await sharp(bytes).resize(512,768,{fit:'contain',background:'#171c1a'}).png().toBuffer();inputs.push({input:photo,left:i*512,top:0});
   const label=Buffer.from(`<svg width="512" height="78" xmlns="http://www.w3.org/2000/svg"><rect width="512" height="78" fill="#18211d"/><text x="24" y="32" fill="#f0ede1" font-family="Arial" font-size="24" font-weight="bold">${esc(v.code+' · '+v.name)}</text><text x="24" y="60" fill="#aebbad" font-family="Arial" font-size="17">${esc(t.name)}</text></svg>`);inputs.push({input:label,left:i*512,top:768});
  }
  const board=await sharp({create:{width:1536,height:846,channels:3,background:'#171c1a'}}).composite(inputs).png().toBuffer();await fs.writeFile(path.join(OUT,'comparisons',t.id+'.png'),board);
  overviews.push({input:await sharp(board).resize(1152,635).png().toBuffer(),left:0,top:typeIndex*635});
 }
 await fs.writeFile(path.join(OUT,'overview.png'),await sharp({create:{width:1152,height:3810,channels:3,background:'#171c1a'}}).composite(overviews).png().toBuffer());
 if(records.length!==18||new Set(records.map(r=>r.sha256)).size!==18)throw Error('Expected eighteen distinct original images');
 const report={originalImages:records.length,types:data.types.length,variantsPerType:3,comparisonBoards:6,uniqueImages:true,pixelArtCreated:false,selectionStatus:data.status,gradeSystem:data.gradeSystem||null,files:records};await fs.writeFile(path.join(OUT,'verification.json'),JSON.stringify(report,null,2)+'\n');
 const z=new JSZip();async function walk(dir,prefix=''){for(const f of await fs.readdir(dir,{withFileTypes:true})){const rel=prefix+f.name;if(f.isDirectory())await walk(path.join(dir,f.name),rel+'/');else z.file(rel,await fs.readFile(path.join(dir,f.name)));}}await walk(OUT);const archive=await z.generateAsync({type:'nodebuffer',compression:'DEFLATE',compressionOptions:{level:6}});if(archive.length>=100*1024*1024)throw Error('Archive exceeds GitHub file limit');await JSZip.loadAsync(archive,{checkCRC32:true});await fs.writeFile(path.join(ROOT,'output/infected-redesign-realistic-v1.zip'),archive);console.log(JSON.stringify({images:18,comparisons:6,archiveBytes:archive.length,crcVerified:true}));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
