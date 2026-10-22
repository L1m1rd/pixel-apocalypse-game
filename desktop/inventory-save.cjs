const storageCapacity=d=>d?.slot==='backpack'?(d.capacity??0):({pants:2,shirt:1,jacket:4,vest:2}[d?.slot]??0);
const catalog=new Map(require('./inventory-catalog.json').map(d=>[d.key,d]));
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function sanitizeInventory(saved){
 if(![1,2].includes(saved?.version))return null;
 function stack(s,nested=false,depth=0){const d=catalog.get(s?.key);if(depth>2||!d||!Number.isSafeInteger(s.qty)||s.qty<1||s.qty>d.maxStack||(nested&&d.slot==='backpack'))return null;return {key:d.key,qty:s.qty,mods:(Array.isArray(s.mods)?s.mods:[]).filter(m=>['optic','suppressor','night'].includes(m)).slice(0,3),...(d.slot?{condition:clamp(Number.isFinite(s.condition)?s.condition:100,0,100),charge:clamp(Number.isFinite(s.charge)?s.charge:100,0,100)}:{}),loaded:clamp(Number.isFinite(s.loaded)?Math.floor(s.loaded):0,0,d.ammo?d.capacity:0),...(storageCapacity(d)?{contents:(Array.isArray(s.contents)?s.contents:[]).slice(0,storageCapacity(d)).filter(s=>{const item=catalog.get(s?.key);return item&&(d.slot==='backpack'?item.slot!=='backpack':!item.slot&&item.weight<=2&&!['weapons','tools'].includes(item.category));}).map(s=>stack(s,true,depth+1)).filter(Boolean)}:{})};}
 const equipment={};for(const [slot,s] of Object.entries(saved.equipment??{})){const value=stack(s);if(value&&(catalog.get(value.key).slot===slot||slot==='secondary'&&catalog.get(value.key).slot==='weapon'||slot==='quick'&&!!catalog.get(value.key).use))equipment[slot]=value;}
 const ground=(Array.isArray(saved.ground)?saved.ground:[]).slice(0,2048).flatMap(s=>{const value=stack(s);return value&&Number.isFinite(s.x)&&Number.isFinite(s.y)?[{...value,x:clamp(s.x,32,8160),y:clamp(s.y,32,8160)}]:[];});
 const vitals={};for(const key of ['health','hunger','thirst','temperature','wetness','bleeding','disease','stamina'])vitals[key]=Number.isFinite(saved.vitals?.[key])?clamp(saved.vitals[key],0,100):({health:65,hunger:60,thirst:60,temperature:85,wetness:0,bleeding:0,disease:0,stamina:100})[key];
 const result={version:saved.version,...(saved.pocketSlots===12?{pocketSlots:12}:{}),equipment,ground,vitals,learned:[...new Set((Array.isArray(saved.learned)?saved.learned:[]).filter(key=>catalog.get(key)?.use==='read'))]};
 if(saved.version===1)result.bag=(Array.isArray(saved.bag)?saved.bag:[]).slice(0,1000).map(s=>stack(s)).filter(Boolean);
 else {result.pockets=(Array.isArray(saved.pockets)?saved.pockets:[]).slice(0,12).map(s=>stack(s)).filter(Boolean);result.creative=saved.creative===true;}
 return result;
}
module.exports={sanitizeInventory};
