const {spawnSync}=require('node:child_process');
const path=require('node:path');

const ROOT=path.resolve(__dirname,'..');
const OWNER='L1m1rd';
const REPO='pixel-apocalypse-game';
const API='https://api.github.com';

function git(args){const result=spawnSync('git',args,{cwd:ROOT,encoding:'utf8',env:{...process.env,GIT_TERMINAL_PROMPT:'0',GCM_INTERACTIVE:'never'}});if(result.status!==0)throw Error((result.stderr||'Git failed').trim());return result.stdout.trim();}

async function main(){
 const credential=spawnSync('git',['credential','fill'],{cwd:ROOT,encoding:'utf8',input:`protocol=https\nhost=github.com\nusername=${OWNER}\n\n`,env:{...process.env,GIT_TERMINAL_PROMPT:'0',GCM_INTERACTIVE:'never'}});
 if(credential.status!==0)throw Error('Не удалось прочитать сохранённый вход GitHub.');
 const values={};for(const line of credential.stdout.split(/\r?\n/)){const i=line.indexOf('=');if(i>0)values[line.slice(0,i)]=line.slice(i+1);}
 if(!values.password)throw Error('Сохранённый вход GitHub не найден.');
 async function api(endpoint,method='GET',body){const response=await fetch(API+endpoint,{method,headers:{Authorization:`Bearer ${values.password}`,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','User-Agent':'pixel-apocalypse-main-config',...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});let data=null;try{data=await response.json();}catch{}return {status:response.status,data};}
 const repo=await api(`/repos/${OWNER}/${REPO}`);if(repo.status!==200||repo.data.owner.login.toLowerCase()!==OWNER.toLowerCase())throw Error('Владелец репозитория не подтверждён.');
 if(process.argv.includes('--status')){const pages=await api(`/repos/${OWNER}/${REPO}/pages`),runs=await api(`/repos/${OWNER}/${REPO}/actions/workflows/deploy-pages.yml/runs?per_page=3`);console.log(JSON.stringify({private:repo.data.private,pages:pages.data,runs:runs.data?.workflow_runs?.map(r=>({id:r.id,status:r.status,conclusion:r.conclusion,url:r.html_url,sha:r.head_sha}))}));return;}
 const local=git(['rev-parse','HEAD']),remote=git(['ls-remote','origin','refs/heads/main']).split(/\s/)[0];if(local!==remote)throw Error('Ветка main на GitHub не совпадает с проверенным локальным коммитом.');
 const updated=await api(`/repos/${OWNER}/${REPO}`,'PATCH',{default_branch:'main'});if(updated.status!==200||updated.data.default_branch!=='main')throw Error('GitHub не переключил основную ветку на main.');
 const pages=await api(`/repos/${OWNER}/${REPO}/pages`);let configured=pages;
 if(pages.status===404)configured=await api(`/repos/${OWNER}/${REPO}/pages`,'POST',{build_type:'workflow'});
 else if(pages.status===200&&pages.data.build_type!=='workflow')configured=await api(`/repos/${OWNER}/${REPO}/pages`,'PUT',{build_type:'workflow'});
 if(![200,201].includes(configured.status))throw Error(`GitHub Pages не настроен (HTTP ${configured.status}): ${configured.data?.message??'неизвестная ошибка'}`);
 const dispatch=await api(`/repos/${OWNER}/${REPO}/actions/workflows/deploy-pages.yml/dispatches`,'POST',{ref:'main'});if(dispatch.status!==204)throw Error(`Не удалось запустить публикацию веб-версии (HTTP ${dispatch.status}).`);
 console.log(JSON.stringify({repository:updated.data.html_url,defaultBranch:'main',pages:'https://l1m1rd.github.io/pixel-apocalypse-game/',workflowDispatched:true}));
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
