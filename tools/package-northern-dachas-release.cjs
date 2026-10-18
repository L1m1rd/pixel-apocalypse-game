const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process'),{pipeline}=require('node:stream/promises'),JSZip=require('jszip');
const ROOT=path.resolve(__dirname,'..'),version=require('../desktop/package.json').version;
async function main(){
 const build=spawnSync(process.execPath,[path.join(__dirname,'package-desktop.cjs')],{stdio:'inherit',env:process.env});
 if(build.status)process.exit(build.status);
 const dir=process.env.PIXEL_APOCALYPSE_OUTPUT?path.resolve(process.env.PIXEL_APOCALYPSE_OUTPUT):path.join(ROOT,'output','PixelApocalypse-northern-dachas-v'+version+'-win32-x64'),zip=new JSZip(),folder=path.basename(dir);
 function add(current){for(const item of fs.readdirSync(current,{withFileTypes:true})){const file=path.join(current,item.name);if(item.isDirectory())add(file);else zip.file(folder+'/'+path.relative(dir,file).replaceAll('\\','/'),fs.createReadStream(file));}}
 add(dir);const destination=dir+'.zip';
 await pipeline(zip.generateNodeStream({type:'nodebuffer',streamFiles:true,compression:'DEFLATE',compressionOptions:{level:6}}),fs.createWriteStream(destination));
 console.log(JSON.stringify({archive:destination,bytes:fs.statSync(destination).size,version}));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
