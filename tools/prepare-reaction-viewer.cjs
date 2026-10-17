const fs=require('node:fs/promises'),path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
async function main(){
 const base=path.join(ROOT,'assets/infected-animation-pack-v2');
 let page=await fs.readFile(path.join(base,'preview.html'),'utf8');
 page=page.replace('ANIMATION PACK V2','ANIMATION PACK V3').replace('Все движения. Четыре направления.','Урон, оглушение и отбрасывание.');
 page=page.replace('6 заражённых · 96 анимаций · 576 кадров.','6 заражённых · 72 новые реакции · 168 анимаций всего.');
 page=page.replace('Атаки здесь повторяются для просмотра; в игровых настройках они однократные.','Здесь одноразовые реакции повторяются для просмотра. В игровых JSON hurt/knockback однократные; stunned зациклен.');
 page=page.replace("attack:'Атака'","attack:'Атака',hurt:'Получение урона',stunned:'Оглушение',knockback:'Отбрасывание'");
 page=page.replace('<button id="pause">','<label>Показать <select id="filter"><option value="reactions">Новые реакции</option><option value="all">Все движения</option></select></label><button id="pause">');
 page=page.replace('for(const state of pack.frameOrder){',"for(const state of pack.frameOrder.filter(s=>document.querySelector('#filter').value==='all'||['hurt','stunned','knockback'].includes(s))){");
 page=page.replace("document.querySelector('#pause').onclick=", "document.querySelector('#filter').onchange=()=>{time=0;stepOffset=0;render()};\ndocument.querySelector('#pause').onclick=");
 await fs.writeFile(path.join(ROOT,'assets/infected-animation-pack-v3/preview.html'),page);
 let addon=page.replace('ANIMATION PACK V3','REACTIONS PACK V1').replace('168 анимаций всего','432 новых кадра').replace('<option value="all">Все движения</option>','<option value="all">Все реакции</option>');
 await fs.writeFile(path.join(ROOT,'assets/infected-reactions-v1/preview.html'),addon);
 const helper=(await fs.readFile(path.join(base,'phaser-infected.js'),'utf8')).replace('infected-animation-pack-v2','infected-animation-pack-v3');
 const examples=`\n// Reaction examples:\n// playInfected(enemy,'runner','hurt','east'); // one shot\n// playInfected(enemy,'runner','stunned','south'); // loop until game clears stun\n// playInfected(enemy,'runner','knockback','west'); // one shot, no root motion\n// Direction is facing, not the force vector. Game/server applies displacement separately.\n// Avoid restarting one-shot reactions every update. Return to idle/state after animationcomplete.\n`;
 await fs.writeFile(path.join(ROOT,'assets/infected-animation-pack-v3/phaser-infected.js'),helper+examples);
 const addonHelper=(helper+examples).replace('infected-animation-pack-v3','infected-reactions-v1').replace('`idle_${direction}_00`','`hurt_${direction}_00`').replace("id,'idle',direction","id,'hurt',direction").split('\n').filter(line=>!line.startsWith('// playInfected(enemy,')||line.includes("'hurt'")||line.includes("'stunned'")||line.includes("'knockback'")).join('\n');
 await fs.writeFile(path.join(ROOT,'assets/infected-reactions-v1/phaser-infected.js'),addonHelper);
 console.log('Prepared combined and reaction-only viewers + Phaser helpers');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
