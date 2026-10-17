// Explicitly invoked publication helper. Uses an existing Git Credential Manager login.
// Credentials stay in process memory and are never written into repository files or URLs.
const {spawnSync}=require('node:child_process');
const fs=require('node:fs');
const path=require('node:path');
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
 git(['add','--all']);
 const pending=git(['diff','--cached','--name-only']);
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
 console.log(JSON.stringify({repository:repo.html_url,private:true,branch,commit:sha,remoteMatchesLocal:true,trackedFiles:git(['ls-files']).split('\n').length,workingTreeClean:git(['status','--porcelain'])===''}));
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
