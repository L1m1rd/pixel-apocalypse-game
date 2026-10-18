// Explicitly invoked publication helper. Uses an existing Git Credential Manager login.
// Credentials stay in process memory and are never written into repository files or URLs.
const {spawnSync}=require('node:child_process');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const ROOT=path.resolve(__dirname,'..');
const OWNER='L1m1rd';
const NAMES=['pixel-apocalypse-game','pixel-apocalypse-game-2026-10-17'];
const API='https://api.github.com';
function git(args,opts={}){
 const r=spawnSync('git',args,{cwd:ROOT,encoding:'utf8',maxBuffer:8*1024*1024,...opts});
 if(r.status!==0)throw Error('git '+args[0]+' failed: '+(r.stderr||r.error?.message||'unknown error').slice(0,2500));return r.stdout.trim();
}
async function main(){
 if(!fs.existsSync(path.join(ROOT,'docs/asset-inventory.json')))throw Error('Prepare and validate inventory first');
 const credential=spawnSync('git',['credential','fill'],{cwd:ROOT,encoding:'utf8',input:'protocol=https\nhost=github.com\nusername='+OWNER+'\n\n',env:{...process.env,GIT_TERMINAL_PROMPT:'0',GCM_INTERACTIVE:'never'}});
 if(credential.status!==0)throw Error('Cannot access existing GitHub credential. No credential values were printed.');
 const values={};for(const line of credential.stdout.split(/\r?\n/)){const i=line.indexOf('=');if(i>0)values[line.slice(0,i)]=line.slice(i+1);}
 if(!values.password)throw Error('No stored GitHub credential found');
 const auth='Bearer '+values.password;
 async function api(endpoint,method='GET',body){
  const r=await fetch(API+endpoint,{method,headers:{Authorization:auth,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','User-Agent':'pixel-apocalypse-project-publisher',...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});
  const data=await r.json();return {status:r.status,data};
 }
 const profile=await api('/user');if(profile.status!==200||profile.data.login.toLowerCase()!==OWNER.toLowerCase())throw Error('Stored GitHub login does not match the connected account');
 const remotes=git(['remote','-v']);let repo;
 if(remotes){
  const origin=git(['remote','get-url','origin']);
  const found=NAMES.find(n=>origin===`https://github.com/${OWNER}/${n}.git`);
  if(!found)throw Error('Existing remote is not the repository selected by this helper');
  const check=await api('/repos/'+OWNER+'/'+found);if(check.status!==200||check.data.private!==true)throw Error('Existing destination is not confirmed private');repo=check.data;
 }else{
  for(const name of NAMES){
   const created=await api('/user/repos','POST',{name,private:true,description:'Кооперативная пиксельная игра о выживании: графика, анимации заражённых, персонажи и дизайн-документация.',auto_init:false});
   if(created.status===201){repo=created.data;break;}
   if(created.status===422&&created.data.errors?.some(e=>e.field==='name'&&e.message?.includes('already exists')))continue;
   throw Error('GitHub repository creation failed (HTTP '+created.status+'): '+(created.data.message||'unknown error'));
  }
  if(!repo)throw Error('Both selected repository names already exist; no existing repository was modified');
  if(repo.private!==true||repo.owner.login.toLowerCase()!==OWNER.toLowerCase())throw Error('Destination privacy/ownership validation failed');
  git(['remote','add','origin',repo.clone_url]);
 }
 console.log(JSON.stringify({repository:repo.html_url,private:repo.private,phase:'repository-ready'}));
 const releaseIndex=process.argv.indexOf('--release-asset');
 if(releaseIndex!==-1){
  const relative=process.argv[releaseIndex+1],tagIndex=process.argv.indexOf('--release-tag'),tag=tagIndex===-1?'environment-variants-v1':process.argv[tagIndex+1];
  if(!relative||path.isAbsolute(relative)||relative.split(/[\\/]/).includes('..')||!tag||!/^[a-zA-Z0-9._-]+$/.test(tag))throw Error('Invalid release asset path or tag');
  const file=path.join(ROOT,relative),bytes=fs.readFileSync(file),name=path.basename(file),sha256=crypto.createHash('sha256').update(bytes).digest('hex');
  const metadataIndex=process.argv.indexOf('--release-metadata');let metadata;
  if(metadataIndex!==-1){const relativeMetadata=process.argv[metadataIndex+1];if(!relativeMetadata||path.isAbsolute(relativeMetadata)||relativeMetadata.split(/[\\/]/).includes('..'))throw Error('Invalid release metadata path');metadata=JSON.parse(fs.readFileSync(path.join(ROOT,relativeMetadata),'utf8'));if(typeof metadata.name!=='string'||typeof metadata.body!=='string')throw Error('Release metadata requires name and body');}
  const current=await api('/repos/'+repo.full_name+'/releases/tags/'+encodeURIComponent(tag));let release;
  if(current.status===200)release=current.data;
  else if(current.status===404){
   const made=await api('/repos/'+repo.full_name+'/releases','POST',{tag_name:tag,target_commitish:git(['rev-parse','HEAD']),name:metadata?.name||'Окружение и эффекты — 119 элементов × 3 варианта',body:metadata?.body||'357 близких вариантов окружения и эффектов: 258 статичных изображений, 90 анимаций на 540 кадров и 9 референсов освещения. В ZIP включены исходники, запросы генерации, отдельные PNG, спрайт-листы, атласы, GIF и локальный просмотрщик. Проверки файлов и просмотрщика пройдены. Стыки покрытий, соединения дорог и отмеченные края кадров требуют проверки в игровом движке.',draft:true,prerelease:true});
   if(made.status!==201)throw Error('Cannot create asset release (HTTP '+made.status+')');release=made.data;
  }else throw Error('Cannot read asset release (HTTP '+current.status+')');
  const existing=release.assets?.find(a=>a.name===name);let asset;
  if(existing){
   if(existing.size!==bytes.length||existing.digest!=='sha256:'+sha256)throw Error('An existing release asset differs; it was not overwritten');asset=existing;
  }else{
   console.log(JSON.stringify({phase:'uploading-release-archive',name,bytes:bytes.length,sha256}));
   const endpoint=release.upload_url.split('{')[0]+'?name='+encodeURIComponent(name);
   const response=await fetch(endpoint,{method:'POST',headers:{Authorization:auth,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','User-Agent':'pixel-apocalypse-project-publisher','Content-Type':'application/zip','Content-Length':String(bytes.length)},body:bytes});
   const uploaded=await response.json();if(response.status!==201)throw Error('Release upload failed (HTTP '+response.status+'): '+(uploaded.message||'unknown error'));asset=uploaded;
  }
  if(asset.state!=='uploaded'||asset.size!==bytes.length||(asset.digest&&asset.digest!=='sha256:'+sha256))throw Error('Release asset integrity verification failed');
  const published=await api('/repos/'+repo.full_name+'/releases/'+release.id,'PATCH',{draft:false});if(published.status!==200||published.data.draft)throw Error('Cannot publish completed asset release');
  const checked=await api('/repos/'+repo.full_name+'/releases/assets/'+asset.id);if(checked.status!==200||checked.data.size!==bytes.length||checked.data.digest&&checked.data.digest!=='sha256:'+sha256)throw Error('Published archive verification failed');
  console.log(JSON.stringify({release:published.data.html_url,archive:checked.data.browser_download_url,bytes:bytes.length,sha256,verified:true,private:true}));return;
 }
 const pathsIndex=process.argv.indexOf('--paths');
 if(pathsIndex!==-1){
  const selected=process.argv.slice(pathsIndex+1);
  if(!selected.length)throw Error('--paths requires project-relative paths');
  for(const item of selected)if(path.isAbsolute(item)||item.startsWith('-')||item.split(/[\\/]/).includes('..'))throw Error('Invalid publication path');
  if(git(['diff','--cached','--name-only']))throw Error('Existing staged changes require a separate review before scoped publication');
  git(['add','--',...selected]);
 }else {
  const configPath=path.join(ROOT,'publication-config.json');
  if(fs.existsSync(configPath)){
   const config=JSON.parse(fs.readFileSync(configPath,'utf8'));
   for(const item of config.excludedLocalPaths){
    if(path.isAbsolute(item)||item.startsWith('-')||item.split(/[\\/]/).includes('..'))throw Error('Invalid excluded publication path');
   }
   git(['rm','-r','--cached','--ignore-unmatch','--',...config.excludedLocalPaths]);
  }
  git(['add','--all']);
 }
 const pending=git(['diff','--cached','--name-only']);
 const configFile=path.join(ROOT,'publication-config.json');
 if(fs.existsSync(configFile)){
  const cfg=JSON.parse(fs.readFileSync(configFile,'utf8'));
  const tracked=git(['-c','core.quotepath=false','ls-files']).split('\n');
  if(tracked.some(p=>cfg.excludedLocalPaths.some(x=>p===x||p.startsWith(x+'/'))))throw Error('Superseded files remain in publication index');
  // Preserve prior metadata for unchanged index files during a scoped publication.
  const previous=new Map(JSON.parse(git(['show','HEAD:docs/asset-inventory.json'])).entries.map(e=>[e.path,e]));
  const changed=new Set(pending.split('\n'));
  // Freeze the file list at staging time: other chats may still generate new local art.
  const entries=tracked.filter(p=>p!=='docs/asset-inventory.json').map(p=>{
   if(previous.has(p)&&!changed.has(p))return previous.get(p);
   const data=fs.readFileSync(path.join(ROOT,p));
   return {path:p,bytes:data.length,sha256:crypto.createHash('sha256').update(data).digest('hex')};
  });
  fs.writeFileSync(path.join(ROOT,'docs/asset-inventory.json'),JSON.stringify({description:'Current publication snapshot; excludes Git, dependencies, superseded local material and this inventory.',excludedLocalPaths:cfg.excludedLocalPaths,files:entries.length,totalBytes:entries.reduce((s,e)=>s+e.bytes,0),entries},null,2)+'\n');
  git(['add','--','docs/asset-inventory.json']);
 }
 if(pending){
  console.log('Committing '+pending.split('\n').length+' project files');
  git(['-c','user.name='+OWNER,'-c',`user.email=${profile.data.id}+${OWNER}@users.noreply.github.com`,'commit','-m',process.argv[2]||'Add all survival game visuals, animations and character design documentation']);
 }
 const branch=git(['branch','--show-current']);
 console.log('Uploading project to private GitHub repository…');
 const pushed=spawnSync('git',['push','-u','origin',branch],{cwd:ROOT,encoding:'utf8',maxBuffer:8*1024*1024,env:{...process.env,GIT_TERMINAL_PROMPT:'0',GCM_INTERACTIVE:'never'}});
 if(pushed.status!==0)throw Error('Git upload failed: '+(pushed.stderr||'unknown error').slice(-3000));
 const sha=git(['rev-parse','HEAD']),remoteSha=git(['ls-remote','origin','refs/heads/'+branch]).split(/\s/)[0];
 const verified=await api('/repos/'+repo.full_name);
 if(verified.status!==200||verified.data.private!==true||remoteSha!==sha)throw Error('Post-upload verification failed');
 if(fs.existsSync(configFile)){
  if(verified.data.default_branch!==branch)throw Error('Uploaded branch is not the GitHub default branch');
  const tree=await api('/repos/'+repo.full_name+'/git/trees/'+sha+'?recursive=1');
  if(tree.status!==200||tree.data.truncated)throw Error('Cannot verify published file tree');
  const cfg=JSON.parse(fs.readFileSync(configFile,'utf8')),paths=tree.data.tree.map(x=>x.path);
  if(paths.some(p=>cfg.excludedLocalPaths.some(x=>p===x||p.startsWith(x+'/'))))throw Error('Superseded files found on GitHub');
  for(const p of ['README.md','assets/weapons-pixel-v1/overview.png','assets/survivor-friends-pixel-v1/overview.png','assets/infected-redesign-animations-v1/manifest.json'])if(!paths.includes(p))throw Error('Current asset missing on GitHub: '+p);
  const readme=await api('/repos/'+repo.full_name+'/contents/README.md?ref='+sha);
  if(readme.status!==200||!Buffer.from(readme.data.content,'base64').equals(fs.readFileSync(path.join(ROOT,'README.md'))))throw Error('GitHub README verification failed');
  console.log('Verified default branch, current assets, removal of superseded files and updated README on GitHub');
 }
 console.log(JSON.stringify({repository:repo.html_url,private:true,branch,commit:sha,remoteMatchesLocal:true,trackedFiles:git(['ls-files']).split('\n').length,workingTreeClean:git(['status','--porcelain'])===''}));
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
