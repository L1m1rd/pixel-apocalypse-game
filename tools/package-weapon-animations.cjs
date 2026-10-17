const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
function dep(n){try{return require(n);}catch{return require(path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules',n));}}
const sharp=dep('sharp'),JSZip=dep('jszip'),ROOT=path.resolve(__dirname,'..'),OUT=path.join(ROOT,'assets/weapon-animations-v1');
const escape=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
async function main(){
 const m=JSON.parse(await fs.readFile(path.join(OUT,'manifest.json'),'utf8'));
 if(process.argv.includes('--zip')){
  const zip=new JSZip();async function walk(dir,prefix=''){for(const e of await fs.readdir(dir,{withFileTypes:true})){const rel=prefix+e.name;if(e.isDirectory())await walk(path.join(dir,e.name),rel+'/');else zip.file(rel,await fs.readFile(path.join(dir,e.name)));}}
  await walk(OUT);await fs.mkdir(path.join(ROOT,'output'),{recursive:true});const bytes=await zip.generateAsync({type:'nodebuffer',compression:'DEFLATE',compressionOptions:{level:6}});await JSZip.loadAsync(bytes,{checkCRC32:true});await fs.writeFile(path.join(ROOT,'output/weapon-animations-v1.zip'),bytes);console.log(JSON.stringify({archive:'output/weapon-animations-v1.zip',bytes:bytes.length,crcVerified:true}));return;
 }
 const labels=await Promise.all(m.weapons.map(w=>sharp(Buffer.from('<svg width="256" height="224" xmlns="http://www.w3.org/2000/svg"><rect width="256" height="224" fill="#1b2820"/><rect x="1" y="1" width="254" height="222" rx="6" fill="none" stroke="#42533f"/><text x="128" y="24" text-anchor="middle" fill="#e5e0ca" font-family="Arial" font-size="14">'+escape(w.name)+'</text></svg>')).png().toBuffer()));
 for(const[action,count]of [['fire',6],['reload',18]]){
  const boards=[];
  for(let k=0;k<count;k++){
   const inputs=[];
   for(const[i,w]of m.weapons.entries()){
    const left=i%4*256,top=Math.floor(i/4)*224;inputs.push({input:labels[i],left,top});inputs.push({input:await fs.readFile(path.join(OUT,w.id,'frames',action+'_'+String(k).padStart(2,'0')+'.png')),left:left+32,top:top+32});
   }
   boards.push(await sharp({create:{width:1024,height:1344,channels:4,background:'#111b16'}}).composite(inputs).png().toBuffer());
  }
  const delay=Array(count).fill(action==='fire'?75:130);delay[count-1]+=800;
  await fs.writeFile(path.join(OUT,'overview-'+action+'.gif'),await sharp(boards,{join:{animated:true}}).gif({delay,loop:0,dither:0,effort:5}).toBuffer());
  if(action==='fire')await fs.writeFile(path.join(OUT,'overview.png'),boards[2]);console.log(action+': comparison exported');
 }
}
main().catch(e=>{console.error(e);process.exitCode=1;});
