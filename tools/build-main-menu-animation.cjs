const fs=require('fs');
const path=require('path');
const crypto=require('crypto');
const sharp=require('sharp');
const JSZip=require('jszip');
const ROOT=path.resolve(__dirname,'../assets/main-menu-animation-v1');
const W=1672,H=941,N=48,DELAY=100,UI_X=1304;
const json=(p,v)=>fs.writeFileSync(path.join(ROOT,p),JSON.stringify(v,null,2));
async function rgba(input){return sharp(input).ensureAlpha().raw().toBuffer({resolveWithObject:true});}
async function bounds(input){const {data,info}=await rgba(input);let l=info.width,t=info.height,r=-1,b=-1;for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++)if(data[(y*info.width+x)*4+3]>32){l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);}if(r<l)throw Error('Empty alpha');return {left:l,top:t,width:r-l+1,height:b-t+1};}
async function cropSprite(input,w,h){const b=await bounds(input);return sharp(input).extract(b).resize(w,h,{fit:'contain',kernel:'nearest',background:'#00000000'}).png().toBuffer();}
function sway(data,w,h,phase,amp){const out=Buffer.alloc(data.length);for(let y=0;y<h;y++){const dx=Math.round(amp*Math.sin(phase+y/h*.6)*Math.pow(y/h,1.25));for(let x=0;x<w;x++){const nx=x+dx;if(nx>=0&&nx<w)data.copy(out,(y*w+nx)*4,(y*w+x)*4,(y*w+x)*4+4);}}return out;}
function glow(w,h,cx,cy,rx,ry,strength){const out=Buffer.alloc(w*h*4);for(let y=Math.max(0,Math.floor(cy-ry));y<Math.min(h,cy+ry);y++)for(let x=Math.max(0,Math.floor(cx-rx));x<Math.min(w,cx+rx,UI_X);x++){const d=((x-cx)/rx)**2+((y-cy)/ry)**2;if(d>=1)continue;const i=(y*w+x)*4;out[i]=255;out[i+1]=138;out[i+2]=40;out[i+3]=Math.round(strength*(1-d)**2);}return out;}
async function main(){
  for(const dir of ['frames','layers','references','sources'])fs.mkdirSync(path.join(ROOT,dir),{recursive:true});
  const original=path.join(ROOT,'references/approved-menu-C.png');
  const originalRaw=await rgba(original);
  const clean=await sharp(path.join(ROOT,'sources/clean-background.png')).resize(W,H,{kernel:'nearest'}).png().toBuffer();
  // Use only the edited patches; every other pixel comes from the approved original.
  const patches=[{left:576,top:211,width:43,height:43},{left:117,top:467,width:55,height:88},{left:740,top:0,width:205,height:225}];
  const parts=[];
  for(const p of patches){const {data,info}=await rgba(await sharp(clean).extract(p).png().toBuffer());for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){const edge=Math.min(x,info.width-1-x,y===0&&p.top===0?99:y,info.height-1-y);data[(y*info.width+x)*4+3]=Math.min(255,Math.max(0,edge)*64);}parts.push({input:await sharp(data,{raw:info}).png().toBuffer(),left:p.left,top:p.top});}
  const base=await sharp(original).composite(parts).png().toBuffer();fs.writeFileSync(path.join(ROOT,'layers/background.png'),base);
  const sheet=path.join(ROOT,'sources/fire-sheet.png');const sm=await sharp(sheet).metadata();
  const fire=[];
  for(let row=0;row<2;row++){const seq=[];for(let col=0;col<6;col++){const left=Math.round(col*sm.width/6),right=Math.round((col+1)*sm.width/6),top=Math.round(row*sm.height/2),bottom=Math.round((row+1)*sm.height/2);const cell=await sharp(sheet).extract({left,top,width:right-left,height:bottom-top}).png().toBuffer();const sprite=await cropSprite(cell,row===0?14:31,row===0?29:58);fs.writeFileSync(path.join(ROOT,'layers',`${row===0?'lantern':'stove'}-${col}.png`),sprite);seq.push(sprite);}fire.push(seq);}
  const ivy=await cropSprite(path.join(ROOT,'sources/ivy-layer.png'),85,166);fs.writeFileSync(path.join(ROOT,'layers/ivy.png'),ivy);const ir=await rgba(ivy);
  const originalGrilles=[];
  for(const p of [{left:576,top:211,width:43,height:43},{left:117,top:467,width:55,height:88}]){const g=await rgba(await sharp(original).extract(p).png().toBuffer());for(let i=0;i<g.data.length;i+=4){const lum=(g.data[i]+g.data[i+1]+g.data[i+2])/3;g.data[i+3]=lum<83?255:0;}originalGrilles.push({input:await sharp(g.data,{raw:g.info}).png().toBuffer(),left:p.left,top:p.top});}
  // Restore the fixed boards over the moving window foliage.
  const board=await rgba(await sharp(base).extract({left:740,top:0,width:205,height:225}).png().toBuffer());
  for(let i=0;i<board.data.length;i+=4){const r=board.data[i],g=board.data[i+1],b=board.data[i+2];board.data[i+3]=r>g*1.12&&g>b*1.04?255:0;}
  const boardPng=await sharp(board.data,{raw:board.info}).png().toBuffer();
  const pngs=[],previews=[],frames=[];let stationary=true,maxUiDifference=0;const hashes=new Set();
  for(let f=0;f<N;f++){
    const phase=f/N*2*Math.PI;
    const flame=Math.floor(f/2)%6;
    const moved=await sharp(sway(ir.data,ir.info.width,ir.info.height,phase,3),{raw:ir.info}).png().toBuffer();
    const strength=15+3*Math.sin(phase*4)+2*Math.sin(phase*8+.6);
    const layers=[{input:await sharp(glow(W,H,598,235,156,130,strength),{raw:{width:W,height:H,channels:4}}).png().toBuffer(),left:0,top:0,blend:'screen'},{input:await sharp(glow(W,H,143,519,175,160,11+3*Math.sin(phase*6+.9)),{raw:{width:W,height:H,channels:4}}).png().toBuffer(),left:0,top:0,blend:'screen'},{input:moved,left:765,top:5},{input:boardPng,left:740,top:0},{input:fire[0][flame],left:590,top:220},{input:fire[1][(flame+2)%6],left:128,top:488},...originalGrilles];
    const raw=await sharp(base).composite(layers).ensureAlpha().raw().toBuffer();
    for(let y=0;y<H;y++)for(let x=UI_X;x<W;x++){const i=(y*W+x)*4;for(let c=0;c<4;c++){const d=Math.abs(raw[i+c]-originalRaw.data[i+c]);maxUiDifference=Math.max(maxUiDifference,d);if(d)stationary=false;}}
    const frame=await sharp(raw,{raw:{width:W,height:H,channels:4}}).png().toBuffer();
    const file='frames/menu-'+String(f).padStart(3,'0')+'.png';fs.writeFileSync(path.join(ROOT,file),frame);pngs.push(frame);hashes.add(crypto.createHash('sha256').update(frame).digest('hex'));
    previews.push(await sharp(frame).resize(1000,563,{kernel:'nearest'}).png().toBuffer());frames.push({file,durationMs:DELAY});
    if(f%12===0)console.log('Frames '+(f+1)+'/'+N);
  }
  if(!stationary)throw Error('UI changed during animation: '+maxUiDifference);
  fs.copyFileSync(path.join(ROOT,frames[0].file),path.join(ROOT,'poster.png'));
  await sharp(previews,{join:{animated:true}}).gif({delay:Array(N).fill(DELAY),loop:0,dither:0,colours:256,effort:7}).toFile(path.join(ROOT,'preview.gif'));
  await sharp(pngs,{join:{animated:true}}).webp({delay:DELAY,loop:0,quality:88,effort:4}).toFile(path.join(ROOT,'main-menu.webp'));
  const approvalFile=path.join(ROOT,'publication-status.json');const approved=fs.existsSync(approvalFile)&&JSON.parse(fs.readFileSync(approvalFile,'utf8')).approved;
  const manifest={status:approved?'approved-visual-prototype':'review',selectedMenu:'C',implementedInGame:false,width:W,height:H,frameCount:N,fps:1000/DELAY,durationMs:N*DELAY,repeat:-1,rootMotion:false,cameraMotion:false,uiMotion:false,preview:'preview.gif',animatedWebp:'main-menu.webp',frames,layeredSource:{background:'layers/background.png',ivy:'layers/ivy.png',fireFrames:['lantern','stove'].map(n=>Array.from({length:6},(_,i)=>`layers/${n}-${i}.png`))},motion:{ivy:{x:765,y:5,pivot:'top',periodMs:N*DELAY,maxHorizontalDisplacementPx:3},lantern:{x:590,y:220,frameDurationMs:200},stove:{x:128,y:488,frameDurationMs:200,phaseOffsetFrames:2},lighting:'Low-amplitude periodic warm glow; integer harmonic periods close the loop.'}};
  json('manifest.json',manifest);json('verification.json',{passed:true,frameCount:N,uniqueFrames:hashes.size,stationaryUi:stationary,maxUiPixelDifference:maxUiDifference,loop:'Periodic sine functions and fire cycles repeat exactly after 48 frames; endpoint frame is not duplicated.',originalRightPanelPreserved:true});
  fs.writeFileSync(path.join(ROOT,'README.md'),'# Главное меню C — лёгкая зацикленная анимация\n\nВыбранное пользователем меню C. Пламя фонаря и печи, лёгкое покачивание плюща у окна и мягкое мерцание света. Камера, кнопки, надписи, мебель и правая панель неподвижны.\n\n48 кадров × 100 мс = 4,8 секунды, бесконечный цикл. preview.gif — уменьшенное превью; main-menu.webp — анимация полного разрешения 1672×941; frames — все PNG. Отдельные слои и исходники находятся в layers и sources; параметры — manifest.json.\n\nХудожественные слои созданы встроенным image_gen. Сборка движения и экспорт — tools/build-main-menu-animation.cjs. Запросы и происхождение — generation-records.json. Игровые кнопки и их обработчики ещё не реализованы. В GIF/WebP кнопки являются частью изображения; при интеграции их следует сделать интерактивными элементами поверх фона. Название игры рабочее.\n');
  require('child_process').execFileSync(process.execPath,[path.resolve(__dirname,'check-main-menu-animation.cjs')],{cwd:path.resolve(__dirname,'..'),stdio:'inherit'});
  const zip=new JSZip();function add(dir,relative=''){for(const name of fs.readdirSync(dir)){const full=path.join(dir,name),rel=relative+name;if(fs.statSync(full).isDirectory())add(full,rel+'/');else zip.file(rel,fs.readFileSync(full));}}add(ROOT);
  const dest=path.resolve(ROOT,'../../output/main-menu-animation-v1.zip');fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,await zip.generateAsync({type:'nodebuffer',compression:'DEFLATE'}));
  console.log(JSON.stringify({manifest,archive:dest,archiveBytes:fs.statSync(dest).size}));
}
main().catch(e=>{console.error(e);process.exit(1)});
