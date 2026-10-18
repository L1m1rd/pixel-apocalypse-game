const path=require('path');const {spawn}=require('child_process');
const exe=require('../desktop/node_modules/electron');const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
const child=spawn(exe,[path.resolve(__dirname,'../desktop')],{stdio:'inherit',env});child.on('exit',code=>process.exitCode=code??0);child.on('error',e=>{console.error(e.message);process.exitCode=1;});
