// Visual-only helpers. Server combat decides when and where an effect appears.
const textureKey=id=>'combat-vfx-texture-'+id;
const animationKey=id=>'combat-vfx-animation-'+id;
export function preloadCombatVfx(scene,manifest,base='assets/combat-vfx-v1'){
 for(const e of manifest.effects)scene.load.atlas(textureKey(e.id),`${base}/effects/${e.id}/spritesheet.png`,`${base}/effects/${e.id}/atlas.json`);
}
export function createCombatVfxAnimations(scene,manifest){
 for(const e of manifest.effects){const key=animationKey(e.id);if(!scene.anims.exists(key))scene.anims.create({key,frames:e.frames.map(frame=>({key:textureKey(e.id),frame})),frameRate:e.frameRate,repeat:e.repeat});}
}
export function addCombatVfx(scene,manifest,id,x,y,options={}){
 const e=manifest.effects.find(e=>e.id===id);if(!e)throw Error('Unknown combat VFX: '+id);
 if(options.lifetimeMs!==undefined&&(!Number.isFinite(options.lifetimeMs)||options.lifetimeMs<=0))throw Error('lifetimeMs must be positive');
 const sprite=scene.add.sprite(x,y,textureKey(id),e.frames[0]).setOrigin(e.origin.x,e.origin.y);
 if(options.depth!==undefined)sprite.setDepth(options.depth);
 let timer;
 const finish=()=>{if(e.persistence==='destroy')sprite.destroy();else if(e.persistence==='decal')sprite.setFrame(e.decalFrame);};
 const cleanup=()=>{sprite.off('animationcomplete',finish);if(timer)timer.remove(false);};
 sprite.once('destroy',cleanup);
 if(e.repeat===0)sprite.once('animationcomplete',finish);
 if(options.lifetimeMs!==undefined)timer=scene.time.delayedCall(options.lifetimeMs,()=>sprite.destroy());
 sprite.play(animationKey(id));return sprite;
}
export function addCombatDecal(scene,manifest,id,x,y,options={}){
 const e=manifest.effects.find(e=>e.id===id);if(!e||e.persistence!=='decal')throw Error('No static decal for '+id);
 const sprite=addCombatVfx(scene,manifest,id,x,y,options);sprite.anims.stop();sprite.setFrame(e.decalFrame);return sprite;
}
