const base=require('./wildlife-catalog.cjs');
const mammals={
 hare:['ears swivel, nose twitches, gentle breathing','short gentle hind-leg hops, landing forepaws then hind paws','explosive hare bounding: powerful hind-leg push, stretched suspension, tucked recovery'],
 squirrel:['nose twitches and bushy tail makes small curls','light four-paw scamper, lifted tail balancing each step','rapid bounding scamper, hind legs push together, arched tail counterbalances'],
 fox:['subtle ear flick, chest breathing and white tail-tip twitch','careful light four-beat steps, narrow paw tracks, head level','springy low fox gallop, fore/hind legs alternately extend and gather, bushy tail balances'],
 roe_deer:['alert ear flicks, gentle neck movement, breathing','delicate high-hoof four-beat walking, light weight transfer','elastic deer bounds, compact push-off, airborne extension, fore-hoof landing'],
 red_deer:['slow breathing, small head and antler adjustments','measured long four-beat hoof strides, proud steady neck','powerful long-stride gallop, fore/hind extension and suspension, antlers stable'],
 wild_boar:['snout sniffs, heavy shoulder breathing, small ear flick','stocky short stiff-legged steps, low head and shoulder sway','compact fast boar gallop, rapid short hooves, heavy rounded body bobs'],
 wolf:['steady alert head, ears twitch and chest breathes','quiet deliberate four-beat paw placement, head and spine level','low extended wolf gallop, spine stretches and compresses, long suspension, tail low'],
 brown_bear:['slow heavy breathing, slight head movement and ear twitch','lumbering heavy alternating paws, shoulder roll and hip sway','powerful heavy rolling bear gallop, weight shifts through massive shoulders and planted forepaws'],
 stray_dog:['gentle panting, slight ear movement and relaxed tail twitch','loose natural dog walking with alternating paws and tail sway','energetic four-paw dog gallop, clear gathered and extended phases, tail bounces'],
 cat:['small ear flicks, gentle breathing and slow tail-tip curl','quiet graceful feline steps, hind paws follow front-paw tracks','distinct feline sprint: deeply curled then fully stretched spine, gathered hind legs and long leap'],
 rat:['nose and whiskers twitch, small ear movements','low cautious tiny alternating steps, long bare tail drags gently','very fast low rat scurry, rippling spine and short rapid paws, thin tail snakes behind'],
 goat:['small chewing motion, ear movement and beard sway','sure-footed hoof steps, precise raised feet, firm compact back','light bouncy goat canter, short springy bounds, horns and beard move naturally'],
 cow:['slow chewing, breathing and small tail swish','heavy steady four-beat hoof steps, shoulder/hip roll','heavy lumbering bovine trot, short brisk hoof lift and broad body bounce, avoid horse gallop']
};
const attacks={
 stray_dog:'short aggressive forward biting lunge, jaws open then snap shut, front paws brace, then recover',
 brown_bear:'one powerful forepaw swipe: brace on three paws, raise one forepaw, swing it forward/down, plant it and recover; never human biped stance',
 wolf:'low predatory biting lunge, neck stretches forward, fangs snap, forepaws reach and brace, then recoil',
 wild_boar:'lowered-head tusk shove, short forward shoulder thrust, snout sweeps upward in a goring motion, then settle',
 red_deer:'lower branching antlers, brace forehooves, thrust head and antlers forward in a short forceful jab, lift head and recover',
 roe_deer:'quick compact lowered-head antler jab, short neck thrust with braced hooves, then alert recovery'
};
const birds={
 crow:['alert head tilts, throat and feather settling','alternating ground toe steps with deliberate head bobs','quick longer ground strides with slight hops, folded wings and forward neck','broad powerful corvid wingbeats, clear upstroke and downstroke, legs tucked'],
 pigeon:['rhythmic tiny head bob, chest breathing and folded wing settling','distinct pigeon alternating toe steps and forward/back head bob','rapid short pigeon ground steps, strong head bob, wings folded','quick strong pigeon wingbeats, broad fanned flight feathers, compact tucked feet'],
 sparrow:['small quick head twitches and soft feather settling','small slow two-foot sparrow hops along the ground, wings folded','rapid consecutive two-foot ground hops, compact body bounces, wings folded','rapid short small-bird wingbeats with clear spread flight feathers and tucked legs'],
 duck:['small bill/head movement, breathing and tail twitch','waddling webbed-foot steps, broad side-to-side body sway','fast hurried duck waddle, short webbed-foot strides and forward pitch, folded wings','steady direct duck wingbeats, neck extended forward and webbed feet tucked'],
 chicken:['small head looks, breathing and feather settling','head-bobbing hen steps, clear high knee and toe movement','hurried short hen ground strides, neck forward and tail bouncing','a short hen flutter: crouch, spread wings, two strong flaps with feet tucked, descend and land']
};
const labels={idle:'Ожидание',walk:'Ходьба',run:'Бег',fly:'Полёт',swim:'Плавание',jump:'Прыжок',attack:'Атака'};
module.exports=base.map(([id,name,subject,staticCanvas,worldHeight])=>{
 const actions=[];const add=(key,motion,loop=true,ms=110)=>actions.push({id:key,label:labels[key],motion,loop,frameMs:ms,frames:6,...(key==='attack'?{activeFrames:[2,3],impactFrame:2}:{} )});
 if(mammals[id]){const p=mammals[id];add('idle',p[0],true,180);add('walk',p[1],true,id==='brown_bear'||id==='cow'?150:110);add('run',p[2],true,id==='brown_bear'||id==='cow'?100:75);}
 if(birds[id]){const p=birds[id];add('idle',p[0],true,170);add('walk',p[1],true,120);add('run',p[2],true,80);add('fly',p[3],id!=='chicken',id==='sparrow'?65:id==='chicken'?100:80);if(id==='chicken')actions.at(-1).label='Короткий перелёт';if(id==='sparrow')actions.find(a=>a.id==='walk').label='Прыжки по земле';}
 if(id==='duck')add('swim','buoyant calm duck swimming, subtle alternating webbed-foot paddles under the body and gentle body rocking; no painted water or ripples',true,130);
 if(id==='frog'){add('idle','subtle throat-sac breathing and tiny head/eye settling',true,180);add('jump','complete frog jump in six phases: relaxed crouch, deep compression, hind-leg takeoff, stretched airborne leap, tucked descent, soft four-foot landing; keep vertical lift and leg extension visible',false,100);add('swim','webbed hind legs gather, spread outward, kick backward, extend, return and glide; frog breaststroke paddling with full limb movement',true,120);}
 if(id==='fish'){add('idle','hovering fish with very small fin flutter and gentle tail movements, same body orientation',true,170);add('swim','clear side-to-side undulating fish spine and tail propulsion, alternating fin motion, smooth six-frame swimming cycle',true,100);}
 if(attacks[id])add('attack',attacks[id],false,id==='brown_bear'?120:95);
 const pace={hare:[135,75],squirrel:[95,65],fox:[110,80],roe_deer:[120,80],red_deer:[130,85],wild_boar:[125,85],wolf:[120,80],brown_bear:[160,110],stray_dog:[110,75],cat:[120,70],rat:[85,55],goat:[115,85],cow:[170,110],crow:[125,90],pigeon:[115,80],sparrow:[115,65],duck:[145,95],chicken:[125,80]};
 for(const a of actions){if(pace[id]&&a.id==='walk')a.frameMs=pace[id][0];if(pace[id]&&a.id==='run')a.frameMs=pace[id][1];if(a.id==='fly')a.frameMs=({crow:90,pigeon:70,sparrow:65,duck:85,chicken:100})[id];}
 return {id,name,subject,variant:'B',characterId:id+'_b',frameSize:256,worldHeight,attackCapable:!!attacks[id],role:attacks[id]?'hostile':'passive',actions};
});
