const catalog=new Map(require('./inventory-catalog.json').map(d=>[d.key,d]));
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function sanitizeInventory(saved){
 if(![1,2].includes(saved?.version))return null;
 function stack(s,nested=false){const d=catalog.get(s?.key);if(!d||!Number.isSafeInteger(s.qty)||s.qty<1||s.qty>d.maxStack||(nested&&d.slot==='backpack'))return null;return {key:d.key,qty:s.qty,loaded:clamp(Number.isFinite(s.loaded)?Math.floor(s.loaded):0,0,d.ammo?d.capacity:0),...(d.slot==='backpack'?{contents:(Array.isArray(s.contents)?s.contents:[]).slice(0,d.capacity).map(s=>stack(s,true)).filter(Boolean)}:{})};}
 const equipment={};for(const [slot,s] of Object.entries(saved.equipment??{})){const value=stack(s);if(value&&catalog.get(value.key).slot===slot)equipment[slot]=value;}
 const ground=(Array.isArray(saved.ground)?saved.ground:[]).slice(0,2048).flatMap(s=>{const value=stack(s);return value&&Number.isFinite(s.x)&&Number.isFinite(s.y)?[{...value,x:clamp(s.x,32,8160),y:clamp(s.y,32,8160)}]:[];});
 const vitals={};for(const key of ['health','hunger','thirst'])vitals[key]=Number.isFinite(saved.vitals?.[key])?clamp(saved.vitals[key],0,100):60;
 const result={version:saved.version,equipment,ground,vitals,learned:[...new Set((Array.isArray(saved.learned)?saved.learned:[]).filter(key=>catalog.get(key)?.use==='read'))]};
 if(saved.version===1)result.bag=(Array.isArray(saved.bag)?saved.bag:[]).slice(0,1000).map(s=>stack(s)).filter(Boolean);
 else {result.pockets=(Array.isArray(saved.pockets)?saved.pockets:[]).slice(0,12).map(s=>stack(s)).filter(Boolean);result.creative=saved.creative===true;}
 return result;
}
module.exports={sanitizeInventory};
