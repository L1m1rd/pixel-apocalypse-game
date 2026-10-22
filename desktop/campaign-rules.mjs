export const FACILITIES=[
 {id:'generator',name:'Энергоблок',asset:'boiler-rusty',x:17,y:25,power:0,description:'Питает постройки. Каждый уровень даёт ещё 12 единиц мощности.'},
 {id:'storage',name:'Общий склад',asset:'garage',x:41,y:23,power:0,description:'Хранит снаряжение и повышает пределы запасов лагеря.'},
 {id:'infirmary',name:'Медпункт',asset:'cottage-plaster',x:69,y:25,power:1,description:'Восстанавливает здоровье после вылазок.'},
 {id:'quarters',name:'Жилой блок',asset:'cottage-blue',x:86,y:45,power:1,description:'Отдых возвращает выносливость и боевой дух.'},
 {id:'farm',name:'Тепличное хозяйство',asset:'greenhouse',x:21,y:69,power:1,description:'Производит провизию между вылазками, в том числе когда игра закрыта.'},
 {id:'workshop',name:'Мастерская',asset:'shed-workshop',x:43,y:63,power:2,description:'Открывает рецепты снаряжения, расходников и усовершенствований.'},
 {id:'repair',name:'Ремонтный пост',asset:'workbench-tools',x:64,y:69,power:2,description:'Восстанавливает найденные вещи за общие материалы.'},
 {id:'radio',name:'Узел связи',asset:'utility_pole',x:72,y:47,power:1,description:'Привлекает новых выживших и расширяет ваш отряд.'},
 {id:'watch',name:'Наблюдательный пост',asset:'wood-shelter',x:45,y:44,power:1,description:'Открывает более далёкие и опасные районы.'},
 {id:'decon',name:'Пункт очистки',asset:'water-tank',x:14,y:45,power:2,description:'Снижает заражение выживших.'}
];
export const LOCATIONS=[
 {id:'grove',name:'Тихая роща',type:'forest',level:1,cost:2,threat:1,autoSeconds:75,description:'Лесные тропы, звери и брошенные стоянки.',loot:'Провизия · инструменты'},
 {id:'dachas',name:'Северные дачи',type:'village',level:1,cost:3,threat:2,autoSeconds:90,description:'Старые участки и запертые дома. Есть тайник.',loot:'Одежда · припасы'},
 {id:'shops',name:'Торговая окраина',type:'town',level:1,cost:4,threat:3,autoSeconds:105,description:'Магазины у трассы; на дороге встречаются бандиты.',loot:'Еда · боеприпасы'},
 {id:'industrial',name:'Ремонтный квартал',type:'industrial',level:2,cost:5,threat:4,autoSeconds:120,description:'Цеха, склады и техника. Хороший источник деталей.',loot:'Детали · топливо'},
 {id:'clinic',name:'Заброшенная амбулатория',type:'clinic',level:2,cost:5,threat:4,autoSeconds:120,description:'Медицинские запасы среди заражённых зданий.',loot:'Медицина · защитная одежда'},
 {id:'checkpoint',name:'Старый блокпост',type:'military',level:2,cost:6,threat:5,autoSeconds:135,description:'Вооружённая охрана и военные ящики.',loot:'Оружие · броня'},
 {id:'depot',name:'Промышленный узел',type:'industrial',level:3,cost:7,threat:6,autoSeconds:150,description:'Крупный район, токсичные утечки и ценные грузы.',loot:'Редкие детали · снаряжение'},
 {id:'relay',name:'Дальний ретранслятор',type:'military',level:3,cost:8,threat:7,autoSeconds:165,description:'Найдите код доступа и верните связь в лагерь.',loot:'Код связи · военные запасы'}
];
export const CAMP_RECIPES=[
 {id:'dressing',name:'Комплект бинтов ×3',level:1,time:6,cost:{materials:4},key:'item/medicine-water-bandage',qty:3},
 {id:'kit',name:'Полевая аптечка',level:1,time:9,cost:{materials:8,food:2},key:'item/medicine-water-kit-small',qty:1},
 {id:'ammo',name:'Пистолетные патроны ×20',level:1,time:9,cost:{materials:10,parts:1},key:'ammo/pistol@closed',qty:20},
 {id:'rifle-ammo',name:'Винтовочные патроны ×30',level:2,time:12,cost:{materials:16,parts:2},key:'ammo/rifle@closed',qty:30},
 {id:'bag',name:'Походный рюкзак',level:1,time:14,cost:{materials:18,parts:1},key:'item/backpacks-helmet-pack-2',qty:1},
 {id:'knife',name:'Рабочий нож',level:1,time:8,cost:{materials:7},key:'item/weapons-knife',qty:1},
 {id:'light',name:'Фонарь',level:2,time:14,cost:{materials:12,parts:2},key:'item/electricity-flashlight',qty:1},
 {id:'battery',name:'Батарейки ×2',level:2,time:10,cost:{materials:6,parts:1},key:'item/electricity-batteries',qty:2},
 {id:'shotgun',name:'Охотничий дробовик',level:3,time:20,cost:{materials:35,parts:4},key:'weapon/izh-27',qty:1}
];
export const SURVIVOR_NAMES={'01-gleb':'Глеб','02-roman':'Роман','03-miron':'Мирон','04-egor':'Егор','05-timur':'Тимур','06-makar':'Макар'};
export const clone=value=>JSON.parse(JSON.stringify(value));
export const limit=(n,a=0,b=100)=>Math.max(a,Math.min(b,n));
export const facilityCost=(id,current)=>({materials:(id==='generator'?28:18)+current*22,parts:Math.max(0,current+(id==='radio'||id==='watch'?1:0))});
export function salvageValue(def){const k=def.key;if(def.ammo||def.category==='ammo')return null;if(def.use==='eat'||def.use==='drink')return {food:Math.max(1,Math.ceil(def.weight*4))};if(k==='item/transport-fuel-can')return {fuel:2};if(/electricity|transport|access-card/.test(k))return {parts:1};return {materials:def.slot?Math.max(3,Math.round(def.weight*5)):Math.max(1,Math.round(def.weight*3))};}
