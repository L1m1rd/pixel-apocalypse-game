// Phaser 3 integration example. Animation assets only: gameplay/physics remains separate.
export const INFECTED_IDS = ['runner','stalker','clicker','bloater','shambler','rat-king'];
export const DIRECTIONS = ['south','west','east','north'];

export function preloadInfected(scene, baseUrl='assets/infected-reactions-v1') {
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

export function addInfectedSprite(scene,id,x,y,direction='south') {
  const sprite=scene.add.sprite(x,y,`infected-${id}-${direction}`,`hurt_${direction}_00`);
  return playInfected(sprite,id,'hurt',direction);
}

// scene.preload(): preloadInfected(this);
// scene.create(): createInfectedAnimations(this);
// const enemy=addInfectedSprite(this,'runner',300,200);
// Attack is one-shot; play it on state transition, not every update.
// All sprites face their named direction; no runtime mirroring/rotation is necessary.
// Use pixelArt:true in Phaser config and integer enlargement.

// Reaction examples:
// playInfected(enemy,'runner','hurt','east'); // one shot
// playInfected(enemy,'runner','stunned','south'); // loop until game clears stun
// playInfected(enemy,'runner','knockback','west'); // one shot, no root motion
// Direction is facing, not the force vector. Game/server applies displacement separately.
// Avoid restarting one-shot reactions every update. Return to idle/state after animationcomplete.
