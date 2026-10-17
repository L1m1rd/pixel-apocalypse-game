const fs=require('node:fs/promises'),path=require('node:path');
const ROOT=path.resolve(__dirname,'..'),ADD=path.join(ROOT,'assets/infected-specials-v1'),FULL=path.join(ROOT,'assets/infected-animation-pack-v5');
async function main(){
 const style=(await fs.readFile(path.join(ROOT,'assets/infected-animation-pack-v4/preview.html'),'utf8')).match(/<style>([\s\S]*?)<\/style>/)[1];
 const page=`<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Специальные атаки заражённых</title>
<style>${style}.phase-notes{border-left:3px solid #d0af72;padding:8px 16px;margin:16px 0}.empty{padding:20px;color:#b9c4b9}h2{scroll-margin-top:20px}</style>
<header><div class="eyebrow">INFECTED · SPECIAL ATTACKS</div><h1>Наросты, таран и ярость.</h1><p>Бросок топляка, семь приёмов и переходов Крысиного короля, четыре отдельных эффекта. Новые движения: 32 анимации персонажей + 4 VFX, 216 кадров. Здесь атаки повторяются для просмотра; в игровых JSON они однократные. Бег тарана и постоянное облако зациклены.</p>
<div class="phase-notes">Предлагаемые фазы босса: I — обычные удары; II — таран и комбо; III — ярость и удар по земле. Пороги здоровья — предварительный баланс в boss-phases.json. Этот экран показывает графику; урон и серверная логика здесь не рассчитываются.</div>
<div class="controls"><label>Заражённый <select id="monster"></select></label><label>Показать <select id="filter"><option value="specials">Спецприёмы</option><option value="phases">Переходы фаз</option><option value="all">Все движения</option><option value="fx">Только эффекты</option></select></label><button id="restart">Повторить</button><button id="pause">Пауза</button><button id="step">Следующий кадр</button><label>Скорость <select id="speed"><option value="0.5">0,5×</option><option value="1" selected>1×</option><option value="2">2×</option></select></label><button id="background">Светлый фон</button><span id="status" class="small">Загрузка…</span></div></header><main id="content"></main>
<script src="manifest.js"></script><script>
const pack=window.INFECTED_PACK,dirs=pack.directions,dirNames={south:'↓ Спереди',west:'← Слева',east:'→ Справа',north:'↑ Со спины'};
const names={idle:'Ожидание',walk:'Ходьба',run:'Бег',attack:'Атака',hurt:'Получение урона',stunned:'Оглушение',knockback:'Отбрасывание',death:'Смерть',throw_growth:'Бросок грибного нароста',charge_start:'Таран: подготовка',charge_loop:'Таран: бег',charge_impact:'Таран: столкновение и восстановление',heavy_combo:'Комбо из двух ударов',ground_slam:'Удар по земле',phase2_roar:'Переход во вторую фазу',phase3_enrage:'Переход в третью фазу: ярость',growth_projectile:'Летящий нарост',spore_burst:'Всплеск спор',spore_cloud:'Облако спор',slam_dust:'Пыль от удара по земле'};
const basic=['idle','walk','run','attack','hurt','stunned','knockback','death'],pictures=new Map();let loaded=0,errors=0,cards=[],time=0,last=performance.now(),playing=true,step=0;
const expected=pack.monsters.length*4+pack.effects.length;
function load(key,url){const img=new Image();img.onload=()=>{loaded++;document.querySelector('#status').textContent=loaded+'/'+expected+' листов загружено'};img.onerror=()=>{errors++;document.querySelector('#status').textContent='Ошибка: '+url};img.src=url;pictures.set(key,img)}
for(const m of pack.monsters){const o=document.createElement('option');o.value=m.id;o.textContent=m.name;document.querySelector('#monster').append(o);for(const d of dirs)load(m.id+'/'+d,m.id+'/'+d+'/spritesheet.png')}
for(const fx of pack.effects)load('fx/'+fx.id,'fx/'+fx.id+'/spritesheet.png');document.querySelector('#monster').value='bloater';
function section(title){const s=document.createElement('section');s.className='row';const h=document.createElement('h2');h.textContent=title;s.append(h);const grid=document.createElement('div');grid.className='grid';s.append(grid);document.querySelector('#content').append(s);return grid}
function card(grid,c,title,url){const a=document.createElement('article');a.className='card';a.innerHTML='<h3>'+title+'</h3><div class="stage"><canvas width="256" height="256" data-state="'+c.state+'" data-direction="'+c.dir+'"></canvas></div><div class="meta"><span class="frame"></span><br><a href="'+url+'">GIF ↗</a> · '+(c.a.repeat===-1?'Цикл':'Один раз')+'</div>';grid.append(a);cards.push({...c,canvas:a.querySelector('canvas'),label:a.querySelector('.frame')})}
function render(){document.querySelector('#content').replaceChildren();cards=[];const m=pack.monsters.find(m=>m.id===document.querySelector('#monster').value),filter=document.querySelector('#filter').value;
 const states=m.frameOrder.filter(s=>filter==='all'||filter==='phases'&&s.startsWith('phase')||filter==='specials'&&!basic.includes(s));
 if(filter!=='fx'&&!states.length){const p=document.createElement('p');p.className='empty';p.textContent='Для выбранного заражённого в этом разделе нет новых приёмов. Выберите топляка или Крысиного короля.';document.querySelector('#content').append(p)}
 if(filter!=='fx')for(const state of states){const grid=section(names[state]+' · '+m.frameSize+' × '+m.frameSize+' px');for(const d of dirs)card(grid,{state,dir:d,a:m.directions[d].animations[state],size:m.frameSize,row:m.frameOrder.indexOf(state),imageKey:m.id+'/'+d},dirNames[d],m.id+'/'+d+'/previews/'+state+'.gif')}
 const grid=section('Отдельные эффекты');for(const fx of pack.effects)card(grid,{state:fx.id,dir:'fx',a:fx,size:fx.frameWidth,row:0,imageKey:'fx/'+fx.id},names[fx.id],'fx/'+fx.id+'/preview.gif');
}
function reset(){time=0;step=0;render()};document.querySelector('#monster').onchange=reset;document.querySelector('#filter').onchange=reset;
document.querySelector('#restart').onclick=()=>{reset();playing=true;document.querySelector('#pause').textContent='Пауза'};document.querySelector('#pause').onclick=e=>{playing=!playing;e.target.textContent=playing?'Пауза':'Продолжить'};document.querySelector('#step').onclick=()=>{playing=false;document.querySelector('#pause').textContent='Продолжить';step++};document.querySelector('#background').onclick=()=>document.body.classList.toggle('light');
function tick(now){if(playing)time+=(now-last)*Number(document.querySelector('#speed').value);last=now;for(const c of cards){const image=pictures.get(c.imageKey);if(!image.complete||!image.naturalWidth)continue;const n=Math.floor(time/c.a.durationMs)+step,i=c.state==='death'?Math.min(5,n):n%6,ctx=c.canvas.getContext('2d'),s=c.size,zoom=Math.floor(256/s),draw=s*zoom;ctx.imageSmoothingEnabled=false;ctx.clearRect(0,0,256,256);ctx.drawImage(image,i*s,c.row*s,s,s,(256-draw)/2,(256-draw)/2,draw,draw);const event=(c.a.events||[]).filter(e=>e.frame===i).map(e=>e.name).join(', ');c.label.textContent='Кадр '+(i+1)+'/6'+(event?' · '+event:'');c.label.className='frame'+(event?' hot':'')}requestAnimationFrame(tick)}render();requestAnimationFrame(tick);
</script></html>`;
 for(const folder of[ADD,FULL])await fs.writeFile(path.join(folder,'preview.html'),page);
 const extras=`
export const INFECTED_FX_IDS=['growth_projectile','spore_burst','spore_cloud','slam_dust'];
export function preloadInfectedEffects(scene,baseUrl='assets/infected-animation-pack-v5') {
 for(const id of INFECTED_FX_IDS){const key='infected-fx-'+id,url=baseUrl+'/fx/'+id;scene.load.atlas(key,url+'/spritesheet.png',url+'/atlas.json');scene.load.json(key+'-config',url+'/animation.json');}
}
export function createInfectedEffectAnimations(scene) {
 for(const id of INFECTED_FX_IDS){const key='infected-fx-'+id,a=scene.cache.json.get(key+'-config');if(!scene.anims.exists('fx-'+id))scene.anims.create({key:'fx-'+id,frames:a.frames.map(frame=>({key,frame})),frameRate:a.frameRate,repeat:a.repeat});}
}
export function addInfectedEffect(scene,id,x,y) {
 const config=scene.cache.json.get('infected-fx-'+id+'-config');if(!config)throw Error('Effect not preloaded: '+id);
 const sprite=scene.add.sprite(x,y,'infected-fx-'+id,config.frames[0]);sprite.setOrigin(config.origin.x,config.origin.y);
 if(config.repeat===0)sprite.once('animationcomplete-fx-'+id,()=>sprite.destroy());sprite.play('fx-'+id);return sprite;
}
export function playInfectedSpecial(sprite,id,state,direction) {
 if(sprite.getData('infectedDead'))return sprite;
 const config=sprite.scene.cache.json.get('infected-'+id+'-'+direction+'-config');
 if(!config?.animations[state]||!['throw_growth','charge_start','charge_loop','charge_impact','heavy_combo','ground_slam','phase2_roar','phase3_enrage'].includes(state))throw Error('Unknown special: '+id+'/'+state+'/'+direction);
 return playInfected(sprite,id,state,direction,false);
}
// Bind once per sprite. Visual hooks only: server decides hits, projectiles and phase state.
export function bindInfectedSpecialEvents(sprite,onEvent) {
 const lookup=new Map();for(const id of INFECTED_IDS)for(const direction of DIRECTIONS){const c=sprite.scene.cache.json.get('infected-'+id+'-'+direction+'-config');if(c)for(const[state,a]of Object.entries(c.animations))if(a.events?.length)lookup.set(id+'-'+state+'-'+direction,{id,direction,state,a,config:c});}
 let delivered=new Set();const reset=()=>{delivered=new Set()};
 const update=(anim,frame)=>{if(sprite.getData('infectedDead'))return;const item=lookup.get(anim.key);if(!item)return;item.a.events.forEach((event,index)=>{if(frame.textureFrame===item.a.frames[event.frame]&&!delivered.has(index)){delivered.add(index);const socket=event.socket?item.config.sockets[event.socket]:undefined;onEvent({...event,monster:item.id,direction:item.direction,state:item.state,socket});}});};
 sprite.on('animationstart',reset);sprite.on('animationrepeat',reset);sprite.on('animationupdate',update);
 return()=>{sprite.off('animationstart',reset);sprite.off('animationrepeat',reset);sprite.off('animationupdate',update)};
}
// playInfectedSpecial(enemy,'bloater','throw_growth','east');
// bindInfectedSpecialEvents(enemy,e=>{ if(e.name==='projectile_release'){ /* request server-approved projectile */ } });
// A socket is local texture pixels: world offset = (socket - frameSize * origin) * sprite scale.
// charge_loop has no root motion: the game/server moves and collision-checks the charge.
// Looping projectile/cloud VFX must be removed by world logic when expired; bursts self-destroy.
`;
 const base=(await fs.readFile(path.join(ROOT,'assets/infected-animation-pack-v4/phaser-infected.js'),'utf8')).replace('infected-animation-pack-v4','infected-animation-pack-v5');await fs.writeFile(path.join(FULL,'phaser-infected.js'),base+extras);
 const addon=`export const INFECTED_IDS=['bloater','rat-king'];\nexport const DIRECTIONS=['south','west','east','north'];\n`+base.slice(base.indexOf('export function preloadInfected'),base.indexOf('export function addInfectedSprite'))+extras;
 await fs.writeFile(path.join(ADD,'phaser-infected.js'),addon.replaceAll('infected-animation-pack-v5','infected-specials-v1'));
 console.log('Prepared dynamic per-monster viewers and visual event / VFX helpers');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
