const IDS=new Set(['01-gleb','02-roman','03-miron','04-egor','05-timur','06-makar']);
function validateSave(s){
 if(!s||s.version!==1||!IDS.has(s.characterId)||typeof s.worldName!=='string'||!s.worldName.trim()||s.worldName.length>48||!Number.isFinite(s.x)||!Number.isFinite(s.y)||s.x<32||s.x>8160||s.y<32||s.y>8160)return null;
 if(!['south','west','east','north'].includes(s.direction)||typeof s.crouched!=='boolean')return null;
 const result={version:1,worldName:s.worldName.trim().replace(/[\x00-\x1f]/g,''),characterId:s.characterId,x:s.x,y:s.y,direction:s.direction,crouched:s.crouched};
 if(s.district?.mapId==='northern-dachas-v1')result.district={mapId:'northern-dachas-v1',openedGates:[...new Set((Array.isArray(s.district.openedGates)?s.district.openedGates:[]).filter(id=>typeof id==='string'&&/^gate-(?:[0-9]|[1-7][0-9])$/.test(id)))].slice(0,80)};

 if(s.district?.mapId==='item-lab-v1')result.district={mapId:'item-lab-v1'};
 if(s.inventory?.version===1){
  const catalog=new Map(require('./inventory-catalog.json').map(d=>[d.key,d]));
  const stack=s=>{const d=catalog.get(s?.key);if(!d||!Number.isSafeInteger(s.qty)||s.qty<1||s.qty>d.maxStack)return null;return {key:d.key,qty:s.qty,loaded:Math.max(0,Math.min(d.ammo?d.capacity:0,Number.isFinite(s.loaded)?Math.floor(s.loaded):0))};};
  const bag=(Array.isArray(s.inventory.bag)?s.inventory.bag:[]).slice(0,1000).map(stack).filter(Boolean),equipment={};
  for(const [slot,saved] of Object.entries(s.inventory.equipment??{})){const value=stack(saved);if(value&&catalog.get(value.key).slot===slot)equipment[slot]=value;}
  const ground=(Array.isArray(s.inventory.ground)?s.inventory.ground:[]).slice(0,500).flatMap(saved=>{const value=stack(saved);return value&&Number.isFinite(saved.x)&&Number.isFinite(saved.y)?[{...value,x:Math.max(32,Math.min(8160,saved.x)),y:Math.max(32,Math.min(8160,saved.y))}]:[];});
  const vitals={};for(const key of ['health','hunger','thirst'])vitals[key]=Number.isFinite(s.inventory.vitals?.[key])?Math.max(0,Math.min(100,s.inventory.vitals[key])):60;
  result.inventory={version:1,bag,equipment,ground,vitals,learned:[...new Set((Array.isArray(s.inventory.learned)?s.inventory.learned:[]).filter(key=>catalog.get(key)?.use==='read'))]};
 }
 return result;
}
module.exports={validateSave};
