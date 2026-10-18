const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');let sharp;try{sharp=require('sharp');}catch{sharp=require(path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp'));}
const ROOT=path.resolve(__dirname,'..'),OUT=path.join(ROOT,'assets/wildlife-animations-v1'),read=async p=>JSON.parse(await fs.readFile(p,'utf8')),hash=b=>crypto.createHash('sha256').update(b).digest('hex');
(async()=>{
 const m=await read(path.join(OUT,'manifest.json')),plan=await read(path.join(OUT,'build-plan.json')),selection=await read(path.join(OUT,'selection.json')),old=await read(path.join(ROOT,'assets/wildlife-visuals-v1/manifest.json')),errors=[],warnings=[];let animations=0,frames=0;
 const expected=['stray_dog','brown_bear','wolf','wild_boar','red_deer','roe_deer'].sort();
 if(JSON.stringify(m.attackers.slice().sort())!==JSON.stringify(expected))errors.push('Wrong attacking-species list');
 if(m.selectedVariant!=='B'||selection.selectedVariant!=='B'||old.selectedVariant!=='B')errors.push('Variant B not selected everywhere');
 if(selection.species.length!==20||selection.species.some(c=>c.selectedVariant!=='B'))errors.push('Wrong base selection');
 if(!process.argv.includes('--partial')&&(m.species!==20||m.animations!==284||m.frames!==1704||m.missing.length))errors.push('Incomplete export: '+JSON.stringify({species:m.species,animations:m.animations,frames:m.frames,missing:m.missing}));
 for(const c of m.animals){
  const p=plan.animals.find(p=>p.id===c.id),base=old.species.find(a=>a.id===c.id).variants.find(v=>v.variant==='B');
  if(c.variant!=='B'||c.characterId!==c.id+'_b')errors.push(c.id+': wrong appearance');
  if(JSON.stringify(c.baseHashes)!==JSON.stringify(base.sha256))errors.push(c.id+': reference hashes do not match selected B');
  if(c.attackCapable!==expected.includes(c.id)||c.actions.some(a=>a.id==='attack')&&!c.attackCapable||!process.argv.includes('--partial')&&c.actions.some(a=>a.id==='attack')!==c.attackCapable)errors.push(c.id+': wrong attack role');
  if(!process.argv.includes('--partial')&&c.actions.length!==p.actions.length)errors.push(c.id+': missing actions');
  for(const dir of m.directions){
   const d=c.directions[dir],atlas=await read(path.join(OUT,d.atlas)),crops=await read(path.join(OUT,path.dirname(d.atlas),'source-crops.json')),{data:sheet,info:si}=await sharp(path.join(OUT,d.spritesheet)).ensureAlpha().raw().toBuffer({resolveWithObject:true});
   if(crops.sharedSpeciesScale!==c.sharedScale)errors.push(c.id+'/'+dir+': inconsistent species scale');
   if(si.width!==c.frameSize*6||si.height!==c.frameSize*c.actions.length)errors.push(c.id+'/'+dir+': wrong sheet dimensions');
   const signatures=[];
   for(const a of c.actions){
    const cfg=d.actions[a.id],sums=[];animations++;
    if(!cfg||cfg.files.length!==6||cfg.frames.length!==6){errors.push(c.id+'/'+dir+'/'+a.id+': expected six frames');continue;}
    if(cfg.repeat!==(a.loop?-1:0)||cfg.rootMotion!==false)errors.push(cfg.id+': wrong playback settings');
    if(a.id==='attack'&&(!expected.includes(c.id)||cfg.impactFrame<0||cfg.impactFrame>5||cfg.damageImplemented!==false))errors.push(cfg.id+': invalid attack timing');
    for(let i=0;i<6;i++){
     const file=cfg.files[i],buf=await fs.readFile(path.join(OUT,file)),sha=hash(buf),record=crops.frames.find(r=>r.file===file),rect=atlas.frames[cfg.frames[i]]?.frame;
     if(!record||record.sha256!==sha)errors.push(file+': hash/provenance mismatch');if(!rect)errors.push(file+': missing atlas entry');
     const {data,info}=await sharp(buf).ensureAlpha().raw().toBuffer({resolveWithObject:true});frames++;sums.push(sha);
     if(info.width!==c.frameSize||info.height!==c.frameSize)errors.push(file+': inconsistent frame size');let visible=0,clear=0,edge=0;
     for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){const alpha=data[(y*info.width+x)*4+3];if(alpha===0)clear++;if(alpha>8){visible++;if(x===0||y===0||x===info.width-1||y===info.height-1)edge++;}}
     if(!visible||!clear||edge)errors.push(file+': empty, opaque or clipped frame');
     if(rect){for(let y=0;y<info.height;y++){const s=((rect.y+y)*si.width+rect.x)*4;if(!sheet.subarray(s,s+info.width*4).equals(data.subarray(y*info.width*4,(y+1)*info.width*4))){errors.push(file+': atlas pixels differ');break;}}}
    }
    if(new Set(sums).size<3)errors.push(cfg.id+': insufficient painted motion');else if(new Set(sums).size!==6)warnings.push(cfg.id+': some exact repeated poses');signatures.push({action:a.id,signature:sums.join(':')});
   }
   for(let i=0;i<signatures.length;i++)for(let j=0;j<i;j++)if(signatures[i].signature===signatures[j].signature)errors.push(c.id+'/'+dir+': copied action '+signatures[i].action+'/'+signatures[j].action);
  }
 }
 if(animations!==m.animations||frames!==m.frames)errors.push('Manifest totals mismatch');
 const report={passed:!errors.length,checkedAt:new Date().toISOString(),selectedVariant:'B',species:m.species,animations,frames,attackers:expected,errors,warnings,scope:'PNG integrity and uniqueness, alpha, dimensions, exact atlas pixels, selection B, species-specific action sets and one-shot settings. Gaits, anatomy and facing are reviewed visually; game AI and damage are not implemented.'};await fs.writeFile(path.join(OUT,'verification.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));if(errors.length)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;});
