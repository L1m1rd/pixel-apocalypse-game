const fs=require('fs');
const path=require('path');
const crypto=require('crypto');
const sharp=require('sharp');
const {normalize,measure}=require('./normalize-locomotion.cjs');
const ROOT=path.resolve(__dirname,'..'),OUT=path.join(ROOT,'desktop/media');
const ACTIONS=['idle','walk','run','crouch_down','crouch_idle','crouch_walk','stand_up'];
const DIRECTIONS=['south','west','east','north'];
async function main(){
 fs.mkdirSync(path.join(OUT,'characters'),{recursive:true});
 const source=path.join(ROOT,'assets/survivor-friends-animations-v1');
 const original=JSON.parse(fs.readFileSync(path.join(source,'manifest.json'),'utf8'));
 const data={version:2,frameSize:96,rowStride:8,origin:{x:.5,y:.75},actions:ACTIONS,directions:DIRECTIONS,characters:[],terrain:{id:'grass_short_a',file:'grass.png',tileSize:64},worldSize:8192};
 const alignment=[];
 for(const ch of original.characters){
  const layers=[];let timing;const frameCounts={},timingsByDirection={};
  const standing=await sharp(path.join(source,ch.id,'south/frames/idle_south_00.png')).ensureAlpha().raw().toBuffer({resolveWithObject:true});const standingY=measure(standing.data,96,96).headY;
  for(let d=0;d<4;d++){
   const anim=JSON.parse(fs.readFileSync(path.join(source,ch.id,DIRECTIONS[d],'animations.json'),'utf8'));
   timing=Object.fromEntries(ACTIONS.map(a=>[a,anim.animations[a].durationMs]));
   frameCounts[DIRECTIONS[d]]={};timingsByDirection[DIRECTIONS[d]]={};
   for(let a=0;a<ACTIONS.length;a++){
    const action=ACTIONS[a],dir=DIRECTIONS[d];const override=path.join(ROOT,'desktop/art/locomotion-v2',ch.id,dir,action+'-0.png');
    const count=fs.existsSync(override)?8:6;frameCounts[dir][action]=count;timingsByDirection[dir][action]=count===8?70:timing[action];
    const inputs=Array.from({length:count},(_,f)=>count===8?path.join(ROOT,'desktop/art/locomotion-v2',ch.id,dir,action+'-'+f+'.png'):path.join(source,ch.id,dir,'frames',`${action}_${dir}_0${f}.png`));
    let headY=standingY;if(action==='crouch_idle'||action==='crouch_walk'){const sample=await sharp(inputs[0]).ensureAlpha().raw().toBuffer({resolveWithObject:true});headY=measure(sample.data,96,96).headY;}if(action==='crouch_down'||action==='stand_up')headY=undefined;
    for(let f=0;f<count;f++){
     const normalized=await normalize(inputs[f],{headY,lockY:action==='idle'||action==='crouch_idle',bodyBob:['walk','run','crouch_walk'].includes(action)&&f%3===1?1:0});
     layers.push({input:normalized.image,left:f*96,top:(d*ACTIONS.length+a)*96});alignment.push({character:ch.id,direction:dir,action,frame:f,dx:normalized.dx,dy:normalized.dy,before:normalized.before,after:normalized.after});
    }
   }
  }
  const file=`characters/${ch.id}.png`;
  await sharp({create:{width:768,height:2688,channels:4,background:'#00000000'}}).composite(layers).png().toFile(path.join(OUT,file));
  await sharp(path.join(OUT,file)).extract({left:0,top:0,width:96,height:96}).png().toFile(path.join(OUT,`characters/${ch.id}-portrait.png`));
  data.characters.push({id:ch.id,name:ch.name,file,portrait:`characters/${ch.id}-portrait.png`,timing,frameCounts,timingsByDirection,source:`assets/survivor-friends-animations-v1/${ch.id}`,sideRunOverride:'desktop/art/locomotion-v2/'+ch.id});
 }
 const grass=path.join(ROOT,'assets/environment-variants-v1/elements/grass_short/grass_short_a.png');
 fs.copyFileSync(grass,path.join(OUT,'grass.png'));
 data.terrain.source='assets/environment-variants-v1/elements/grass_short/grass_short_a.png';
 data.terrain.sha256=crypto.createHash('sha256').update(fs.readFileSync(grass)).digest('hex');
 const menu=path.join(ROOT,'assets/main-menu-animation-v1');const frames=[];
 for(let f=0;f<48;f++)frames.push(await sharp(path.join(menu,'frames',`menu-${String(f).padStart(3,'0')}.png`)).extract({left:0,top:0,width:1304,height:941}).png().toBuffer());
 await sharp(frames,{join:{animated:true}}).webp({delay:frames.map(()=>100),loop:0,quality:88,effort:4}).toFile(path.join(OUT,'menu-background.webp'));
 await sharp(path.join(menu,'references/approved-menu-C.png')).extract({left:1325,top:80,width:325,height:205}).png().toFile(path.join(OUT,'logo.png'));
 for(const file of ['clouds.png','sky-mask.png'])fs.copyFileSync(path.join(ROOT,'desktop/art/menu-clouds',file),path.join(OUT,file));
 await require('./prepare-northern-dachas-runtime.cjs').prepareDistrict(data,OUT);
 require('./prepare-inventory.cjs').prepareInventory(data,OUT);
 fs.writeFileSync(path.join(OUT,'motion-alignment.json'),JSON.stringify(alignment,null,2));
 fs.writeFileSync(path.join(OUT,'data.js'),'window.GAME_ASSETS='+JSON.stringify(data)+';\n');
 fs.writeFileSync(path.join(OUT,'asset-manifest.json'),JSON.stringify(data,null,2));
 console.log(JSON.stringify({characters:data.characters.length,animations:6*7*4,frames:alignment.length,terrain:data.terrain.source,output:OUT}));
}
main().catch(e=>{console.error(e);process.exit(1)});
