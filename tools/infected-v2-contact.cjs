const sharp=require('sharp'),fs=require('node:fs/promises'),path=require('node:path');
const root=path.resolve(__dirname,'..'),out=path.join(root,'assets/infected-animation-pack-v2');
async function main(){
const ids=process.argv.slice(2);const pieces=[];
for(let r=0;r<ids.length;r++)for(const [c,d] of ['south','west','east','north'].entries()){
 const file=path.join(out,ids[r],d,'frames','idle_'+d+'_00.png');
 const input=await sharp(file).resize(256,256,{kernel:'nearest'}).png().toBuffer();pieces.push({input,left:c*256,top:r*256});
}
await sharp({create:{width:1024,height:ids.length*256,channels:4,background:'#cbd1c6'}}).composite(pieces).png().toFile(path.join(root,'output/infected-v2-contact.png'));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
