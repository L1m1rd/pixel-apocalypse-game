export const INFECTED_IDS=['bloater','rat-king'];
export const DIRECTIONS=['south','west','east','north'];
export function preloadInfected(scene, baseUrl='assets/infected-specials-v1') {
  for(const id of INFECTED_IDS) for(const dir of DIRECTIONS) {
    const key=`infected-${id}-${dir}`, url=`${baseUrl}/${id}/${dir}`;
    scene.load.atlas(key, `${url}/spritesheet.png`, `${url}/atlas.json`);
    scene.load.json(`${key}-config`, `${url}/animations.json`);
  }
}

export function createInfectedAnimations(scene) {
  for(const id of INFECTED_IDS) for(const dir of DIRECTIONS) {
    const texture=`infected-${id}-${dir}`;
    const config=scene.cache.json.get(`${texture}-config`);
    for(const [state,a] of Object.entries(config.animations)) {
      const key=`${id}-${state}-${dir}`;
      if(!scene.anims.exists(key)) scene.anims.create({key,frames:a.frames.map(frame=>({key:texture,frame})),frameRate:a.frameRate,repeat:a.repeat});
    }
  }
}

export function directionFromVelocity(vx,vy,previous='south') {
  if(Math.abs(vx)<0.001&&Math.abs(vy)<0.001) return previous;
  return Math.abs(vx)>Math.abs(vy) ? (vx>0?'east':'west') : (vy>0?'south':'north');
}

export function playInfected(sprite,id,state,direction,ignoreIfPlaying=true) {
  const config=sprite.scene.cache.json.get(`infected-${id}-${direction}-config`);
  sprite.setOrigin(config.origin.x,config.origin.y);
  sprite.setFlipX(false);
  sprite.play(`${id}-${state}-${direction}`,ignoreIfPlaying);
  return sprite;
}


export const INFECTED_FX_IDS=['growth_projectile','spore_burst','spore_cloud','slam_dust'];
export function preloadInfectedEffects(scene,baseUrl='assets/infected-specials-v1') {
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
