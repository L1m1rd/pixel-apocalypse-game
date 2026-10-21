import {profile,repairValue,conditionName,KEYS,clamp as limit} from './survival-rules.mjs';
export const SLOT_NAMES={head:'Шлем',vest:'Броня',pants:'Штаны',weapon:'Оружие',backpack:'Рюкзак',mask:'Противогаз',gloves:'Перчатки',boots:'Ботинки',shirt:'Футболка',jacket:'Куртка',greaves:'Поножи',hand:'Инструмент'};
export const CATEGORY_NAMES={weapons:'Оружие',ammo:'Патроны',equipment:'Экипировка',tools:'Инструменты',food:'Еда и вода',medicine:'Медицина',manuals:'Методички','animal-resources':'Животные ресурсы',harvest:'Урожай',seeds:'Семена',herbs:'Травы',wires:'Провода','resource-harvest':'Ресурсы','retained-materials':'Материалы','retained-electricity':'Электрика','retained-distraction':'Отвлечение','retained-transport':'Автодетали','retained-information':'Информация'};
export const POCKET_SLOTS=12;
export function createInventory(catalog,saved,position={x:4096,y:4096}){
 const defs=new Map(catalog.map(i=>[i.key,i])),clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 const state={version:2,nextId:1,creative:false,pockets:[],equipment:{},ground:[],vitals:{health:65,hunger:60,thirst:60,temperature:85,wetness:0,bleeding:0,disease:0,stamina:100},learned:[]};
 let migratedToGround=0;
 const make=(key,qty)=>({uid:state.nextId++,key,qty,loaded:0,...(profile(defs.get(key)).durable?{condition:100,charge:100}:{}),...(defs.get(key).slot==='backpack'?{contents:[]}:{} )});
 function readStack(s,nested=false){const d=defs.get(s?.key);if(!d||!Number.isSafeInteger(s.qty)||s.qty<1||s.qty>d.maxStack||(nested&&d.slot==='backpack'))return null;const value=make(d.key,s.qty);value.loaded=clamp(Number.isFinite(s.loaded)?Math.floor(s.loaded):0,0,d.ammo?d.capacity:0);if(profile(d).durable){value.condition=Number.isFinite(s.condition)?clamp(s.condition,0,100):100;value.charge=Number.isFinite(s.charge)?clamp(s.charge,0,100):100;}if(d.slot==='backpack')value.contents=(Array.isArray(s.contents)?s.contents:[]).slice(0,d.capacity).map(s=>readStack(s,true)).filter(Boolean);return value;}
 if([1,2].includes(saved?.version)){
  state.creative=saved.version===2&&saved.creative===true;
  for(const slot of Object.keys(SLOT_NAMES)){const stack=readStack(saved.equipment?.[slot]);if(stack&&defs.get(stack.key).slot===slot)state.equipment[slot]=stack;}
  state.ground=(Array.isArray(saved.ground)?saved.ground:[]).slice(0,2048).flatMap(s=>{const stack=readStack(s);return stack&&Number.isFinite(s.x)&&Number.isFinite(s.y)?[{...stack,x:clamp(s.x,32,8160),y:clamp(s.y,32,8160)}]:[];});
  if(saved.version===2)state.pockets=(Array.isArray(saved.pockets)?saved.pockets:[]).slice(0,POCKET_SLOTS).map(s=>readStack(s)).filter(Boolean);
  else{
   const legacy=(Array.isArray(saved.bag)?saved.bag:[]).slice(0,1000).map(s=>readStack(s)).filter(Boolean);
   for(const s of legacy){const pack=state.equipment.backpack;if(pack&&defs.get(s.key).slot!=='backpack'&&pack.contents.length<defs.get(pack.key).capacity)pack.contents.push(s);else if(state.pockets.length<POCKET_SLOTS)state.pockets.push(s);else{state.ground.push({...s,x:position.x+14,y:position.y+14});migratedToGround++;}}
  }
  for(const key of Object.keys(state.vitals))if(Number.isFinite(saved.vitals?.[key]))state.vitals[key]=clamp(saved.vitals[key],0,100);
  state.learned=[...new Set((Array.isArray(saved.learned)?saved.learned:[]).filter(key=>defs.get(key)?.use==='read'))];
 }
 const list=name=>name==='pockets'?state.pockets:name==='backpack'?(state.equipment.backpack?.contents??null):null;
 const capacity=name=>name==='pockets'?POCKET_SLOTS:name==='backpack'?(defs.get(state.equipment.backpack?.key)?.capacity??0):0;
 function fit(name,key,qty){const rows=list(name),d=defs.get(key);if(!rows||!d||qty<1||(name==='backpack'&&d.slot==='backpack'))return false;return rows.reduce((n,s)=>n+(s.key===key?d.maxStack-s.qty:0),0)+Math.max(0,capacity(name)-rows.length)*d.maxStack>=qty;}
 function locate(uid){for(const container of ['pockets','backpack']){const rows=list(container),stack=rows?.find(s=>s.uid===uid);if(stack)return {rows,stack,container};}return null;}
 function insert(rows,s){const d=defs.get(s.key);if(d.maxStack===1){for(let i=0;i<s.qty;i++)rows.push(i===0?{...s,qty:1}:make(s.key,1));return;}let qty=s.qty;for(const a of rows){if(a.key===s.key){const n=Math.min(qty,d.maxStack-a.qty);a.qty+=n;qty-=n;}}while(qty){const n=Math.min(qty,d.maxStack);rows.push(make(s.key,n));qty-=n;}}
 function add(key,qty=1,target='pockets'){if(!Number.isSafeInteger(qty)||qty<1||!fit(target,key,qty))return false;insert(list(target),make(key,qty));return true;}
 function grant(key,qty=1,target='pockets'){return state.creative&&add(key,qty,target);}
 function transfer(uid,target){const loc=locate(uid);if(!loc||loc.container===target||!fit(target,loc.stack.key,loc.stack.qty))return false;loc.rows.splice(loc.rows.indexOf(loc.stack),1);insert(list(target),loc.stack);return true;}
 function equip(uid,requestedSlot){const loc=locate(uid),s=loc?.stack,d=defs.get(s?.key);if(!d?.slot||(requestedSlot&&requestedSlot!==d.slot))return false;const old=state.equipment[d.slot];
  // Backpack instances carry their own contents; a worn pack can only come from pockets.
  if(d.slot==='backpack'&&loc.container!=='pockets')return false;
  loc.rows.splice(loc.rows.indexOf(s),1);if(old)loc.rows.push(old);state.equipment[d.slot]=s;return true;
 }
 function unequip(slot,target='pockets'){const s=state.equipment[slot];if(!s||!fit(target,s.key,1))return false;delete state.equipment[slot];insert(list(target),s);return true;}
 function remove(loc,n=1){loc.stack.qty-=n;if(!loc.stack.qty)loc.rows.splice(loc.rows.indexOf(loc.stack),1);}
 function legacyUse(uid){const loc=locate(uid),d=defs.get(loc?.stack.key);if(!d?.use)return false;if(d.use==='read'){if(state.learned.includes(d.key))return false;state.learned.push(d.key);remove(loc);return true;}if(!Object.entries(d.effect??{}).some(([k,v])=>v>0&&state.vitals[k]<100))return false;for(const [k,v] of Object.entries(d.effect))state.vitals[k]=clamp(state.vitals[k]+v,0,100);remove(loc);return true;}
 function split(uid){const loc=locate(uid);if(!loc||loc.stack.qty<2||loc.rows.length>=capacity(loc.container))return false;const n=Math.floor(loc.stack.qty/2);loc.stack.qty-=n;loc.rows.push(make(loc.stack.key,n));return true;}
 function merge(container){for(const name of container?[container]:['pockets','backpack']){const rows=list(name);if(!rows)continue;for(let i=0;i<rows.length;i++)for(let j=i+1;j<rows.length;j++){const a=rows[i],b=rows[j];if(a.key!==b.key||defs.get(a.key).maxStack===1)continue;const n=Math.min(b.qty,defs.get(a.key).maxStack-a.qty);a.qty+=n;b.qty-=n;if(!b.qty){rows.splice(j,1);j--;}}}}
 function move(uid,target){const loc=locate(uid);if(loc)return transfer(uid,target);const slot=Object.keys(state.equipment).find(k=>state.equipment[k]?.uid===uid);return slot?unequip(slot,target):false;}
 function drop(uid,p){if(state.ground.length>=2048)return false;const loc=locate(uid),slot=Object.keys(state.equipment).find(k=>state.equipment[k]?.uid===uid),stack=loc?.stack??state.equipment[slot];if(!stack)return false;if(loc)loc.rows.splice(loc.rows.indexOf(stack),1);else delete state.equipment[slot];state.ground.push({...stack,x:clamp(p.x+14,32,8160),y:clamp(p.y+14,32,8160)});return true;}
 function pickup(uid,target='pockets'){const s=state.ground.find(s=>s.uid===uid);if(!s||!fit(target,s.key,s.qty))return false;const {x,y,...stack}=s;insert(list(target),stack);state.ground.splice(state.ground.indexOf(s),1);return true;}
 const nearby=p=>state.ground.filter(s=>Math.hypot(s.x-p.x,s.y-p.y)<=95);
 function reload(){const s=state.equipment.weapon,d=defs.get(s?.key);if(!d?.ammo||(s.condition??100)<=0||s.loaded>=d.capacity)return false;let need=d.capacity-s.loaded,loaded=0;for(const name of ['pockets','backpack'])for(const a of [...(list(name)??[])]){if(defs.get(a.key).entityId!==d.ammo||!need)continue;const n=Math.min(need,a.qty);remove({rows:list(name),stack:a},n);need-=n;loaded+=n;}s.loaded+=loaded;return loaded>0;}
 function fire(){const s=state.equipment.weapon;if(!s||s.loaded<=0||(s.condition??100)<=0)return false;s.loaded--;s.condition=Math.max(0,(s.condition??100)-.35);return true;}

 function find(uid){return locate(uid)?.stack??Object.values(state.equipment).find(s=>s.uid===uid);}
 function allStored(){return [...state.pockets,...(list('backpack')??[])];}
 function count(key){return allStored().filter(s=>s.key===key).reduce((n,s)=>n+s.qty,0);}
 function consume(key,n=1){if(!Number.isSafeInteger(n)||n<1||count(key)<n)return false;for(const name of ['pockets','backpack'])for(const s of [...(list(name)??[])])if(s.key===key&&n){const take=Math.min(n,s.qty);remove({rows:list(name),stack:s},take);n-=take;}return true;}
 function receive(raw,target='pockets'){const d=defs.get(raw?.key);if(!d||!fit(target,d.key,raw.qty))return false;const stack=readStack(raw);if(!stack)return false;insert(list(target),stack);return true;}
 function extract(uid){const loc=locate(uid);if(!loc)return null;loc.rows.splice(loc.rows.indexOf(loc.stack),1);return loc.stack;}
 function wear(uid,amount){const stack=find(uid);if(!stack||!profile(defs.get(stack.key)).durable)return false;stack.condition=clamp((stack.condition??100)-Math.max(0,amount),0,100);return true;}
 function repairTargets(uid){const source=find(uid);if(!source)return [];return [...allStored(),...Object.values(state.equipment)].filter(s=>s.uid!==uid&&s.condition>0&&s.condition<100&&repairValue(source.key,defs.get(s.key))>0);}
 function repair(uid,targetUid,bonus=1){const source=locate(uid),target=find(targetUid),d=defs.get(target?.key),amount=source&&target&&target.condition>0?repairValue(source.stack.key,d):0;if(!amount||target.condition>=100)return false;target.condition=clamp(target.condition+amount*100*bonus,0,100);remove(source);return true;}
 function canUse(uid,context={}){const stack=find(uid),d=defs.get(stack?.key);if(!stack||!locate(uid))return false;if(d.use==='read')return !state.learned.includes(d.key);if(d.use){if(d.use==='heal'&&(state.vitals.bleeding>0||state.vitals.disease>0))return true;return Object.entries(d.effect??{}).some(([k,v])=>v>0&&state.vitals[k]<100);}if(context.active&&stack.key.startsWith('item/distraction-'))return true;if(context.active&&stack.key.startsWith('item/information-'))return true;if(stack.key===KEYS.battery)return Object.values(state.equipment).some(s=>s.key===KEYS.flashlight&&s.charge<100);if(stack.key===KEYS.cloth&&state.vitals.bleeding>0)return true;if(stack.key==='item/herbs-dried-herbs')return state.vitals.disease>0;return false;}
 function use(uid,context={}){const loc=locate(uid),d=defs.get(loc?.stack.key);if(!canUse(uid,context))return false;
  if(d.key===KEYS.battery){const lamp=Object.values(state.equipment).find(s=>s.key===KEYS.flashlight);lamp.charge=100;remove(loc);return true;}
  if(d.key===KEYS.cloth){state.vitals.bleeding=0;remove(loc);return true;}
  if(d.key==='item/herbs-dried-herbs'){state.vitals.disease=Math.max(0,state.vitals.disease-50);remove(loc);return true;}
  if(d.use==='heal'){state.vitals.bleeding=Math.max(0,state.vitals.bleeding-100);if(d.key!==KEYS.bandage)state.vitals.disease=Math.max(0,state.vitals.disease-35);const effect=d.effect??{};for(const [k,v]of Object.entries(effect))state.vitals[k]=clamp(state.vitals[k]+v*(context.medic?1.25:1),0,100);remove(loc);return true;}
  const result=legacyUse(uid);if(result&&context.active&&d.use==='drink'){if(!add('item/distraction-empty-bottle'))state.ground.push({...make('item/distraction-empty-bottle',1),x:context.x??4096,y:context.y??4096});}return result;
 }
 function canReload(){const s=state.equipment.weapon,d=defs.get(s?.key);return !!d?.ammo&&(s.condition??100)>0&&s.loaded<d.capacity&&allStored().some(a=>defs.get(a.key).entityId===d.ammo&&a.qty>0);}
 function craft(cost,output=null){if(!Object.entries(cost).every(([k,n])=>count(k)>=n))return false;const before=JSON.parse(JSON.stringify(state));for(const [k,n]of Object.entries(cost))consume(k,n);if(output&&!add(output)&&!add(output,1,'backpack')){Object.assign(state,before);return false;}return true;}
 function absorbDamage(amount){let protection=0;for(const s of Object.values(state.equipment)){const d=defs.get(s.key),p=profile(d);if(p.protection){protection+=p.protection*(s.condition??100)/100;wear(s.uid,amount*.22);}}const actual=Math.max(0,amount*(1-Math.min(.8,protection)));state.vitals.health=clamp(state.vitals.health-actual,0,100);return actual;}
 function insulation(){return Object.values(state.equipment).reduce((n,s)=>n+profile(defs.get(s.key)).insulation*(s.condition??100)/100,0);}

 const stackWeight=s=>defs.get(s.key).weight*s.qty+(s.contents??[]).reduce((n,s)=>n+stackWeight(s),0);
 const weight=()=>[...state.pockets,...Object.values(state.equipment)].reduce((n,s)=>n+stackWeight(s),0);
 return {state,defs,list,capacity,canFit:fit,find,allStored,count,consume,receive,extract,wear,repairTargets,repair,canUse,canReload,craft,absorbDamage,insulation,conditionName,profile,weight,add,grant,setCreative:value=>{state.creative=value===true;},transfer,move,equip,unequip,use,split,merge,drop,pickup,nearby,reload,fire,migratedToGround,snapshot:()=>JSON.parse(JSON.stringify(state))};
}
