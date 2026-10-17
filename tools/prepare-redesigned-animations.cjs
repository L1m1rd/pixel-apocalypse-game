const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
const ROOT=path.resolve(__dirname,'..'),OUT=path.join(ROOT,'assets/infected-redesign-animations-v1');
const OLD=['runner','stalker','clicker','bloater','shambler','rat-king'];
const motion={
 idle:'Six-frame seamless IDLE: feet planted, gentle breathing, shoulders rise and settle, subtle hand sway. Six distinct small pose changes, no walking or turning.',
 walk:'Six-frame seamless WALK in place: left contact, left support/opposite foot passes, right leg advances, right contact, right support/opposite foot passes, left leg advances. Opposite arm swing and short stride, upright body. Left/right limbs alternate clearly.',
 run:'Six-frame seamless RUN in place: left contact, left push-off/right knee forward, flight, right contact, right push-off/left knee forward, flight. Wide leg separation, forward torso lean, bent elbows pumping. Distinct from walking. Ground coordinates stay fixed.',
 attack:'Six-frame one-shot ATTACK: neutral ready, visible wind-up, forward reach, contact at fourth frame, recoil, return to ready. ' ,
 hurt:'Six-frame one-shot HIT REACTION, non-graphic: flinch, twist torso, recoil at shoulder, recover balance, relax, return ready. No blood, impact particles or damage to costume.',
 stunned:'Six-frame looping STUNNED pose: unstable planted stance, head hanging, shoulders sway left then right, arms loose, knees flex slightly, no locomotion. No stars or effects. Six distinct swaying poses.',
 knockback:'Six-frame one-shot KNOCKBACK pose sequence: brace, backward lean, arms spread for balance, one foot catches weight, settle crouch, recover balance. In-place body gesture only; no horizontal travel across cells, no effect particles.',
 death:'Six-frame non-graphic FALL AND REST sequence: standing loses balance, knees buckle, torso drops, tips onto side, settles near ground, ends COMPLETELY LYING STILL on side with limbs resting. The last frame is a STATIC BODY. Same intact clothed creature; no blood, wound, exposed tissue, particles or missing limbs. Preserve identity and mutations through all six poses. Keep body and long arms entirely inside the cell even in horizontal final pose.',
 throw_growth:'Six-frame one-shot THROW: prepare, reach to own shoulder shell, raise throwing hand holding small ochre organic fragment, release forward in fourth frame, follow-through, recover. Only tiny hand-held fragment; no airborne projectile, spore cloud, dust or other VFX drawn into character frames.',
 charge_start:'Six-frame one-shot CHARGE PREPARATION: brace planted feet, hunch torso, draw heavy arms back, crouch and lean threateningly forward, load weight, end ready to accelerate. Keep reference anatomy, all limbs visible.',
 charge_loop:'Six-frame seamless CHARGING RUN in place: powerful forward lean, heavy alternating footfalls, huge arms drive rhythmically, visible leg separation. Six alternating support/flight phases. No root travel or particles.',
 charge_impact:'Six-frame one-shot CHARGE COLLISION gesture: lead shoulder forward, brace, abrupt forward compression/contact in third frame, heavy recoil, regain footing, recover. No wall, other target, debris, particles or effects.',
 heavy_combo:'Six-frame one-shot TWO-HIT COMBO: raise dominant arm, first swing wind-up, first forward contact in third frame, raise opposite arm, second forward contact in fifth frame, recoil. Clearly distinct sequential arm gestures, no victims, particles or gore.',
 ground_slam:'Six-frame one-shot GROUND SLAM: lower stance, lift BOTH arms, arms high overhead, slam both hands toward floor in fourth frame, hands near ground follow-through, rise halfway. No dust, shock ring, ground or particles in sprite.',
 phase2_roar:'Six-frame one-shot PHASE TWO ROAR transition: brace, open arms outward, expand chest, head tilted up and arms wide at fourth-frame peak, lower arms, settle aggressively. Mouth may open slightly, no mouth gore. Same approved body anatomy and clothing, no extra appendages.',
 phase3_enrage:'Six-frame one-shot FINAL PHASE ENRAGE transition: tighten crouch, draw dominant arm upward, raise both arms asymmetrically, tense overhead threatening pose at fourth-frame peak, hammer arms downward beside torso, finish in deep aggressive stance. Distinct silhouette from phase2 open-arms roar. Same approved identity, no new growths, glow, particles or detached creatures.'
};
async function main(){
 await fs.mkdir(path.join(OUT,'sources'),{recursive:true});await fs.mkdir(path.join(OUT,'references'),{recursive:true});
 const approved=JSON.parse(await fs.readFile(path.join(ROOT,'assets/infected-redesign-pixel-v1/manifest.json'),'utf8'));
 const old=JSON.parse(await fs.readFile(path.join(ROOT,'assets/infected-animation-pack-v5/manifest.json'),'utf8'));
 const jobs=[],characters=[];
 for(const c of approved.images){
  const typeIndex=Number(c.id.slice(0,2))-1,m=old.monsters.find(m=>m.id===OLD[typeIndex]);
  const ref=path.join(OUT,'references',c.id+'.png');await fs.copyFile(path.join(ROOT,'assets/infected-redesign-pixel-v1',c.art),ref);
  const actions={};
  for(const state of m.frameOrder){
   const original=m.directions.south.animations[state];
   actions[state]={durationMs:original.durationMs,frameRate:original.frameRate,repeat:original.repeat,rootMotion:false,...(original.events?{events:original.events.map(({socket,...rest})=>rest)}:{})};
   if(state==='death')Object.assign(actions[state],{holdLastFrame:true});
   const attack=typeIndex===4?'This spore-emitter character compresses rib/shoulder structures and opens arms/chest in fourth frame to signal emission; draw BODY ONLY with no emitted spores.':typeIndex>=3?'Heavy broad arm strike with a clear wind-up, preserve asymmetrical arm sizes.':'Short aggressive hand swipe or shove; preserve reference arm length and crouch.';
   const prompt='Use case: stylized-concept. Production PIXEL ART animation sheet for a 2D survival game. Attached image is the APPROVED character appearance: faithfully preserve its exact clothing, hair, body shape, mutation type and LEFT/RIGHT asymmetry in every pose. New poses only; do not redesign character or replace it with a generic zombie. Canvas EXACTLY1536x1024 transparent RGBA, exactly6columns by4rows, 24 separate FULL BODY sprites. Cells256x256, sprite centered at localx128, ordinary standing feet near localy218, maximum standing height170px and maximum full-body width180px, generous transparent gutters. Rows TOP TO BOTTOM are SOUTH/front facing down, WEST true left side facing left, EAST true right side facing right, NORTH/back facing away. North MUST show back of head/back of torso without a face; keep asymmetrical mutations on the anatomically correct side in all views, never mirror the character identity. Each row six consecutive temporal keyframes of ONE action, left to right, same direction for all6frames. No text, labels, cell borders, ground, shadows, backdrop, props, victims or VFX. Crisp chunky pixel clusters, limited muted palette, hard pixel edges matching reference, no blur or realistic gore. Intact non-graphic organic costume surfaces. Every figure and every limb/growth tip must fit within its own cell. Keep body scale constant across all24poses. Do not paste one unchanged image repeatedly. Action: '+motion[state]+(state==='attack'?attack:'')+' Character ID '+c.id+' '+c.name+'; class '+c.grade+' ('+c.strength+'). The grade does not change the approved appearance.';
   jobs.push({id:c.id+'-'+state,character:c.id,state,reference:'references/'+c.id+'.png',source:'sources/'+c.id+'-'+state+'.png',prompt});
  }
  characters.push({id:c.id,name:c.name,type:c.type,typeName:c.typeName,grade:c.grade,strength:c.strength,frameSize:c.frameWidth,origin:c.origin,reference:'references/'+c.id+'.png',previousRole:OLD[typeIndex],frameOrder:m.frameOrder,actions});
 }
 const write=async(name,v)=>fs.writeFile(path.join(OUT,name),JSON.stringify(v,null,2)+'\n');
 await write('build-plan.json',{status:'local review only; publication forbidden until user approval',directions:['south','west','east','north'],totalCharacters:18,totalSourceSheets:jobs.length,totalAnimations:jobs.length*4,totalFrames:jobs.length*24,gradeSystem:approved.gradeSystem,characters});
 await write('generation-prompts.json',{tool:'built-in image_gen',transparentBackground:true,jobs});
 const paths=['assets/infected-animation-pack-v5/fx','assets/infected-specials-v1/fx','assets/combat-vfx-v1'];let protectedFiles=[];
 async function walk(rel){for(const e of await fs.readdir(path.join(ROOT,rel),{withFileTypes:true})){const file=rel+'/'+e.name;if(e.isDirectory())await walk(file);else{const bytes=await fs.readFile(path.join(ROOT,file));protectedFiles.push({path:file,bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')});}}}
 for(const rel of paths)await walk(rel);await write('unchanged-effects-before.json',{protectedPaths:paths,files:protectedFiles});
 console.log(JSON.stringify({characters:18,sourceSheets:jobs.length,animations:jobs.length*4,frames:jobs.length*24,protectedEffectFiles:protectedFiles.length}));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
