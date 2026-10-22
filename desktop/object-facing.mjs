export function quarterTurn(v){return ((Number.isInteger(v)?v:0)%4+4)%4;}
export function rotateLocal(x,y,turn=0){switch(quarterTurn(turn)){case 1:return {x:y,y:-x};case 2:return {x:-x,y:-y};case 3:return {x:-y,y:x};default:return {x,y};}}
export function housePoint(h,x,y){const q=rotateLocal(x,y,h.orientation);return {x:h.x+q.x,y:h.y+q.y};}
export function houseLocal(p,h){return rotateLocal(p.x-h.x,p.y-h.y,4-quarterTurn(h.orientation));}
export function doorNormal(h){return rotateLocal(0,1,h.orientation);}
export function rotateSolid(s,turn){return quarterTurn(turn)%2?{w:s.h,h:s.w}:{...s};}
const houseStyles=['cottage-rich-grey','cottage-rich-blue','cottage-plaster','cottage-collapsed','house-abandoned','house-plaster'];
const vehicleStyles=['truck-canvas','van-blue','pickup-red','car-sedan','truck-flatbed','car_abandoned'];
export function directionalKey(o){const turn=quarterTurn(o.orientation);if(o.kind==='house')return 'house-'+Math.max(0,o.variantIndex??houseStyles.indexOf(o.asset))+'-'+turn;if(o.kind==='vehicle')return 'vehicle-'+Math.max(0,o.variantIndex??vehicleStyles.indexOf(o.asset))+'-'+turn;if(o.houseId&&['table','bed','wardrobe','shelves','stove'].includes(o.asset))return o.asset+'-0-'+turn;return null;}
