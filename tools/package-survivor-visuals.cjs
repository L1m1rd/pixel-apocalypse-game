// Copies and packages static generated character concepts; no pose synthesis.
const fs=require('node:fs/promises'),path=require('node:path'),sharp=require('sharp'),JSZip=require('jszip');
const ROOT=path.resolve(__dirname,'..'),OUT=path.join(ROOT,'assets/survivor-visuals-v1');
const people=[['joel','Джоэл','Боец · зелёная рубашка'],['ellie','Элли','Разведчица · бордовая футболка'],['tommy','Томми','Стрелок · коричневая куртка'],['tess','Тесс','Вылазки · серая куртка'],['bill','Билл','Инженер · рабочая одежда'],['dina','Дина','Поддержка · синяя куртка']];
async function main(){
 await fs.mkdir(OUT,{recursive:true});const inputs=[],checks=[];
 for(let k=0;k<people.length;k++){
  const [id,name,description]=people[k],file=path.join(OUT,id+'.png');
  const {data,info}=await sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  let x0=info.width,y0=info.height,x1=-1,y1=-1,transparent=0;
  const occupied=[0,0,0];
  for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){
   const alpha=data[(y*info.width+x)*4+3];if(alpha===0)transparent++;
   if(alpha>64){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);occupied[Math.min(2,Math.floor(x/info.width*3))]++;}
  }
  if(occupied.some(n=>n<1000)||transparent===0)throw Error(id+': missing views or transparency');
  const bounds={left:x0,top:y0,width:x1-x0+1,height:y1-y0+1};
  const input=await sharp(file).extract(bounds).resize(704,384,{fit:'contain',kernel:'nearest',background:'#00000000'}).png().toBuffer();
  const left=k%2*768,top=Math.floor(k/2)*512;
  const label=Buffer.from('<svg width="768" height="105" xmlns="http://www.w3.org/2000/svg"><text x="32" y="42" fill="#e9e7dc" font-family="Arial,sans-serif" font-size="28" font-weight="bold">'+name+'</text><text x="32" y="72" fill="#b3bbad" font-family="Arial,sans-serif" font-size="17">'+description+'</text><text x="32" y="98" fill="#c6a677" font-family="Arial,sans-serif" font-size="15">← Левый бок     ·     Правый бок →     ·     Со спины ↑</text></svg>');
  inputs.push({input:label,left,top},{input,left:left+32,top:top+112});
  checks.push({id,width:info.width,height:info.height,hasAlpha:info.hasAlpha,transparentPixels:transparent,occupiedPixelsByView:occupied});
 }
 await sharp({create:{width:1536,height:1536,channels:4,background:'#18211c'}}).composite(inputs).png().toFile(path.join(OUT,'overview.png'));
 await fs.writeFile(path.join(OUT,'validation.json'),JSON.stringify({type:'static character concepts',characters:6,viewsPerCharacter:3,views:['west','east','north'],checks},null,2));
 const zip=new JSZip();for(const file of await fs.readdir(OUT)){if((await fs.stat(path.join(OUT,file))).isFile())zip.file(file,await fs.readFile(path.join(OUT,file)));}
 const bytes=await zip.generateAsync({type:'nodebuffer',compression:'DEFLATE',compressionOptions:{level:6}});await fs.mkdir(path.join(ROOT,'output'),{recursive:true});
 await fs.writeFile(path.join(ROOT,'output/survivor-visuals-v1.zip'),bytes);console.log(JSON.stringify({characters:6,views:18,archiveBytes:bytes.length}));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
