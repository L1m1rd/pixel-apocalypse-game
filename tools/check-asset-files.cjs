const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
const ROOT=path.resolve(__dirname,'..'),SKIP=new Set(['.git','node_modules','.cache','tmp','.tmp']);
async function walk(dir=''){
 let all=[];for(const f of await fs.readdir(path.join(ROOT,dir),{withFileTypes:true})){
  if(SKIP.has(f.name)||f.name.startsWith('.env')||f.name.endsWith('.log'))continue;
  const rel=(dir?dir+'/':'')+f.name;if(f.isDirectory())all.push(...await walk(rel));else all.push(rel);
 }return all.sort();
}
async function main(){
 const files=await walk(),set=new Set(files),errors=[];
 for(const file of files.filter(f=>f.endsWith('.md'))){
  const text=await fs.readFile(path.join(ROOT,file),'utf8');
  for(const match of text.matchAll(/\]\(([^)]+)\)/g)){
   const target=match[1].replace(/^<|>$/g,'').split('#')[0];if(!target||/^(https?:|mailto:)/.test(target))continue;
   const dest=path.resolve(path.dirname(path.join(ROOT,file)),decodeURIComponent(target));
   if(process.argv.includes('--inventory')&&dest===path.join(ROOT,'docs/asset-inventory.json'))continue;
   try{await fs.access(dest);}catch{errors.push(file+': missing link '+target);}
  }
 }
 const manifest=JSON.parse(await fs.readFile(path.join(ROOT,'assets/infected-animation-pack-v2/manifest.json'),'utf8'));
 let frames=0,gifs=0;
 for(const m of manifest.monsters)for(const d of manifest.directions)for(const state of manifest.frameOrder){
  for(const frame of m.directions[d].animations[state].frames){const p=`assets/infected-animation-pack-v2/${m.id}/${d}/frames/${frame}.png`;if(!set.has(p))errors.push('Missing '+p);frames++;}
  const p=`assets/infected-animation-pack-v2/${m.id}/${d}/previews/${state}.gif`;if(!set.has(p))errors.push('Missing '+p);gifs++;
 }
 for(const f of files){const s=await fs.stat(path.join(ROOT,f));if(s.size>=100*1024*1024)errors.push('GitHub file limit: '+f);}
 if(frames!==576||gifs!==96)errors.push('Wrong v2 totals');
 let v3Frames=0,v3Gifs=0;
 const v3file=path.join(ROOT,'assets/infected-animation-pack-v3/manifest.json');
 try{
  const v3=JSON.parse(await fs.readFile(v3file,'utf8'));
  if(v3.version===3){
   for(const m of v3.monsters)for(const d of v3.directions)for(const state of v3.frameOrder){
    for(const f of m.directions[d].animations[state].frames){const p=`assets/infected-animation-pack-v3/${m.id}/${d}/frames/${f}.png`;if(!set.has(p))errors.push('Missing '+p);v3Frames++;}
    const p=`assets/infected-animation-pack-v3/${m.id}/${d}/previews/${state}.gif`;if(!set.has(p))errors.push('Missing '+p);v3Gifs++;
   }
   if(v3Frames!==1008||v3Gifs!==168)errors.push('Wrong v3 totals');
  }
 }catch(e){if(e.code!=='ENOENT')throw e;}
 if(errors.length)throw Error(errors.join('\n'));
 if(process.argv.includes('--inventory')){
  const entries=[];for(const file of files){if(file==='docs/asset-inventory.json')continue;const data=await fs.readFile(path.join(ROOT,file));entries.push({path:file,bytes:data.length,sha256:crypto.createHash('sha256').update(data).digest('hex')});}
  await fs.writeFile(path.join(ROOT,'docs/asset-inventory.json'),JSON.stringify({description:'All project files except this inventory, Git internals, ignored local dependencies and temporary files.',files:entries.length,totalBytes:entries.reduce((sum,x)=>sum+x.bytes,0),entries},null,2)+'\n');
 }
 console.log(JSON.stringify({files:files.length,v2Frames:frames,v2Gifs:gifs,v3Frames,v3Gifs,markdownLinksValid:true,allFilesBelow100MiB:true}));
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
