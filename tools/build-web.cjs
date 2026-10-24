const fs=require('node:fs');
const path=require('node:path');

const ROOT=path.resolve(__dirname,'..');
const SOURCE=path.join(ROOT,'desktop');
const TARGET=path.join(ROOT,'web-dist');

fs.rmSync(TARGET,{recursive:true,force:true});
fs.mkdirSync(TARGET,{recursive:true});

const files=fs.readdirSync(SOURCE,{withFileTypes:true})
  .filter(entry=>entry.isFile())
  .map(entry=>entry.name)
  .filter(name=>name==='index.html'||name==='platform.js'||name==='inventory-catalog.json'||name.endsWith('.css')||(name.endsWith('.mjs')&&!name.endsWith('.test.mjs')));

for(const name of files)fs.copyFileSync(path.join(SOURCE,name),path.join(TARGET,name));
fs.cpSync(path.join(SOURCE,'media'),path.join(TARGET,'media'),{recursive:true});
fs.writeFileSync(path.join(TARGET,'.nojekyll'),'');
fs.writeFileSync(path.join(TARGET,'version.json'),JSON.stringify({version:require('../desktop/package.json').version,build:new Date().toISOString(),entry:'index.html'},null,2));

const stats=[];
function walk(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory())walk(file);else stats.push(fs.statSync(file).size);}}
walk(TARGET);
console.log(JSON.stringify({output:TARGET,version:require('../desktop/package.json').version,files:stats.length,bytes:stats.reduce((a,b)=>a+b,0)}));
