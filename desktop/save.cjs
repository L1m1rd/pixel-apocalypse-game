const IDS=new Set(['01-gleb','02-roman','03-miron','04-egor','05-timur','06-makar']);
function validateSave(s){
 if(!s||s.version!==1||!IDS.has(s.characterId)||typeof s.worldName!=='string'||!s.worldName.trim()||s.worldName.length>48||!Number.isFinite(s.x)||!Number.isFinite(s.y)||s.x<32||s.x>8160||s.y<32||s.y>8160)return null;
 if(!['south','west','east','north'].includes(s.direction)||typeof s.crouched!=='boolean')return null;
 return {version:1,worldName:s.worldName.trim().replace(/[\x00-\x1f]/g,''),characterId:s.characterId,x:s.x,y:s.y,direction:s.direction,crouched:s.crouched};
}
module.exports={validateSave};
