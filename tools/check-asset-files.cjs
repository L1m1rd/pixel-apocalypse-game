const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const ROOT=path.resolve(__dirname,'..'),SKIP=new Set(['.git','node_modules','.cache','tmp','.tmp']);
const read=async p=>JSON.parse(await fs.readFile(path.join(ROOT,p),'utf8'));
async function main(){
 const config=await read('publication-config.json'),excluded=config.excludedLocalPaths;
 const isExcluded=p=>excluded.some(x=>p===x||p.startsWith(x+'/'));
 async function walk(dir=''){let list=[];for(const e of await fs.readdir(path.join(ROOT,dir),{withFileTypes:true})){const rel=(dir?dir+'/':'')+e.name;if(SKIP.has(e.name)||e.name.startsWith('.env')||e.name.endsWith('.log')||isExcluded(rel))continue;if(e.isDirectory())list.push(...await walk(rel));else list.push(rel);}return list.sort();}
 const files=await walk(),set=new Set(files),errors=[];
 const need=p=>{if(!set.has(p))errors.push('Missing published file: '+p);};
 for(const f of files.filter(f=>f.endsWith('.md'))){
  const content=await fs.readFile(path.join(ROOT,f),'utf8');
  for(const m of content.matchAll(/\]\(([^)]+)\)/g)){
   const target=m[1].replace(/^<|>$/g,'').split('#')[0];if(!target||/^(https?:|mailto:)/.test(target))continue;
   const abs=path.resolve(path.dirname(path.join(ROOT,f)),decodeURIComponent(target)),rel=path.relative(ROOT,abs).split(path.sep).join('/');
   if(rel.startsWith('../')||isExcluded(rel))errors.push(f+': unpublished link '+target);
   else try{await fs.access(abs);}catch{errors.push(f+': missing link '+target);}
  }
 }
 let animations=0,frames=0,corpses=0;
 const pack=await read('assets/infected-redesign-animations-v1/manifest.json');
 for(const c of pack.characters)for(const d of pack.directions){
  for(const a of Object.values(c.directions[d].animations)){animations++;for(const f of a.frames){need('assets/infected-redesign-animations-v1/'+c.id+'/'+d+'/frames/'+f+'.png');frames++;}}
  need('assets/infected-redesign-animations-v1/'+c.id+'/'+d+'/corpse.png');corpses++;
 }
 assert.equal(pack.characters.length,18);assert.equal(animations,672);assert.equal(frames,4032);assert.equal(corpses,72);
 const survivors=await read('assets/survivor-friends-pixel-v1/manifest.json');assert.equal(survivors.characters.length,6);
 for(const c of survivors.characters){need('assets/survivor-friends-pixel-v1/'+c.sprite);need('assets/survivor-friends-pixel-v1/'+c.art);}
 let effectFrames=0;
 for(const base of ['assets/combat-vfx-v1','assets/special-vfx-v1']){
  const m=await read(base+'/manifest.json');for(const e of m.effects)for(const f of e.frames){need(base+(base.includes('combat')?'/effects/':'/')+e.id+'/frames/'+f+'.png');effectFrames++;}
 }
 assert.equal(effectFrames,120);
 need('assets/weapons-pixel-v1/overview.png');
 const env=await read('assets/environment-variants-v1/manifest.json');
 for(const e of env.elements)for(const v of e.variants)for(const f of v.files)need('assets/environment-variants-v1/'+f);
 const entries=[];for(const f of files){const b=await fs.readFile(path.join(ROOT,f));if(b.length>=100*1024*1024)errors.push('GitHub size limit: '+f);if(f!=='docs/asset-inventory.json')entries.push({path:f,bytes:b.length,sha256:crypto.createHash('sha256').update(b).digest('hex')});}
 if(errors.length)throw Error(errors.join('\n'));
 if(process.argv.includes('--inventory'))await fs.writeFile(path.join(ROOT,'docs/asset-inventory.json'),JSON.stringify({description:'Current published files; excludes Git, dependencies, local superseded materials and this inventory.',excludedLocalPaths:excluded,files:entries.length,totalBytes:entries.reduce((s,e)=>s+e.bytes,0),entries},null,2)+'\n');
 console.log(JSON.stringify({publishedFiles:files.length,survivors:6,infected:18,animations,frames,corpses,effectFrames,environmentElements:env.generatedElements,markdownLinksValid:true,allFilesBelow100MiB:true}));
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
