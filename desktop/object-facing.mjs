export function quarterTurn(v){return ((Number.isFinite(v)?Math.round(v*2)/2:0)%4+4)%4;}
export function rotateLocal(x,y,turn=0){switch(quarterTurn(turn)){case 0:return {x,y};case 1:return {x:y,y:-x};case 2:return {x:-x,y:-y};case 3:return {x:-y,y:x};default:{const angle=-quarterTurn(turn)*Math.PI/2,c=Math.cos(angle),s=Math.sin(angle);return {x:x*c-y*s,y:x*s+y*c};}}}
export function housePoint(h,x,y){const q=rotateLocal(x,y,h.orientation);return {x:h.x+q.x,y:h.y+q.y};}
export function houseLocal(p,h){return rotateLocal(p.x-h.x,p.y-h.y,4-quarterTurn(h.orientation));}
export function doorNormal(h){return rotateLocal(0,1,h.orientation);}
export function rotateSolid(s,turn){const angle=quarterTurn(turn)*Math.PI/2,c=Math.abs(Math.cos(angle)),sn=Math.abs(Math.sin(angle));return {w:s.w*c+s.h*sn,h:s.w*sn+s.h*c};}
const houseStyles=['cottage-rich-grey','cottage-rich-blue','cottage-plaster','cottage-collapsed','house-abandoned','house-plaster'];
const vehicleStyles=['truck-canvas','van-blue','pickup-red','car-sedan','truck-flatbed','car_abandoned'];
export function directionalKey(o){const turn=String(quarterTurn(o.orientation)).replace('.','_');if(o.kind==='house')return 'house-'+Math.max(0,o.variantIndex??houseStyles.indexOf(o.asset))+'-'+turn;if(o.kind==='vehicle')return 'vehicle-'+Math.max(0,o.variantIndex??vehicleStyles.indexOf(o.asset))+'-'+turn;if(o.houseId&&['table','bed','wardrobe','shelves','stove'].includes(o.asset))return o.asset+'-0-'+turn;return null;}
