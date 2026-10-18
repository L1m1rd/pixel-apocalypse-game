const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const sharp = require('sharp');
const root = path.resolve(__dirname, '..'), dir = path.join(root, 'assets/northern-dachas-v1');
const read = file => JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
async function inspectAlpha(file) {
  const image=sharp(file),meta=await image.metadata();
  assert.equal(meta.hasAlpha,true,'Missing alpha: '+file);
  const {data,info}=await image.ensureAlpha().raw().toBuffer({resolveWithObject:true});
  let transparent=0,solid=0,edge=0;
  for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){
    const a=data[(y*info.width+x)*4+3];
    if(a===0)transparent++;
    if(a>180){solid++;if(x===0||y===0||x===info.width-1||y===info.height-1)edge++;}
  }
  assert(transparent>info.width*info.height*.1,'Opaque background: '+file);
  assert(solid>info.width*info.height*.03,'Missing sprite: '+file);
  assert.equal(edge,0,'Clipped opaque silhouette: '+file);
  return {transparentFraction:transparent/(info.width*info.height),opaqueEdgePixels:edge};
}
async function main(){
  const manifest=read('manifest.json'),plan=read('production-plan.json'),palettes=read('sector-palettes.json');
  const registry=JSON.parse(fs.readFileSync(path.join(root,'docs/asset-registry.json'),'utf8'));
  const policy=JSON.parse(fs.readFileSync(path.join(root,'asset-ownership.json'),'utf8'));
  assert.equal(policy.styleVariantManifests['northern-dachas-v1'],'assets/northern-dachas-v1/manifest.json');
  assert.equal(manifest.bindings.length,31);
  assert.equal(manifest.entities.length,3);
  assert.equal(manifest.references.length,7);
  assert.equal(plan.jobs.length,30);
  assert(plan.jobs.every(j=>j.status==='exported'),'Incomplete production plan');
  const production=[...manifest.bindings,...manifest.entities],rows=[...production,...manifest.references];
  assert.equal(new Set(rows.map(r=>r.file)).size,41);
  assert.equal(new Set(production.map(r=>r.id)).size,34);
  const checked=[],prompts=read(manifest.prompts).jobs;
  for(const row of rows){
    const file=path.resolve(dir,row.file);
    assert(file.startsWith(dir+path.sep),'File outside pack');
    const bytes=fs.readFileSync(file),meta=await sharp(bytes).metadata();
    assert.equal(meta.format,'png');
    assert.equal(digest(bytes),row.sha256,'Changed asset: '+row.file);
    assert.equal(meta.width,row.width);assert.equal(meta.height,row.height);
    const result={id:row.id,width:meta.width,height:meta.height};
    if(row.canonicalId){
      const entity=registry.entities.find(e=>e.id===row.canonicalId);
      assert(entity,'Missing canonical entity '+row.canonicalId);
      assert.deepEqual(entity.owner,row.owner,'Owner changed '+row.id);
      assert(entity.representations.some(rep=>rep.pack==='northern-dachas-v1'&&rep.id===row.id),'Missing registry binding '+row.id);
      if(manifest.entities.includes(row))assert.deepEqual(policy.worldEntityOwners[row.canonicalId],row.owner);
      if(row.kind==='sprite')result.alpha=await inspectAlpha(file);
      else{
        assert.equal(meta.width,512);assert.equal(meta.height,512);
        const m=row.tiling.metrics;
        assert(Number.isFinite(m.edgeMeanX)&&Number.isFinite(m.edgeMeanY));
        assert(m.edgeMeanX<=m.neighborMeanX*2.25&&m.edgeMeanY<=m.neighborMeanY*2.25,'Strong boundary discontinuity: '+row.id);
        result.seamDiagnosticPassed=true;
      }
      if(row.source){
        const source=fs.readFileSync(path.join(dir,row.source));
        assert.equal(digest(source),row.sourceMetadata.sha256,'Changed source '+row.id);
        const sm=await sharp(source).metadata();
        assert(sm.width>=900&&sm.height>=900,'Source too small');
        if(row.kind==='sprite')await inspectAlpha(path.join(dir,row.source));
        assert(prompts.some(j=>j.source===row.source&&j.prompt.length>100),'Missing production prompt '+row.id);
      }else assert(prompts.some(j=>j.file===row.file&&j.prompt.length>100),'Missing original prompt');
    }else assert(prompts.some(j=>j.file===row.file&&j.prompt.length>100),'Missing reference prompt');
    checked.push(result);
  }
  const layout=read('layout.json');
  assert.equal(layout.scalePlan.relativeAreaTarget,2);
  assert.equal(layout.sectors.length,8);
  assert.equal(layout.primaryDistrictMap,manifest.primaryDistrictMap);
  assert.equal(palettes.sectors.length,8);
  for(const name of layout.sectors)assert(palettes.sectors.some(s=>s.name===name),'Missing sector '+name);
  for(const sector of palettes.sectors)for(const id of sector.assets)assert(production.some(a=>a.id===id),'Missing sector asset '+id);
  for(const row of production)assert(palettes.sectors.some(s=>s.assets.includes(row.id)),'Unassigned production asset');
  const html=fs.readFileSync(path.join(dir,'textures.html'),'utf8');
  for(const row of production)assert(html.includes('data-id="'+row.id+'"'),'Missing gallery card');
  for(const file of ['review/terrain-repeat-contact.png','review/sprite-contact.png'])assert(fs.existsSync(path.join(dir,file)));
  const report={passed:true,individualProductionImages:production.length,newExports:plan.jobs.length,surfaceTiles:production.filter(r=>r.kind==='tile').length,isolatedSprites:production.filter(r=>r.kind==='sprite').length,newWorldEntities:manifest.entities.length,sectorPalettes:palettes.sectors.length,canonicalReferencesVerified:true,seamDiagnosticsPassed:true,strictSeamlessVerified:false,runtimeIntegrated:!!manifest.runtime?.integrated,checked};
  fs.writeFileSync(path.join(dir,'validation-report.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({...report,checked:undefined}));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
