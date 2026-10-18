const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');let sharp;try{sharp=require('sharp');}catch{sharp=require(path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp'));}
const root=path.resolve(__dirname,'../assets/wildlife-visuals-v1'),hash=b=>crypto.createHash('sha256').update(b).digest('hex');
(async()=>{
 const m=JSON.parse(await fs.readFile(path.join(root,'manifest.json'),'utf8')),errors=[],warnings=[];let count=0;
 if(m.missing.length&&!process.argv.includes('--partial'))errors.push('Missing species: '+m.missing.join(', '));
 for(const a of m.species){
  if(a.variants.length!==3)errors.push(a.id+': expected 3 variants');const signatures=[];
  for(const v of a.variants){
   const sums=[];if(Object.keys(v.files).length!==4)errors.push(v.id+': expected 4 directions');
   for(const d of m.directions){
    const p=path.join(root,v.files[d]),buf=await fs.readFile(p),sum=hash(buf);sums.push(sum);count++;
    if(sum!==v.sha256[d])errors.push(v.id+'/'+d+': hash mismatch');
    const {data,info}=await sharp(buf).ensureAlpha().raw().toBuffer({resolveWithObject:true});if(info.width!==a.canvas||info.height!==a.canvas)errors.push(v.id+'/'+d+': wrong dimensions');let clear=0,solid=0,edge=0;
    for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){const alpha=data[(y*info.width+x)*4+3];if(alpha===0)clear++;if(alpha>12){solid++;if(x===0||y===0||x===info.width-1||y===info.height-1)edge++;}}
    if(!clear||!solid)errors.push(v.id+'/'+d+': missing transparency or empty image');if(edge)errors.push(v.id+'/'+d+': export touches canvas edge');
   }
   signatures.push(sums.join(':'));if(new Set(sums).size<4)warnings.push(v.id+': duplicated directional PNGs');
   const atlas=JSON.parse(await fs.readFile(path.join(root,v.atlas),'utf8')),sheet=await sharp(path.join(root,v.sheet)).metadata();if(sheet.width!==a.canvas*4||sheet.height!==a.canvas||Object.keys(atlas.frames).length!==4)errors.push(v.id+': invalid atlas');
  }
  if(new Set(signatures).size!==3)errors.push(a.id+': duplicate appearance variants');warnings.push(...a.warnings.map(w=>a.id+': '+w));
 }
 if(count!==m.spriteCount||m.designs!==m.speciesCount*3)errors.push('Manifest count mismatch');
 const report={passed:!errors.length,checkedAt:new Date().toISOString(),species:m.speciesCount,designs:m.designs,pngSprites:count,missing:m.missing,errors,warnings,scope:'File integrity, counts, unique variants, alpha, dimensions and atlases. Anatomy, direction and style are reviewed visually; game integration not tested.'};await fs.writeFile(path.join(root,'verification.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));if(errors.length)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;});
