const path=require('path');const {spawn,execFileSync}=require('child_process');
const ROOT=path.resolve(__dirname,'..'),exe=require('../desktop/node_modules/electron'),env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
async function launch(){
 execFileSync(process.execPath,[path.join(__dirname,'prepare-survival.cjs')],{cwd:ROOT,stdio:'inherit'});
 await require('./prepare-village-assets.cjs').prepareVillageAssets();
 await require('./prepare-village-directions.cjs').prepareDirectionalAssets();
 const child=spawn(exe,[path.join(ROOT,'desktop')],{stdio:'inherit',env});child.on('exit',code=>process.exitCode=code??0);child.on('error',e=>{console.error(e);process.exitCode=1;});
}launch().catch(e=>{console.error(e);process.exitCode=1;});
