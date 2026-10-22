import {sightLine} from './perception.mjs';
import {houseLocal} from './object-facing.mjs';
export const clamp=(n,a=0,b=100)=>Math.max(a,Math.min(b,n));
import {villageWalls} from './village-world.mjs';
export const KEYS={wood:'item/resource-harvest-boards',cloth:'item/materials-cloth',tape:'item/materials-duct-tape',nails:'item/materials-nails',wire:'item/materials-wire',scrap:'item/materials-scrap',stone:'item/resource-harvest-stone',bandage:'item/medicine-water-bandage',kit:'item/medicine-water-kit-small',water:'item/food-water-bottle',canteen:'item/medicine-water-canteen',food:'item/food-canned-food',berries:'item/resource-harvest-berries',fuel:'item/transport-fuel-can',toolbox:'item/transport-toolbox',battery:'item/electricity-batteries',flashlight:'item/electricity-flashlight',fishing:'item/gloves-tools-fishing-rod',shovel:'item/tools-shovel',axe:'item/weapons-axe',knife:'item/weapons-knife'};
export const PERKS=[{id:'runner',name:'Бегун',description:'На 20% меньше расход выносливости.'},{id:'marksman',name:'Стрелок',description:'Меньше разброс при стрельбе.'},{id:'warmth',name:'Закалка',description:'На 25% медленнее охлаждение.'},{id:'forager',name:'Собиратель',description:'Больше ягод и урожая.'},{id:'medic',name:'Санитар',description:'На 25% эффективнее лечение.'},{id:'repair',name:'Мастер',description:'На 20% эффективнее ремонт.'},{id:'quiet',name:'Тихий шаг',description:'Враги замечают с меньшего расстояния.'},{id:'survivor',name:'Запасливый',description:'На 20% медленнее голод и жажда.'}];
export function profile(d){const key=d?.key??'',slot=d?.slot,gun=!!d?.ammo,shot=d?.ammo==='ammo/shotgun',pistol=d?.ammo==='ammo/pistol',durable=!!slot;return {durable,gun,melee:slot==='weapon'&&!gun||slot==='hand'&&!/flashlight/.test(key),damage:gun?(shot?60:pistol?24:38):/axe|crowbar|saw/.test(key)?24:/knife/.test(key)?18:12,range:gun?(shot?330:pistol?440:720):45,spread:shot?.13:pistol?.075:.04,protection:slot==='vest'?.5:slot==='head'?.2:slot==='greaves'?.12:slot==='gloves'?.02:slot==='boots'?.02:['jacket','pants'].includes(slot)?.06:0,insulation:slot==='jacket'?24:slot==='pants'?15:slot==='shirt'?7:slot==='head'?9:slot==='boots'?6:slot==='gloves'?4:0,rainproof:/jackets-3|jackets-2|masks/.test(key)?.7:slot==='jacket'?.35:0,repairKind:gun?'weapon':slot?'cloth':null};}
export const conditionName=value=>value<=0?'Разрушено':value<25?'Критическое':value<50?'Повреждено':value<80?'Поношено':'Хорошее';
export const repairValue=(source,target)=>!profile(target).durable?0:source===KEYS.tape?.15:source===KEYS.cloth&&!profile(target).gun?.5:source===KEYS.toolbox&&profile(target).gun?.25:0;
export const RECIPES=[
 {id:'bandage',name:'Самодельный бинт',cost:{[KEYS.cloth]:2},output:KEYS.bandage},
 {id:'campfire',name:'Кострище',cost:{[KEYS.wood]:3,[KEYS.stone]:2},place:'campfire',asset:'campfire',canonicalId:'world/campfire'},
 {id:'shelter',name:'Полевое укрытие с хранилищем',cost:{[KEYS.wood]:5,[KEYS.cloth]:4,[KEYS.wire]:2},place:'shelter',asset:'greenhouse',canonicalId:'world/greenhouse'},
 {id:'barricade',name:'Баррикада',cost:{[KEYS.wood]:3,[KEYS.nails]:2},place:'barricade',asset:'barricade',canonicalId:'world/barricade'},
 {id:'barbed',name:'Колючая проволока',cost:{'item/wires-barbed-pickup':1},place:'trap',asset:'barbed',canonicalId:'item/wires-barbed-deployed'},
 {id:'rod',name:'Самодельная удочка',cost:{[KEYS.wood]:2,[KEYS.wire]:1},output:KEYS.fishing},
 {id:'bag',name:'Полевой рюкзак',cost:{[KEYS.cloth]:6,[KEYS.wire]:2},output:'item/backpacks-helmet-pack-1'},
 {id:'torch',name:'Фонарь',cost:{[KEYS.scrap]:2,[KEYS.wire]:1,[KEYS.battery]:1},output:KEYS.flashlight}
];
export const interactionDistance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export function segmentHitsRect(a,b,r){let lo=0,hi=1;const dx=b.x-a.x,dy=b.y-a.y;for(const [p,q]of [[-dx,a.x-r.x],[dx,r.x+r.w-a.x],[-dy,a.y-r.y],[dy,r.y+r.h-a.y]]){if(Math.abs(p)<1e-8){if(q<0)return false;}else{const t=q/p;if(p<0)lo=Math.max(lo,t);else hi=Math.min(hi,t);if(lo>hi)return false;}}return true;}
export function visibleBetween(a,b,objects){return sightLine(a,b,objects);}
