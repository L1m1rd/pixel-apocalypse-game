const randomFor=seed=>{let n=seed>>>0;return()=>((n=(Math.imul(n,1664525)+1013904223)>>>0)/4294967296);};
const supplies=['item/food-canned-food','item/food-water-bottle','item/medicine-water-bandage','item/materials-cloth','item/materials-duct-tape','item/materials-scrap','item/resource-harvest-boards'];
const tools=['item/weapons-axe','item/tools-shovel','item/gloves-tools-fishing-rod','item/electricity-flashlight','item/transport-toolbox','item/electricity-batteries','item/medicine-water-kit-small'];
const gear=['item/boots-greaves-boots-1','item/pants-1-v1','item/backpacks-helmet-helmet','item/masks-vests-vest-1','item/backpacks-helmet-pack-2','item/jackets-1-v1'];
const guns=['weapon/pm','weapon/izh-27','weapon/ak74'],ammo=['ammo/pistol@closed','ammo/shotgun@closed','ammo/rifle@closed'];
export function rollHouseLoot(seed,index,slot,sector){
 const r=randomFor((seed^Math.imul(index+1,0x9e3779b1)^Math.imul(slot+1,0x85ebca6b))>>>0),pick=list=>list[Math.floor(r()*list.length)],rows=[],n=2+Math.floor(r()*4);
 for(let i=0;i<n;i++){const t=r();let key=t<.44?pick(supplies):t<.62?pick(tools):t<.79?pick(gear):t<.9?pick(ammo):t<.96?pick(guns):pick(['item/seeds-carrot','item/seeds-potato']);if(sector==='greenhouse'&&i===0)key=pick(['item/seeds-carrot','item/seeds-potato','item/tools-shovel']);if(rows.some(s=>s.key===key))continue;
 const durable=gear.includes(key)||guns.includes(key)||tools.includes(key)&&!['item/electricity-batteries','item/medicine-water-kit-small'].includes(key),qty=ammo.includes(key)?3+Math.floor(r()*14):durable?1:1+Math.floor(r()*2);rows.push({key,qty,loaded:0,...(durable?{condition:30+Math.floor(r()*71),charge:20+Math.floor(r()*81),...(key.includes('pack-')?{contents:[]}:{} )}:{})});
 }return rows;
}
export function legacyHouseLoot(index,slot,sector){
 const loot=[...supplies.slice(0,5),'ammo/pistol@closed',...supplies.slice(5)],j=slot===0?0:2,rows=Array.from({length:1+index%3},(_,n)=>({key:loot[(index*3+j+n)%loot.length],qty:/ammo/.test(loot[(index*3+j+n)%loot.length])?6:1,loaded:0}));
 if(slot===0&&index%2===0)rows.push({key:gear[(index/2|0)%gear.length],qty:1,condition:45+(index*17)%55,charge:85,contents:[]});
 if(slot===1){if(index%3===1||sector==='greenhouse')rows.push({key:sector==='greenhouse'?'item/tools-shovel':tools[index%tools.length],qty:1,condition:55+(index*13)%45,charge:65});if(index%5===2||sector==='greenhouse')rows.push({key:index%2?'item/seeds-potato':'item/seeds-carrot',qty:2});if(index%11===4){const k=(index/11|0)%3;rows.push({key:guns[k],qty:1,condition:50+(index*7)%50},{key:ammo[k],qty:8});}}
 return rows;
}
const normalized=rows=>JSON.stringify(rows.map(s=>({key:s.key,qty:s.qty,condition:s.condition??100,charge:s.charge??100,loaded:s.loaded??0,contents:s.contents??[]})));
export function migrateHouseLoot(world){if(!world.villageMode||world.lootVersion===1)return false;const houses=world.objects.filter(o=>o.kind==='house');for(const [index,h]of houses.entries()){const chests=world.objects.filter(o=>o.houseId===h.id&&o.kind==='chest');for(const [slot,c]of chests.entries())if(!c.lootTouched&&normalized(c.stock)===normalized(legacyHouseLoot(index,slot,h.sectorId)))c.stock=rollHouseLoot(world.seed,index,slot,h.sectorId);}world.lootVersion=1;return true;}
