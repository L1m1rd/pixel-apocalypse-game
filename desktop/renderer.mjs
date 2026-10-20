import {createAvatarRenderer} from './avatar-renderer.mjs';
import {createWeaponAction} from './avatar-motion.mjs';
import {createHUD} from './hud.mjs';
import {moveOnLab,project} from './item-lab-movement.mjs';
import {createInventory} from './inventory.mjs';
import {createInventoryUI} from './inventory-ui.mjs';
import {createLabPainter,LAB_MAP_ID} from './item-lab-renderer.mjs';
import {createPlayer,stepPlayer,toggleCrouch,SIZE} from './core.mjs';
const assets=window.GAME_ASSETS;
const $=id=>document.getElementById(id);
const keys=new Set(),images=new Map();
const screens=['menu','character','create','game'];
const state={screen:'menu',selected:assets.characters[0].id,previewDirection:0,world:null,player:null,paused:false,saved:null,ready:false,busy:false,mapOpen:false,zoom:1.5};
let districtPainter,districtInfo,inventory,avatar,combat,worldAvatarInfo;
const hud=createHUD();
const inventoryUI=createInventoryUI({getInventory:()=>inventory,getPlayer:()=>state.player,persist,notice,onToggle:()=>keys.clear(),getCharacter:()=>assets.characters.find(c=>c.id===state.world?.characterId),paintHUD:()=>hud.update(inventory,state.player,combat?.getState())});
let previewTime=0,lastTime=performance.now(),lastSave=0,noticeTimer;
const canvas=$('world'),ctx=canvas.getContext('2d'),preview=$('hero-preview'),pctx=preview.getContext('2d');
const skyCanvas=$('menu-clouds'),sky=skyCanvas.getContext('2d');
function image(file){return new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(Error('Не удалось загрузить '+file));img.src='media/'+file;});}
const ready=Promise.all([...assets.characters.map(async ch=>images.set(ch.id,await image(ch.file))),...Object.entries(assets.northernDachas.assets).map(([id,a])=>image(a.file).then(img=>images.set('dacha/'+id,img))),...assets.inventory.items.map(item=>image(item.file).then(img=>images.set('item/'+item.key,img))),...Object.entries(assets.avatar.weapons).flatMap(([key,w])=>Object.entries(w.files).map(([action,file])=>image(file).then(img=>images.set('weapon/'+key+'/'+action,img)))),...['grass','clouds','sky-mask'].map(id=>image(id+'.png').then(img=>images.set(id,img)))]).then(()=>{districtPainter=createLabPainter(images,assets.northernDachas.assets);avatar=createAvatarRenderer(assets,images);combat=createWeaponAction(()=>inventory,assets.avatar.weapons);state.ready=true;});
ready.catch(error=>notice(error.message));
function notice(text){$('notice').textContent=text;$('notice').hidden=false;clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>$('notice').hidden=true,6000);}
function show(screen){inventoryUI.toggle(false);state.screen=screen;$('item-hud').hidden=screen!=='game';$('district-interaction').hidden=true;keys.clear();state.mapOpen=false;$('district-map-overlay').hidden=true;state.paused=false;$('pause').hidden=true;for(const name of screens)$(name+'-screen').hidden=name!==screen;lastTime=performance.now();if(screen==='menu')$('new-world').focus();if(screen==='create'){$('world-name').focus();$('world-name').select();}}
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
function snapshot(){const p=state.player;if(!p||!state.world)return null;return {version:1,worldName:state.world.worldName,characterId:state.world.characterId,x:p.x,y:p.y,direction:p.direction,crouched:p.crouched,district:state.world.district,inventory:inventory.snapshot()};}
async function persist(){const save=snapshot();if(!save)return;await window.desktop.save(save);state.saved=save;$('continue').disabled=false;}
async function start(save){
 if(state.busy)return;state.busy=true;$('loading').hidden=false;
 try{await ready;const district={mapId:LAB_MAP_ID},position=save.district?.mapId===LAB_MAP_ID?{x:save.x,y:save.y}:{x:4096,y:4096};inventory=createInventory(assets.inventory.items,save.inventory,position);combat.reset();state.world={worldName:save.worldName,characterId:save.characterId,district};state.player=createPlayer({...save,...position});await persist();if(inventory.migratedToGround)notice('Часть вещей из старого инвентаря находится рядом на земле: карманы рассчитаны на 12 ячеек.');$('continue').disabled=false;$('world-title').textContent=save.worldName;$('player-title').textContent=assets.characters.find(ch=>ch.id===save.characterId).name;show('game');resize();lastSave=performance.now();}
 finally{state.busy=false;$('loading').hidden=true;}
}
$('world-form').onsubmit=async event=>{event.preventDefault();const name=$('world-name').value.trim();if(!name){$('create-error').textContent='Введи название мира.';$('world-name').focus();return;}try{await start({version:1,worldName:name,characterId:state.selected,x:SIZE/2,y:SIZE/2,direction:'south',crouched:false});}catch(error){$('create-error').textContent=error.message;}};
$('continue').onclick=async()=>{if(state.saved)try{await start(state.saved);}catch(error){notice(error.message);}};
$('quit').onclick=()=>window.desktop.quit();
function pause(value){if(state.screen!=='game')return;state.paused=value;keys.clear();$('pause').hidden=!value;if(value){persist().catch(()=>notice('Не удалось сохранить мир.'));$('resume').focus();}lastTime=performance.now();}
$('resume').onclick=()=>pause(false);
$('return-menu').onclick=async()=>{try{await persist();show('menu');}catch{notice('Не удалось сохранить мир. Попробуй ещё раз.');}};
function toggleMap(){state.mapOpen=!state.mapOpen;keys.clear();$('district-map-overlay').hidden=!state.mapOpen;if(state.mapOpen){const map=$('district-map');map.width=Math.min(1200,innerWidth-80);map.height=Math.min(900,innerHeight-150);districtPainter.overview(map,state.player,state.world.district);$('map-close').focus();}}
$('map-close').onclick=toggleMap;
$('mini-map-open').onclick=()=>{if(state.screen==='game'&&!state.paused&&!inventoryUI.isOpen)toggleMap();};
const movementCodes=new Set(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','ShiftLeft','ShiftRight','KeyC','ControlLeft','ControlRight']);
window.addEventListener('keydown',event=>{
 if(event.code==='Escape'){if(state.screen==='game'){event.preventDefault();if(inventoryUI.isOpen)inventoryUI.closeTop();else if(state.mapOpen)toggleMap();else pause(!state.paused);}else if(state.screen==='character')show('menu');else if(state.screen==='create')show('character');return;}
 if(state.screen!=='game'||state.paused)return;
 if((event.code==='KeyI'&&!['INPUT','SELECT','TEXTAREA'].includes(event.target.tagName))||(event.code==='Tab'&&!inventoryUI.isOpen)){event.preventDefault();if(!event.repeat&&!state.mapOpen)inventoryUI.toggle();return;}
 if(event.code==='F2'){event.preventDefault();if(!event.repeat&&!state.mapOpen)inventoryUI.toggleCreative();return;}
 if(inventoryUI.isOpen)return;
 if(state.mapOpen&&event.code!=='KeyM')return;
 if(['KeyR','Space'].includes(event.code)){event.preventDefault();if(!event.repeat){const ok=combat.begin(event.code==='KeyR'?'reload':'fire');notice(ok?(event.code==='KeyR'?'Оружие заряжено':'Выстрел · патрон израсходован'):'Нет оружия, патронов или магазин уже полон');inventoryUI.updateHUD();persist().catch(()=>notice('Не удалось сохранить боезапас'));}return;}
 if(event.code==='KeyM'){event.preventDefault();if(!event.repeat)toggleMap();return;}
 if(event.code==='KeyH'){event.preventDefault();document.body.classList.toggle('hide-hud');return;}
 if(state.mapOpen)return;
 if(event.code==='KeyE'){event.preventDefault();if(!event.repeat){const target=inventory.nearby(state.player)[0];if(target){notice(inventory.pickup(target.uid,'pockets')?'Предмет подобран':'Нет места в рюкзаке');inventoryUI.updateHUD();persist().catch(()=>notice('Не удалось сохранить предмет'));}}return;}
 if(movementCodes.has(event.code)){event.preventDefault();keys.add(event.code);if(!event.repeat&&['KeyC','ControlLeft','ControlRight'].includes(event.code))toggleCrouch(state.player);}
});
window.addEventListener('keyup',event=>{keys.delete(event.code);if(state.screen==='game'&&!state.paused&&movementCodes.has(event.code))persist().catch(()=>{});});
window.addEventListener('blur',()=>{keys.clear();if(state.screen==='game'&&!state.paused)pause(true);});
window.addEventListener('beforeunload',()=>{const save=snapshot();if(save)window.desktop.saveSync(save);});
document.addEventListener('visibilitychange',()=>{if(document.hidden){keys.clear();if(state.screen==='game')pause(true);}});
function resize(){canvas.width=window.innerWidth;canvas.height=window.innerHeight;ctx.imageSmoothingEnabled=false;}
window.addEventListener('resize',()=>{resize();if(state.mapOpen){toggleMap();toggleMap();}});resize();
canvas.addEventListener('pointerdown',event=>{if(event.button!==0||state.screen!=='game'||state.paused||state.mapOpen||inventoryUI.isOpen)return;const dx=event.clientX-canvas.width/2,dy=event.clientY-canvas.height/2;if(Math.hypot(dx,dy)>20)state.player.direction=Math.abs(dx)>Math.abs(dy)?(dx>0?'east':'west'):(dy>0?'south':'north');if(combat.begin('fire'))persist().catch(()=>notice('Не удалось сохранить боезапас'));});
canvas.addEventListener('wheel',event=>{if(state.screen!=='game')return;event.preventDefault();state.zoom=Math.max(.65,Math.min(2,state.zoom+(event.deltaY>0?-.1:.1)));},{passive:false});
function drawOriginalHero(context,ch,direction,action,time,x,y,scale){const img=images.get(ch.id);if(!img)return;const dir=assets.directions.indexOf(direction),row=dir*assets.actions.length+assets.actions.indexOf(action);const repeat=action!=='crouch_down'&&action!=='stand_up';const count=ch.frameCounts?.[direction]?.[action]??6,duration=ch.timingsByDirection?.[direction]?.[action]??ch.timing[action];const frame=repeat?Math.floor(time/duration)%count:Math.min(count-1,Math.floor(time/duration));context.imageSmoothingEnabled=false;context.drawImage(img,frame*96,row*96,96,96,Math.round(x-48*scale),Math.round(y-72*scale),96*scale,96*scale);}
function drawHero(context,ch,direction,action,time,x,y,scale,equipment={},weaponAction=null){if(avatar)avatar.draw(context,ch,direction,action,time,x,y,scale,equipment,weaponAction);else drawOriginalHero(context,ch,direction,action,time,x,y,scale);}
function drawClouds(now){const clouds=images.get('clouds'),mask=images.get('sky-mask');if(!clouds||!mask)return;sky.clearRect(0,0,1304,941);sky.globalCompositeOperation='source-over';sky.imageSmoothingEnabled=true;const width=740,offset=(now/1000*5)%width;for(let i=0;i<2;i++)sky.drawImage(clouds,750-offset+i*width,23,width,185);sky.globalCompositeOperation='destination-in';sky.drawImage(mask,0,0);sky.globalCompositeOperation='source-over';}
function drawWorld(){
 const p=state.player,ch=assets.characters.find(c=>c.id===state.world.characterId);
 districtInfo=districtPainter.render(ctx,canvas,p,inventory,(c,x,y)=>drawHero(c,ch,p.direction,p.action,p.elapsed,x,y,.8,inventory.state.equipment,combat.getState()),state.zoom,!document.body.classList.contains('hide-hud'));
 worldAvatarInfo=avatar.diagnostics();
 const title=ch.name+' · '+districtInfo.sector;if($('player-title').textContent!==title)$('player-title').textContent=title;
 $('district-interaction').hidden=!districtInfo.target||state.paused||state.mapOpen||inventoryUI.isOpen;
 const labels={idle:'Стоит',walk:'Идёт',run:'Бежит',crouch_down:'Приседает',crouch_idle:'Сидит',crouch_walk:'Крадётся',stand_up:'Встаёт'};$('movement-state').textContent=labels[p.action];
}
function tick(now){const dt=Math.min((now-lastTime)/1000,.05);lastTime=now;previewTime+=dt*1000;
 if(state.screen==='menu'&&state.ready)drawClouds(now);
 if(state.screen==='character'&&state.ready){pctx.clearRect(0,0,preview.width,preview.height);drawHero(pctx,selected(),assets.directions[state.previewDirection],'idle',previewTime,140,255,3.2);}
 if(state.screen==='game'&&state.ready&&state.player){if(!state.paused&&!state.mapOpen&&!inventoryUI.isOpen)stepPlayer(state.player,keys,dt,assets.characters.find(c=>c.id===state.world.characterId).timing,moveOnLab);if(!state.paused&&!state.mapOpen&&!inventoryUI.isOpen)combat.update(dt);drawWorld();inventoryUI.updateHUD();if(inventoryUI.isOpen){const pc=$('inventory-character'),pp=pc.getContext('2d');pp.clearRect(0,0,pc.width,pc.height);drawHero(pp,assets.characters.find(c=>c.id===state.world.characterId),'south','idle',0,80,265,4,inventory.state.equipment,null);}if(!state.paused&&now-lastSave>1000){lastSave=now;persist().catch(()=>notice('Не удалось сохранить мир.'));}}
 requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
try{state.saved=await window.desktop.load();$('continue').disabled=!state.saved;}catch{notice('Не удалось прочитать сохранение. Можно создать новый мир.');}
// Read-only state used by integration checks; it never changes gameplay.
window.__prototype={avatarSnapshot:({character,direction='south',action='idle',time=0,equipment={},weaponAction=null}={})=>avatar.compose(assets.characters.find(c=>c.id===(character??state.world.characterId)),direction,action,time,equipment,weaponAction).toDataURL(),visualDiagnostics:()=>districtPainter?.visualDiagnostics(),getState:()=>JSON.parse(JSON.stringify({screen:state.screen,paused:state.paused,mapOpen:state.mapOpen,zoom:state.zoom,inventoryOpen:inventoryUI.isOpen,creativeOpen:inventoryUI.creativeOpen,screenPosition:state.player?project(state.player.x,state.player.y):null,inventory:inventory?.snapshot(),catalogSize:assets.inventory.items.length,avatar:worldAvatarInfo,weaponAction:combat?.getState(),miniMap:hud.diagnostics(),districtMetrics:{plots:0,houses:0,sectors:0,objects:0,gates:0,render:districtInfo?.stats},selected:state.selected,ready:state.ready,world:state.world,player:state.player})),flush:persist};
