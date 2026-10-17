const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
const sharp=require('sharp'),JSZip=require('jszip'),scan=require('./slice-sprite-components.cjs');
const ROOT=path.resolve(__dirname,'..'),OUT=path.join(ROOT,'assets/combat-vfx-v1');
const groups=[
 {source:'spores',category:'spores',centers:{x:[142,392,644,896,1146,1394],y:[172,420,660,900]},effects:[['spore_emission','Выброс спор',128,100],['spore_cloud_dense','Плотное облако спор',128,160,'loop'],['spore_dissipate','Рассеивание спор',128,140],['spore_trail','Шлейф спор',128,140,'loop']]},
 {source:'blood',category:'blood',centers:{x:[138,390,640,892,1144,1396],y:[154,398,652,904]},effects:[['blood_hit_small','Лёгкие брызги',96,80],['blood_hit_heavy','Сильные брызги',96,100],['blood_pool_form','Образование лужи',96,160,'decal'],['blood_drip','Падающая капля',96,120]]},
 {source:'blood-directional',category:'directional',centers:{x:[140,390,640,892,1144,1396],y:[142,394,644,894]},effects:['south','west','east','north'].map(d=>['blood_hit_'+d,'Брызги: '+({south:'вниз',west:'влево',east:'вправо',north:'вверх'}[d]),96,90,'destroy',d])},
 {source:'impacts',category:'impacts',centers:{x:[142,394,646,896,1148,1400],y:[154,406,650,894]},effects:[['hit_flesh','Попадание по телу',96,70],['hit_fungus','Попадание по грибной броне',96,100],['hit_stone','Попадание по камню',96,90],['hit_metal','Попадание по металлу',96,60]]}
];
const json=async(p,v)=>fs.writeFile(p,JSON.stringify(v,null,2)+'\n');
async function tile(w,h,inputs){const pixels=Buffer.alloc(w*h*4);for(const v of inputs){const{data,info}=await sharp(v.input).ensureAlpha().raw().toBuffer({resolveWithObject:true});for(let y=0;y<info.height;y++)data.copy(pixels,((v.top+y)*w+v.left)*4,y*info.width*4,(y+1)*info.width*4);}return sharp(pixels,{raw:{width:w,height:h,channels:4}}).png().toBuffer();}
async function makeGif(frames,size,ms,hold=650){const images=await Promise.all(frames.map(f=>sharp(f).resize(size,size,{kernel:'nearest'}).flatten({background:'#333b37'}).png().toBuffer()));return sharp(images,{join:{animated:true}}).gif({delay:Array.from({length:6},(_,i)=>ms+(i===5?hold:0)),loop:0,dither:0,effort:5}).toBuffer();}
async function build(){
 const manifest={version:1,compatibleWith:'infected-redesign-animations-v1',totalAnimations:16,totalFrames:96,staticDecals:1,coordinateSystem:'screen: +x right, +y down; directional blood points along force, not victim facing',effects:[]};
 await fs.mkdir(path.join(OUT,'comparisons'),{recursive:true});
 for(const group of groups){
  const cells=await scan(path.join(OUT,'sources',group.source+'.png'),{minMainPixels:2,cellCenters:group.centers}),groupFrames=[];
  for(const[row,s]of group.effects.entries()){
   const[id,label,size,ms,persistence='destroy',direction=null]=s,folder=path.join(OUT,'effects',id);await fs.mkdir(path.join(folder,'frames'),{recursive:true});
   const cc=cells.filter(c=>c.row===row),centers=group.centers;
   const side=Math.max(...cc.flatMap(c=>[Math.abs(c.x0-centers.x[c.col]),Math.abs(c.x1-centers.x[c.col])])),vert=Math.max(...cc.flatMap(c=>[Math.abs(c.y0-centers.y[row]),Math.abs(c.y1-centers.y[row])]));
   const scale=Math.min(size/256,(size-6)/(2*side+1),(size-6)/(2*vert+1));
   const frames=[],names=[],records=[],atlas={frames:{},meta:{app:'Combat VFX',version:'1',image:'spritesheet.png',format:'RGBA8888',size:{w:size*6,h:size},scale:'1'}};
   for(const c of cc){
    const width=Math.max(1,Math.round((c.x1-c.x0+1)*scale)),height=Math.max(1,Math.round((c.y1-c.y0+1)*scale));
    const left=Math.round(size/2+(c.x0-centers.x[c.col])*scale),top=Math.round(size/2+(c.y0-centers.y[row])*scale);
    if(left<1||top<1||left+width>=size||top+height>=size)throw Error('Clipped '+id+'/'+c.col);
    const pose=await sharp(c.image).resize(width,height,{kernel:'nearest'}).png().toBuffer(),frame=await tile(size,size,[{input:pose,left,top}]);
    const name=id+'_'+String(c.col).padStart(2,'0');frames.push(frame);names.push(name);await fs.writeFile(path.join(folder,'frames',name+'.png'),frame);
    atlas.frames[name]={frame:{x:c.col*size,y:0,w:size,h:size},rotated:false,trimmed:false,spriteSourceSize:{x:0,y:0,w:size,h:size},sourceSize:{w:size,h:size},pivot:{x:.5,y:.5}};
    records.push({name,sourceBounds:{x:c.x0,y:c.y0,w:c.x1-c.x0+1,h:c.y1-c.y0+1},destination:{x:left,y:top,w:width,h:height},sha256:crypto.createHash('sha256').update(frame).digest('hex')});
   }
   const config={id,label,category:group.category,direction,frameWidth:size,frameHeight:size,origin:{x:.5,y:.5},frames:names,durationMs:ms,frameRate:1000/ms,repeat:persistence==='loop'?-1:0,persistence,rootMotion:false};
   if(persistence==='decal'){config.decalFrame=names[5];config.decalFile='effects/'+id+'/decal.png';await fs.writeFile(path.join(folder,'decal.png'),frames[5]);}
   await fs.writeFile(path.join(folder,'spritesheet.png'),await tile(size*6,size,frames.map((input,i)=>({input,left:i*size,top:0}))));
   await fs.writeFile(path.join(folder,'preview.gif'),await makeGif(frames,256,ms,persistence==='loop'?0:650));await json(path.join(folder,'animation.json'),config);await json(path.join(folder,'atlas.json'),atlas);
   await json(path.join(folder,'source-crops.json'),{source:'../../sources/'+group.source+'.png',ownership:'whole-connected-components-nearest-calibrated-center',fixedSourceCenters:centers,scale,frames:records});
   manifest.effects.push(config);groupFrames.push(frames);console.log(id+': 6 frames, '+persistence);
  }
  const comparison=[];for(let i=0;i<6;i++)comparison.push(await tile(768,192,await Promise.all(groupFrames.map(async(frames,col)=>({input:await sharp(frames[i]).resize(192,192,{kernel:'nearest'}).flatten({background:'#333b37'}).png().toBuffer(),left:col*192,top:0})))));
  await fs.writeFile(path.join(OUT,'comparisons',group.source+'.gif'),await sharp(comparison,{join:{animated:true}}).gif({delay:[130,130,130,130,130,850],loop:0,dither:0,effort:5}).toBuffer());
 }
 await json(path.join(OUT,'manifest.json'),manifest);await fs.writeFile(path.join(OUT,'manifest.js'),'window.COMBAT_VFX='+JSON.stringify(manifest)+';\n');
 const inputs=await Promise.all(manifest.effects.map(async(e,i)=>({input:await sharp(path.join(OUT,'effects',e.id,'frames',e.frames[e.persistence==='decal'?5:2]+'.png')).resize(192,192,{kernel:'nearest'}).flatten({background:'#333b37'}).png().toBuffer(),left:i%4*192,top:Math.floor(i/4)*192})));
 await fs.writeFile(path.join(OUT,'overview.png'),await tile(768,768,inputs));
}
async function zip(){const z=new JSZip();async function walk(dir,prefix=''){for(const f of await fs.readdir(dir,{withFileTypes:true})){const rel=prefix+f.name;if(f.isDirectory())await walk(path.join(dir,f.name),rel+'/');else z.file(rel,await fs.readFile(path.join(dir,f.name)));}}await walk(OUT);const b=await z.generateAsync({type:'nodebuffer',compression:'DEFLATE',compressionOptions:{level:6}});await JSZip.loadAsync(b,{checkCRC32:true});await fs.writeFile(path.join(ROOT,'output/combat-vfx-v1.zip'),b);console.log('combat-vfx-v1.zip: '+b.length+' bytes, CRC verified');}
(process.argv.includes('--zip')?zip():build()).catch(e=>{console.error(e);process.exitCode=1;});
