// Floor plans use metres in the same local frame as each house's doorway.
export const HOUSE_TYPES=[
 {name:'Однокомнатная дача',w:76,h:62,walls:[],floor:'#8b7859',rug:'#77624e'},
 {name:'Дача с кухней',w:88,h:72,walls:[[-81,-4,-27,-4]],floor:'#927b58',rug:'#77584c'},
 {name:'Семейный дом',w:100,h:76,walls:[[-93,-8,-27,-8],[27,-8,93,-8]],floor:'#82705a',rug:'#6e4d4b'},
 {name:'Дом садовника',w:82,h:66,walls:[[22,-59,22,-10]],floor:'#8c8067',rug:'#68705b'},
 {name:'Дом с прихожей',w:98,h:82,walls:[[-26,-75,-26,-6],[26,-75,26,-6]],floor:'#83785e',rug:'#745b4c'},
 {name:'Большая дача',w:108,h:78,walls:[[-101,-10,-27,-10],[27,-10,101,-10]],floor:'#988369',rug:'#73564d'}
];
export function housePlan(h){return HOUSE_TYPES[(h.layout??0)%HOUSE_TYPES.length];}
export function houseFurniture(type){const p=HOUSE_TYPES[type%6],w=p.w,h=p.h;return [
 {asset:'wardrobe',dx:-w+22,dy:-h+23,w:38,h:58,solid:{w:23,h:19},name:'Шкаф с вещами'},
 {asset:'bed',dx:w-27,dy:-h+27,w:57,h:43,solid:{w:29,h:37},name:'Кровать',interaction:'rest'},
 {asset:type%2?'shelves':'table',dx:w-24,dy:h-30,w:type%2?36:43,h:type%2?53:35,solid:{w:23,h:22},name:type%2?'Кухонная полка':'Кухонный стол'},
 {asset:'stove',dx:-w+23,dy:h-31,w:32,h:46,solid:{w:23,h:23},name:'Печь',interaction:'stove'}
];}
