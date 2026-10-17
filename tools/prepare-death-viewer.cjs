const fs=require('node:fs/promises'),path=require('node:path');
const ROOT=path.resolve(__dirname,'..'),ADD='assets/infected-deaths-v1',FULL='assets/infected-animation-pack-v4';
async function main(){
 let page=await fs.readFile(path.join(ROOT,'assets/infected-animation-pack-v3/preview.html'),'utf8');
 page=page.replace('ANIMATION PACK V3','ANIMATION PACK V4').replace('Урон, оглушение и отбрасывание.','Смерть и лежащие тела.');
 page=page.replace(/<p>6 заражённых[\s\S]*?<\/p>/,'<p>6 заражённых · 24 смерти · 144 новых кадра · 24 неподвижных тела. Смерть проигрывается один раз и останавливается на теле. «Повторить» запускает просмотр заново. GIF повторяются с паузой на последнем кадре только для сравнения.</p>');
 page=page.replace('<option value="reactions">Новые реакции</option>','<option value="deaths">Смерть и тела</option>').replace('<button id="pause">','<button id="restart">Повторить</button><button id="pause">');
 page=page.replace("knockback:'Отбрасывание'","knockback:'Отбрасывание',death:'Смерть',corpse:'Лежащее тело'");
 page=page.replace("for(const state of pack.frameOrder.filter(s=>document.querySelector('#filter').value==='all'||['hurt','stunned','knockback'].includes(s))){","for(const state of [...pack.frameOrder.filter(s=>document.querySelector('#filter').value==='all'||s==='death'),'corpse']){");
 page=page.replace("const a=m.directions[dir].animations[state];","const a=state==='corpse'?{durationMs:1,static:true}:m.directions[dir].animations[state];");
 page=page.replace("'+a.durationMs+' мс","'+(a.static?'неподвижно':a.durationMs+' мс')+'");
 page=page.replace("'+state+'.gif", "'+(state==='corpse'?'death':state)+'.gif");
 page=page.replace('PNG-лист ↗</a>','PNG-лист ↗</a> · <a href="\'+m.id+\'/\'+dir+\'/corpse.png">Тело PNG ↗</a>');
 page=page.replace('row:pack.frameOrder.indexOf(state)','row:pack.frameOrder.indexOf(state===\'corpse\'?\'death\':state)');
 page=page.replace("document.querySelector('#pause').onclick=", "document.querySelector('#restart').onclick=()=>{time=0;stepOffset=0;playing=true;document.querySelector('#pause').textContent='Пауза'};\ndocument.querySelector('#pause').onclick=");
 page=page.replace('const i=(Math.floor(time/c.a.durationMs)+stepOffset)%6,',"const n=Math.floor(time/c.a.durationMs)+stepOffset,i=c.a.static?5:c.state==='death'?Math.min(5,n):n%6,");
 page=page.replace("'Кадр '+(i+1)+'/6'", "(c.a.static?'Статичный PNG':c.state==='death'&&i===5?'Тело · финальный кадр':'Кадр '+(i+1)+'/6')");
 await fs.writeFile(path.join(ROOT,FULL,'preview.html'),page);
 await fs.writeFile(path.join(ROOT,ADD,'preview.html'),page.replace('ANIMATION PACK V4','DEATH PACK V1').replace('Все движения','Все смерти'));
 const helper=(await fs.readFile(path.join(ROOT,'assets/infected-animation-pack-v3/phaser-infected.js'),'utf8')).replace('infected-animation-pack-v3','infected-animation-pack-v4');
 const extra=`
// Run on the transition to dead. Game/server disables AI, collisions and damage separately.
export function playInfectedDeath(sprite,id,direction) {
  if(sprite.getData('infectedDead')) return sprite;
  sprite.setData('infectedDead',true);
  const key=id+'-death-'+direction;
  sprite.once('animationcomplete-'+key,()=>showInfectedCorpse(sprite,id,direction));
  return playInfected(sprite,id,'death',direction,false);
}

// Restore a persistent corpse directly from saved server state, without replaying death.
export function showInfectedCorpse(sprite,id,direction) {
  const texture='infected-'+id+'-'+direction;
  const config=sprite.scene.cache.json.get(texture+'-config');
  sprite.anims.stop();
  sprite.setTexture(texture,config.corpse.frame);
  sprite.setOrigin(config.origin.x,config.origin.y);
  sprite.setFlipX(false);
  sprite.setData('infectedDead',true);
  return sprite;
}
// playInfectedDeath(enemy,'clicker','north');
// showInfectedCorpse(enemy,'clicker','north');
// Before recycling a pooled sprite, clear infectedDead and remove its death completion listener.
`;
 await fs.writeFile(path.join(ROOT,FULL,'phaser-infected.js'),helper+extra);
 let addon=(helper+extra).replace('infected-animation-pack-v4','infected-deaths-v1').replace('`idle_${direction}_00`','`death_${direction}_00`').replace("return playInfected(sprite,id,'idle',direction);","return playInfectedDeath(sprite,id,direction);");
 addon=addon.split('\n').filter(l=>!l.startsWith('// playInfected(enemy,')).join('\n');
 await fs.writeFile(path.join(ROOT,ADD,'phaser-infected.js'),addon);
 console.log('Prepared death viewers and one-shot / static corpse integration helpers');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
