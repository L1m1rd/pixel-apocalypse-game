const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
let sharp;try{sharp=require('sharp');}catch{sharp=require(path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp'));}
const root=path.resolve(__dirname,'../assets/environment-variants-v1');
(async()=>{
 const m=JSON.parse(await fs.readFile(path.join(root,'manifest.json'),'utf8')),errors=[],warnings=[];let png=0;
 const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
 for(const e of m.elements){
  if(e.variants.length!==3)errors.push(e.id+': not three variants');
  const signatures=[];
  for(const v of e.variants){
   if(v.files.length!==(e.kind==='animation'?6:1))errors.push(v.id+': wrong frame count');
   const shas=[];
   for(let i=0;i<v.files.length;i++){
    const b=await fs.readFile(path.join(root,v.files[i])),s=hash(b);shas.push(s);if(s!==v.sha256[i])errors.push(v.files[i]+': hash mismatch');
    const {data,info}=await sharp(b).ensureAlpha().raw().toBuffer({resolveWithObject:true});png++;
    if(info.width!==v.width||info.height!==v.height)errors.push(v.files[i]+': inconsistent frame dimensions');
    let visible=0,transparent=0;for(let p=3;p<data.length;p+=4){if(data[p]>8)visible++;if(data[p]===0)transparent++;}
    if(!visible&&e.kind!=='animation')errors.push(v.files[i]+': empty static image');
    if(['prop','road','animation'].includes(e.kind)&&!transparent)errors.push(v.files[i]+': no transparent pixels');
    if(['terrain','transition'].includes(e.kind)&&transparent)errors.push(v.files[i]+': hole in opaque terrain');
   }
   signatures.push(shas.join(':'));
   if(e.kind==='animation'){
    if(new Set(shas).size<3)warnings.push(v.id+': little temporal change');
    const atlas=JSON.parse(await fs.readFile(path.join(root,v.atlas),'utf8')),sheet=await sharp(path.join(root,v.spritesheet)).metadata();
    if(sheet.width!==v.width*6||sheet.height!==v.height||Object.keys(atlas.frames).length!==6)errors.push(v.id+': bad spritesheet or atlas');
   }
  }
  if(new Set(signatures).size!==3)errors.push(e.id+': duplicated variants');
  warnings.push(...e.warnings.map(w=>e.id+': '+w));
 }
 if(m.generatedElements!==m.elements.length)errors.push('manifest count mismatch');
 if(m.missing.length&&!process.argv.includes('--partial'))errors.push('Not generated: '+m.missing.join(', '));
 const report={checkedAt:new Date().toISOString(),elements:m.elements.length,variants:m.elements.length*3,pngFrames:png,planned:m.plannedElements,missing:m.missing,errors,warnings,passed:!errors.length,scope:'File integrity, uniqueness, alpha and dimensions. Does not verify seamless terrain, road connection geometry or game integration.'};
 await fs.writeFile(path.join(root,'verification.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));if(errors.length)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;});
