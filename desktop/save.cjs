const IDS=new Set(['01-gleb','02-roman','03-miron','04-egor','05-timur','06-makar']);
function validateSave(s){
 if(!s||s.version!==1||!IDS.has(s.characterId)||typeof s.worldName!=='string'||!s.worldName.trim()||s.worldName.length>48||!Number.isFinite(s.x)||!Number.isFinite(s.y)||s.x<32||s.x>8160||s.y<32||s.y>8160)return null;
 if(!['south','west','east','north'].includes(s.direction)||typeof s.crouched!=='boolean')return null;
 const result={version:1,worldName:s.worldName.trim().replace(/[\x00-\x1f]/g,''),characterId:s.characterId,x:s.x,y:s.y,direction:s.direction,crouched:s.crouched};
 if(s.district?.mapId==='northern-dachas-v1')result.district={mapId:'northern-dachas-v1',openedGates:[...new Set((Array.isArray(s.district.openedGates)?s.district.openedGates:[]).filter(id=>typeof id==='string'&&/^gate-(?:[0-9]|[1-7][0-9])$/.test(id)))].slice(0,80)};
 return result;
}
module.exports={validateSave};
