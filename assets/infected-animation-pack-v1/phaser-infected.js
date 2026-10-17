/** Phaser 3 helper. Call preloadInfected in scene.preload, createInfectedAnimations in scene.create.
 * Copy this folder into your game's public assets. No Phaser dependency is bundled here.
 */
export function preloadInfected(scene, baseUrl = 'assets/infected-animation-pack-v1') {
  const ids = ['runner', 'stalker', 'clicker', 'bloater', 'shambler', 'rat-king'];
  for (const id of ids) {
    scene.load.atlas(`infected-${id}`, `${baseUrl}/${id}/spritesheet.png`, `${baseUrl}/${id}/atlas.json`);
    scene.load.json(`infected-${id}-config`, `${baseUrl}/${id}/animations.json`);
  }
}

export function createInfectedAnimations(scene) {
  for (const id of ['runner', 'stalker', 'clicker', 'bloater', 'shambler', 'rat-king']) {
    const config = scene.cache.json.get(`infected-${id}-config`);
    for (const [state, animation] of Object.entries(config.animations)) {
      const key = `${id}-${state}-south`;
      if (!scene.anims.exists(key)) scene.anims.create({
        key,
        frames: animation.frames.map(frame => ({ key: `infected-${id}`, frame })),
        frameRate: animation.frameRate,
        repeat: animation.repeat
      });
    }
  }
}

export function addInfectedSprite(scene, id, x, y) {
  const config = scene.cache.json.get(`infected-${id}-config`);
  const sprite = scene.add.sprite(x, y, `infected-${id}`, 'idle_south_00');
  sprite.setOrigin(config.origin.x, config.origin.y);
  sprite.play(`${id}-idle-south`);
  return sprite;
}

// Example:
// const enemy = addInfectedSprite(this, 'runner', 300, 200);
// enemy.play('runner-walk-south', true);
// enemy.play('runner-run-south', true);
// enemy.play('runner-attack-south'); // repeat=0; don't restart on every update!
// enemy.once('animationcomplete-runner-attack-south', () => enemy.play('runner-idle-south'));
// Set pixelArt: true in Phaser config. Sprites do not move themselves.
// Use game/server attack timing for damage; metadata event.frame=3 is only an art cue.
