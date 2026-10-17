/* Asset packaging only: source poses are generated with image_gen.
 * Run with Node.js and sharp + jszip available (locally or via NODE_PATH).
 * Does not paint, synthesize, or warp animation poses.
 */
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const sharp = require('sharp');
const JSZip = require('jszip');
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'assets', 'infected-animation-pack-v1');
const IDS = ['runner','stalker','clicker','bloater','shambler','rat-king'];
const NAMES = ['Бегун','Сталкер','Щелкун','Топляк','Шаркун','Крысиный король'];
const STATES = ['idle','walk','run','attack'];
const TIMES = {
  runner: [200,150,90,110], stalker:[240,170,85,110], clicker:[260,200,110,130],
  bloater:[300,240,150,160], shambler:[280,230,160,160], 'rat-king':[320,260,160,180]
};
const median = a => [...a].sort((a,b)=>a-b)[Math.floor(a.length/2)];
async function writeJson(file, value) { await fs.writeFile(file, JSON.stringify(value,null,2)+'\n'); }
function bestCut(counts, ideal, radius) {
  let best=ideal, score=Infinity;
  for(let i=Math.max(1,ideal-radius);i<Math.min(counts.length-1,ideal+radius);i++) {
    const s=(counts[i-1]+counts[i]+counts[i+1])*1000+Math.abs(i-ideal);
    if(s<score){score=s;best=i;}
  }
  return best;
}
async function main() {
  await fs.mkdir(OUT,{recursive:true});
  const manifest={version:1,direction:'south',source:'AI-generated poses; sliced and packaged',frameOrder:STATES,monsters:[]};
  const qa=[];
  for(let mi=0;mi<IDS.length;mi++) {
    const id=IDS[mi], dir=path.join(OUT,id);
    await fs.mkdir(path.join(dir,'frames'),{recursive:true});
    await fs.mkdir(path.join(dir,'previews'),{recursive:true});
    const source=path.join(OUT,'sources',id+'.png');
    const {data,info}=await sharp(source).ensureAlpha().raw().toBuffer({resolveWithObject:true});
    const W=info.width,H=info.height;
    if(W!==1536||H!==1024) throw Error(id+': expected 1536x1024 source');
    const rowCounts=Array(H).fill(0);
    for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(data[(y*W+x)*4+3]>64)rowCounts[y]++;
    const ys=[0,...[1,2,3].map(r=>bestCut(rowCounts,r*256,45)),H];
    const cells=[];
    for(let row=0;row<4;row++) {
      const cols=Array(W).fill(0);
      for(let y=ys[row];y<ys[row+1];y++)for(let x=0;x<W;x++)if(data[(y*W+x)*4+3]>64)cols[x]++;
      const xs=[0,...[1,2,3,4,5].map(c=>bestCut(cols,c*256,40)),W];
      for(let col=0;col<6;col++) {
        const localRows=Array(H).fill(0);
        for(let y=0;y<H;y++)for(let x=xs[col];x<xs[col+1];x++)if(data[(y*W+x)*4+3]>64)localRows[y]++;
        const ya=row===0?0:bestCut(localRows,row*256,70);
        const yb=row===3?H:bestCut(localRows,(row+1)*256,70);
        let x0=W,y0=H,x1=-1,y1=-1,n=0;
        for(let y=ya;y<yb;y++)for(let x=xs[col];x<xs[col+1];x++) {
          if(data[(y*W+x)*4+3]>64){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);n++;}
        }
        if(n<100)throw Error(id+': empty cell '+row+'/'+col);
        const opaque=(x,y)=>x>=0&&x<W&&y>=0&&y<H&&data[(y*W+x)*4+3]>64;
        let severedPixels=0;
        for(let y=ya;y<yb;y++) {
          if(opaque(xs[col]-1,y)&&opaque(xs[col],y))severedPixels++;
          if(opaque(xs[col+1]-1,y)&&opaque(xs[col+1],y))severedPixels++;
        }
        for(let x=xs[col];x<xs[col+1];x++) {
          if(opaque(x,ya-1)&&opaque(x,ya))severedPixels++;
          if(opaque(x,yb-1)&&opaque(x,yb))severedPixels++;
        }
        // Preserve a one-pixel antialiased edge inside isolated cell boundaries.
        x0=Math.max(xs[col],x0-1);x1=Math.min(xs[col+1]-1,x1+1);
        y0=Math.max(ya,y0-1);y1=Math.min(yb-1,y1+1);
        cells.push({row,col,x0,y0,x1,y1,n,severedPixels,cutTouches:severedPixels>0});
      }
    }
    const size=mi<3?64:mi<5?96:128;
    const anchors=STATES.map((_,r)=>median(cells.filter(c=>c.row===r).map(c=>c.y1)));
    const maxAbove=Math.max(...cells.map(c=>anchors[c.row]-c.y0));
    const maxBelow=Math.max(0,...cells.map(c=>c.y1-anchors[c.row]));
    const maxSide=Math.max(...cells.flatMap(c=>[Math.abs(c.x0-(c.col*256+128)),Math.abs(c.x1-(c.col*256+128))]));
    const scale=Math.min((size-8)/(maxAbove+maxBelow+1),(size-8)/(2*maxSide+1));
    const footY=Math.round(size-5-maxBelow*scale);
    const frames=[], atlas={frames:{},meta:{app:'Infected animation pack',version:'1',image:'spritesheet.png',format:'RGBA8888',size:{w:size*6,h:size*4},scale:'1'}};
    const animations={monster:id,direction:'south',frameWidth:size,frameHeight:size,origin:{x:.5,y:footY/size},animations:{}};
    const records=[];
    for(const c of cells) {
      const name=STATES[c.row]+'_south_'+String(c.col).padStart(2,'0');
      const width=c.x1-c.x0+1,height=c.y1-c.y0+1;
      const dw=Math.max(1,Math.round(width*scale)),dh=Math.max(1,Math.round(height*scale));
      const left=Math.round(size/2+(c.x0-(c.col*256+128))*scale);
      const top=Math.round(footY+(c.y0-anchors[c.row])*scale);
      if(left<1||top<1||left+dw>=size||top+dh>=size)throw Error(id+': output clipping '+name);
      const sprite=await sharp(source).extract({left:c.x0,top:c.y0,width,height}).resize(dw,dh,{kernel:'nearest'}).png().toBuffer();
      const frame=await sharp({create:{width:size,height:size,channels:4,background:'#00000000'}}).composite([{input:sprite,left,top}]).png().toBuffer();
      await fs.writeFile(path.join(dir,'frames',name+'.png'),frame);
      frames.push(frame);
      atlas.frames[name]={frame:{x:c.col*size,y:c.row*size,w:size,h:size},rotated:false,trimmed:false,spriteSourceSize:{x:0,y:0,w:size,h:size},sourceSize:{w:size,h:size},pivot:{x:.5,y:footY/size}};
      records.push({name,sourceBounds:{x:c.x0,y:c.y0,w:width,h:height},cutTouches:c.cutTouches,severedPixels:c.severedPixels,sha256:crypto.createHash('sha256').update(frame).digest('hex')});
    }
    await sharp({create:{width:size*6,height:size*4,channels:4,background:'#00000000'}})
      .composite(frames.map((input,i)=>({input,left:(i%6)*size,top:Math.floor(i/6)*size}))).png().toFile(path.join(dir,'spritesheet.png'));
    for(let r=0;r<4;r++) {
      const state=STATES[r],frameNames=cells.filter(c=>c.row===r).map(c=>state+'_south_'+String(c.col).padStart(2,'0'));
      const durationMs=TIMES[id][r];
      animations.animations[state]={frames:frameNames,durationMs,frameRate:1000/durationMs,repeat:state==='attack'?0:-1,...(state==='attack'?{event:{name:id==='shambler'?'spore-release':'hit',frame:3,note:'Zero-based visual cue only. Damage and cooldown must be decided by game/server code.'}}:{})};
      const buffers=[];
      for(let i=0;i<6;i++) {
        // Opaque GIF preview avoids GIF disposal ghosting; game PNGs retain RGBA.
        buffers.push(await sharp(frames[r*6+i]).resize(256,256,{kernel:'nearest'}).flatten({background:'#202725'}).png().toBuffer());
      }
      await sharp(buffers,{join:{animated:true}}).gif({delay:durationMs,loop:0,dither:0,effort:7}).toFile(path.join(dir,'previews',state+'.gif'));
      const meta=await sharp(path.join(dir,'previews',state+'.gif'),{animated:true}).metadata();
      if(meta.pages!==6)throw Error(id+'/'+state+': GIF frame count '+meta.pages);
      if(new Set(records.slice(r*6,r*6+6).map(f=>f.sha256)).size<5)throw Error(id+'/'+state+': duplicate poses');
    }
    await writeJson(path.join(dir,'atlas.json'),atlas);
    await writeJson(path.join(dir,'animations.json'),animations);
    await writeJson(path.join(dir,'source-crops.json'),{source:'../sources/'+id+'.png',scale,groundAnchors:anchors,frames:records});
    manifest.monsters.push({id,name:NAMES[mi],frameSize:size,origin:animations.origin,animations:animations.animations});
    qa.push({id,frames:24,gifs:4,frameSize:size,sourceGridCuts:ys,cutTouches:records.filter(f=>f.cutTouches).map(f=>f.name)});
    console.log('Built '+id+': 24 PNG frames, 4 GIFs, atlas + animation metadata');
  }
  await writeJson(path.join(OUT,'manifest.json'),manifest);
  await fs.writeFile(path.join(OUT,'manifest.js'),'window.INFECTED_PACK='+JSON.stringify(manifest)+';\n');
  await writeJson(path.join(OUT,'validation.json'),{generatedAt:new Date().toISOString(),totalAnimations:24,totalFrames:144,checks:qa});
  console.log(JSON.stringify(qa,null,2));
  if(process.argv.includes('--zip'))await zipPack();
}
async function zipPack(){
  const zip=new JSZip();
  async function add(dir,prefix=''){for(const f of await fs.readdir(dir,{withFileTypes:true})){const rel=prefix+f.name;if(f.isDirectory())await add(path.join(dir,f.name),rel+'/');else zip.file(rel,await fs.readFile(path.join(dir,f.name)));}}
  await add(OUT);
  const dest=path.join(ROOT,'output');await fs.mkdir(dest,{recursive:true});
  await fs.writeFile(path.join(dest,'infected-animation-pack-v1.zip'),await zip.generateAsync({type:'nodebuffer',compression:'DEFLATE',compressionOptions:{level:6}}));
  console.log('ZIP: output/infected-animation-pack-v1.zip');
}
if(process.argv.includes('--zip-only'))zipPack().catch(e=>{console.error(e);process.exitCode=1;});
else main().catch(e=>{console.error(e);process.exitCode=1;});
