export const SLOT_NAMES={weapon:'Оружие',hand:'Инструмент',head:'Голова',mask:'Маска',shirt:'Футболка',jacket:'Куртка',vest:'Бронежилет',pants:'Штаны',greaves:'Поножи',boots:'Обувь',gloves:'Перчатки',backpack:'Рюкзак'};
export const CATEGORY_NAMES={weapons:'Оружие',ammo:'Патроны',equipment:'Экипировка',tools:'Инструменты',food:'Еда и вода',medicine:'Медицина',manuals:'Методички','animal-resources':'Животные ресурсы',harvest:'Урожай',seeds:'Семена',herbs:'Травы',wires:'Провода','resource-harvest':'Ресурсы','retained-materials':'Материалы','retained-electricity':'Электрика','retained-distraction':'Отвлечение','retained-transport':'Автодетали','retained-information':'Информация'};
export function createInventory(catalog,saved){
 const defs=new Map(catalog.map(i=>[i.key,i]));
 const state={version:1,nextId:1,bag:[],equipment:{},ground:[],vitals:{health:65,hunger:60,thirst:60},learned:[]};
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 if(saved?.version===1){
  let total=0;const loadStack=s=>{const def=defs.get(s?.key);if(!def||!Number.isSafeInteger(s.qty)||s.qty<1||total++>1000)return null;return {uid:state.nextId++,key:def.key,qty:clamp(s.qty,1,def.maxStack),loaded:clamp(Number.isFinite(s.loaded)?Math.floor(s.loaded):0,0,def.ammo?def.capacity:0)};};
  state.bag=(Array.isArray(saved.bag)?saved.bag:[]).slice(0,1000).map(loadStack).filter(Boolean);
  for(const slot of Object.keys(SLOT_NAMES)){const stack=loadStack(saved.equipment?.[slot]);if(stack&&defs.get(stack.key).slot===slot)state.equipment[slot]=stack;}
  state.ground=(Array.isArray(saved.ground)?saved.ground:[]).slice(0,500).flatMap(s=>{const stack=loadStack(s);return stack&&Number.isFinite(s.x)&&Number.isFinite(s.y)?[{...stack,x:clamp(s.x,32,8160),y:clamp(s.y,32,8160)}]:[];});
  for(const key of Object.keys(state.vitals))if(Number.isFinite(saved.vitals?.[key]))state.vitals[key]=clamp(saved.vitals[key],0,100);
  state.learned=[...new Set((Array.isArray(saved.learned)?saved.learned:[]).filter(key=>defs.get(key)?.use==='read'))];
 }
 const slots=()=>defs.get(state.equipment.backpack?.key)?.capacity??24;
 const make=(key,qty)=>({uid:state.nextId++,key,qty,loaded:0});
 const bagFit=(key,qty)=>{const def=defs.get(key);if(!def||qty<1)return false;return state.bag.reduce((n,s)=>n+(s.key===key?def.maxStack-s.qty:0),0)+Math.max(0,slots()-state.bag.length)*def.maxStack>=qty;};
 function add(key,qty=1){const def=defs.get(key);if(!def||!Number.isSafeInteger(qty)||qty<1||!bagFit(key,qty))return false;for(const s of state.bag){if(s.key===key){const n=Math.min(qty,def.maxStack-s.qty);s.qty+=n;qty-=n;}}while(qty){const n=Math.min(qty,def.maxStack);state.bag.push(make(key,n));qty-=n;}return true;}
 const find=uid=>state.bag.find(s=>s.uid===uid);
 function remove(s,n=1){s.qty-=n;if(s.qty===0)state.bag.splice(state.bag.indexOf(s),1);}
 function equip(uid){const s=find(uid),def=defs.get(s?.key);if(!def?.slot)return false;const old=state.equipment[def.slot];if(def.slot==='backpack'&&state.bag.length-(old?0:1)>(def.capacity??24))return false;state.bag.splice(state.bag.indexOf(s),1);if(old)state.bag.push(old);state.equipment[def.slot]=s;return true;}
 function unequip(slot){const s=state.equipment[slot];if(!s)return false;const capacity=slot==='backpack'?24:slots();if(state.bag.length>=capacity)return false;delete state.equipment[slot];state.bag.push(s);return true;}
 function use(uid){const s=find(uid),def=defs.get(s?.key);if(!def?.use)return false;if(def.use==='read'){if(state.learned.includes(def.key))return false;state.learned.push(def.key);remove(s);return true;}if(!Object.entries(def.effect??{}).some(([k,v])=>v>0&&state.vitals[k]<100))return false;for(const [k,v] of Object.entries(def.effect))state.vitals[k]=clamp(state.vitals[k]+v,0,100);remove(s);return true;}
 function split(uid){const s=find(uid);if(!s||s.qty<2||state.bag.length>=slots())return false;const n=Math.floor(s.qty/2);s.qty-=n;state.bag.push(make(s.key,n));return true;}
 function merge(){for(let i=0;i<state.bag.length;i++)for(let j=i+1;j<state.bag.length;j++){const a=state.bag[i],b=state.bag[j];if(a.key!==b.key||defs.get(a.key).maxStack===1)continue;const n=Math.min(b.qty,defs.get(a.key).maxStack-a.qty);a.qty+=n;b.qty-=n;if(!b.qty){state.bag.splice(j,1);j--;}}}
 function drop(uid,position){const s=find(uid);if(!s||state.ground.length>=500)return false;state.bag.splice(state.bag.indexOf(s),1);state.ground.push({...s,x:position.x+14,y:position.y+14});return true;}
 function pickup(uid){const s=state.ground.find(s=>s.uid===uid);if(!s||!bagFit(s.key,s.qty))return false;if(defs.get(s.key).maxStack===1){state.bag.push({uid:s.uid,key:s.key,qty:s.qty,loaded:s.loaded});}else add(s.key,s.qty);state.ground.splice(state.ground.indexOf(s),1);return true;}
 const nearby=p=>state.ground.filter(s=>Math.hypot(s.x-p.x,s.y-p.y)<=95);
 function reload(){const s=state.equipment.weapon,def=defs.get(s?.key);if(!def?.ammo||s.loaded>=def.capacity)return false;let need=def.capacity-s.loaded,loaded=0;for(const a of [...state.bag]){if(defs.get(a.key).entityId!==def.ammo)continue;const n=Math.min(need,a.qty);remove(a,n);need-=n;loaded+=n;if(!need)break;}s.loaded+=loaded;return loaded>0;}
 function fire(){const s=state.equipment.weapon;if(!s||s.loaded<=0)return false;s.loaded--;return true;}
 const weight=()=>[...state.bag,...Object.values(state.equipment)].reduce((n,s)=>n+defs.get(s.key).weight*s.qty,0);
 return {state,defs,slots,weight,add,equip,unequip,use,split,merge,drop,pickup,nearby,reload,fire,snapshot:()=>JSON.parse(JSON.stringify(state))};
}
