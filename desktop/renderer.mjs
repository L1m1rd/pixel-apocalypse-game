import {createPlayer,stepPlayer,toggleCrouch,SIZE} from './core.mjs';
const assets=window.GAME_ASSETS;
const $=id=>document.getElementById(id);
const keys=new Set(),images=new Map();
const screens=['menu','character','create','game'];
const state={screen:'menu',selected:assets.characters[0].id,previewDirection:0,world:null,player:null,paused:false,saved:null,ready:false,busy:false};
let previewTime=0,lastTime=performance.now(),lastSave=0,noticeTimer;
const canvas=$('world'),ctx=canvas.getContext('2d'),preview=$('hero-preview'),pctx=preview.getContext('2d');
const skyCanvas=$('menu-clouds'),sky=skyCanvas.getContext('2d');
function image(file){return new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(Error('Не удалось загрузить '+file));img.src='media/'+file;});}
const ready=Promise.all([...assets.characters.map(async ch=>images.set(ch.id,await image(ch.file))),...['grass','clouds','sky-mask'].map(id=>image(id+'.png').then(img=>images.set(id,img)))]).then(()=>{state.ready=true;});
ready.catch(error=>notice(error.message));
function notice(text){$('notice').textContent=text;$('notice').hidden=false;clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>$('notice').hidden=true,6000);}
function show(screen){state.screen=screen;keys.clear();state.paused=false;$('pause').hidden=true;for(const name of screens)$(name+'-screen').hidden=name!==screen;lastTime=performance.now();if(screen==='menu')$('new-world').focus();if(screen==='create'){$('world-name').focus();$('world-name').select();}}
function selected(){return assets.characters.find(ch=>ch.id===state.selected);}
function choose(id){state.selected=id;$('hero-name').textContent=selected().name;for(const b of $('characters').children)b.setAttribute('aria-pressed',String(b.dataset.character===id));}
for(const ch of assets.characters){const b=document.createElement('button');b.className='character-card';b.dataset.character=ch.id;b.setAttribute('aria-pressed','false');const img=document.createElement('img');img.src='media/'+ch.portrait;img.alt='';const label=document.createElement('span');label.textContent=ch.name;b.append(img,label);b.addEventListener('click',()=>choose(ch.id));$('characters').append(b);}
choose(state.selected);
$('new-world').onclick=()=>show('character');
$('character-back').onclick=()=>show('menu');
$('character-next').onclick=()=>{$('world-hero').src='media/'+selected().portrait;$('world-hero-name').textContent=selected().name;$('replace-note').hidden=!state.saved;$('create-error').textContent='';show('create');};
$('turn-left').onclick=()=>state.previewDirection=(state.previewDirection+3)%4;
$('turn-right').onclick=()=>state.previewDirection=(state.previewDirection+1)%4;
$('create-back').onclick=()=>show('character');
function snapshot(){const p=state.player;if(!p||!state.world)return null;return {version:1,worldName:state.world.worldName,characterId:state.world.characterId,x:p.x,y:p.y,direction:p.direction,crouched:p.crouched};}
async function persist(){const save=snapshot();if(!save)return;await window.desktop.save(save);state.saved=save;$('continue').disabled=false;}
async function start(save){
 if(state.busy)return;state.busy=true;$('loading').hidden=false;
 try{await ready;await window.desktop.save(save);state.world={worldName:save.worldName,characterId:save.characterId};state.player=createPlayer(save);state.saved=save;$('continue').disabled=false;$('world-title').textContent=save.worldName;$('player-title').textContent=assets.characters.find(ch=>ch.id===save.characterId).name;show('game');resize();lastSave=performance.now();}
 finally{state.busy=false;$('loading').hidden=true;}
}
$('world-form').onsubmit=async event=>{event.preventDefault();const name=$('world-name').value.trim();if(!name){$('create-error').textContent='Введи название мира.';$('world-name').focus();return;}try{await start({version:1,worldName:name,characterId:state.selected,x:SIZE/2,y:SIZE/2,direction:'south',crouched:false});}catch(error){$('create-error').textContent=error.message;}};
$('continue').onclick=async()=>{if(state.saved)try{await start(state.saved);}catch(error){notice(error.message);}};
$('quit').onclick=()=>window.desktop.quit();
function pause(value){if(state.screen!=='game')return;state.paused=value;keys.clear();$('pause').hidden=!value;if(value){persist().catch(()=>notice('Не удалось сохранить мир.'));$('resume').focus();}lastTime=performance.now();}
$('resume').onclick=()=>pause(false);
$('return-menu').onclick=async()=>{try{await persist();show('menu');}catch{notice('Не удалось сохранить мир. Попробуй ещё раз.');}};
const movementCodes=new Set(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','ShiftLeft','ShiftRight','KeyC','ControlLeft','ControlRight']);
window.addEventListener('keydown',event=>{
 if(event.code==='Escape'){if(state.screen==='game'){event.preventDefault();pause(!state.paused);}else if(state.screen==='character')show('menu');else if(state.screen==='create')show('character');return;}
 if(state.screen!=='game'||state.paused)return;
 if(movementCodes.has(event.code)){event.preventDefault();keys.add(event.code);if(!event.repeat&&['KeyC','ControlLeft','ControlRight'].includes(event.code))toggleCrouch(state.player);}
});
window.addEventListener('keyup',event=>{keys.delete(event.code);if(state.screen==='game'&&!state.paused&&movementCodes.has(event.code))persist().catch(()=>{});});
window.addEventListener('blur',()=>{keys.clear();if(state.screen==='game'&&!state.paused)pause(true);});
window.addEventListener('beforeunload',()=>{const save=snapshot();if(save)window.desktop.saveSync(save);});
document.addEventListener('visibilitychange',()=>{if(document.hidden){keys.clear();if(state.screen==='game')pause(true);}});
function resize(){canvas.width=window.innerWidth;canvas.height=window.innerHeight;ctx.imageSmoothingEnabled=false;}
window.addEventListener('resize',resize);resize();
function drawHero(context,ch,direction,action,time,x,y,scale){const img=images.get(ch.id);if(!img)return;const dir=assets.directions.indexOf(direction),row=dir*assets.actions.length+assets.actions.indexOf(action);const repeat=action!=='crouch_down'&&action!=='stand_up';const count=ch.frameCounts?.[direction]?.[action]??6,duration=ch.timingsByDirection?.[direction]?.[action]??ch.timing[action];const frame=repeat?Math.floor(time/duration)%count:Math.min(count-1,Math.floor(time/duration));context.imageSmoothingEnabled=false;context.drawImage(img,frame*96,row*96,96,96,Math.round(x-48*scale),Math.round(y-72*scale),96*scale,96*scale);}
function drawClouds(now){const clouds=images.get('clouds'),mask=images.get('sky-mask');if(!clouds||!mask)return;sky.clearRect(0,0,1304,941);sky.globalCompositeOperation='source-over';sky.imageSmoothingEnabled=true;const width=740,offset=(now/1000*5)%width;for(let i=0;i<2;i++)sky.drawImage(clouds,750-offset+i*width,23,width,185);sky.globalCompositeOperation='destination-in';sky.drawImage(mask,0,0);sky.globalCompositeOperation='source-over';}
function drawWorld(){
 const p=state.player,ch=assets.characters.find(c=>c.id===state.world.characterId);const zoom=1.5;const vw=canvas.width/zoom,vh=canvas.height/zoom;const cx=Math.max(0,Math.min(SIZE-vw,p.x-vw/2)),cy=Math.max(0,Math.min(SIZE-vh,p.y-vh/2));
 ctx.setTransform(zoom,0,0,zoom,-Math.round(cx*zoom),-Math.round(cy*zoom));ctx.fillStyle=ctx.createPattern(images.get('grass'),'repeat');ctx.fillRect(cx-64,cy-64,vw+128,vh+128);
 ctx.fillStyle='#0b170b50';ctx.beginPath();ctx.ellipse(p.x,p.y+1,p.crouched?15:12,4,0,0,Math.PI*2);ctx.fill();drawHero(ctx,ch,p.direction,p.action,p.elapsed,p.x,p.y,1);ctx.setTransform(1,0,0,1,0,0);
 const labels={idle:'Стоит',walk:'Идёт',run:'Бежит',crouch_down:'Приседает',crouch_idle:'Сидит',crouch_walk:'Крадётся',stand_up:'Встаёт'};$('movement-state').textContent=labels[p.action];
}
function tick(now){const dt=Math.min((now-lastTime)/1000,.05);lastTime=now;previewTime+=dt*1000;
 if(state.screen==='menu'&&state.ready)drawClouds(now);
 if(state.screen==='character'&&state.ready){pctx.clearRect(0,0,preview.width,preview.height);drawHero(pctx,selected(),assets.directions[state.previewDirection],'idle',previewTime,140,255,3.2);}
 if(state.screen==='game'&&state.ready&&state.player){if(!state.paused)stepPlayer(state.player,keys,dt,assets.characters.find(c=>c.id===state.world.characterId).timing);drawWorld();if(!state.paused&&now-lastSave>1000){lastSave=now;persist().catch(()=>notice('Не удалось сохранить мир.'));}}
 requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
try{state.saved=await window.desktop.load();$('continue').disabled=!state.saved;}catch{notice('Не удалось прочитать сохранение. Можно создать новый мир.');}
// Read-only state used by integration checks; it never changes gameplay.
window.__prototype={getState:()=>JSON.parse(JSON.stringify({screen:state.screen,paused:state.paused,selected:state.selected,ready:state.ready,world:state.world,player:state.player})),flush:persist};
