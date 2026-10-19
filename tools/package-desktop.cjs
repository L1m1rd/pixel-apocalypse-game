const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
const ROOT=path.resolve(__dirname,'..'),version=require('../desktop/package.json').version;
const dest=process.env.PIXEL_APOCALYPSE_OUTPUT?path.resolve(process.env.PIXEL_APOCALYPSE_OUTPUT):path.join(ROOT,'output','PixelApocalypse-northern-dachas-v'+version+'-win32-x64');
const runtime=path.join(ROOT,'desktop/node_modules/electron/dist');
if(!fs.existsSync(path.join(runtime,'electron.exe')))throw Error('Install desktop dependencies: npm --prefix desktop install');
fs.mkdirSync(dest,{recursive:true});
const exe=path.join(dest,'PixelApocalypse.exe'),runtimeVersion=fs.readFileSync(path.join(runtime,'version'),'utf8').trim();
const sameRuntime=fs.existsSync(exe)&&fs.existsSync(path.join(dest,'version'))&&fs.readFileSync(path.join(dest,'version'),'utf8').trim()===runtimeVersion;
if(!sameRuntime)for(const name of fs.readdirSync(runtime))fs.cpSync(path.join(runtime,name),path.join(dest,name==='electron.exe'?'PixelApocalypse.exe':name),{recursive:true});
const app=path.join(dest,'resources/app');fs.mkdirSync(app,{recursive:true});
for(const name of ['package.json','main.cjs','save.cjs','preload.cjs','core.mjs','northern-dachas-map.mjs','northern-dachas-renderer.mjs','northern-dachas-details.mjs','northern-dachas-lighting.mjs','index.html','style.css','renderer.mjs','media'])fs.cpSync(path.join(ROOT,'desktop',name),path.join(app,name),{recursive:true});
fs.writeFileSync(path.join(dest,'КАК ИГРАТЬ.txt'),'Pixel Apocalypse — Северные дачи '+version+'\r\n\r\nЗапуск: PixelApocalypse.exe. Оставьте все файлы сборки рядом с ним.\r\nСоздать мир → выбрать героя → указать название → Создать мир.\r\n80 участков, 60 дач, восемь секторов, проезды, лес, река и кольцевая дорога.\r\n\r\nWASD / стрелки — движение. Shift — бег. C / Ctrl — присесть.\r\nE — открыть/закрыть ближайшие ворота. M — обзорная карта.\r\nКолесо мыши — масштаб. H — скрыть интерфейс. Esc — пауза. F11 — полный экран.\r\n\r\nПозиция и открытые ворота сохраняются автоматически в отдельном профиле PixelApocalypse-NorthernDachas.\r\nДома пока без доступных интерьеров. Бой и заражённые не подключены.\r\nВетка GitHub: codex/northern-dachas.\r\n');
let sourceCommit=null;try{sourceCommit=execFileSync('git',['rev-parse','HEAD'],{cwd:ROOT,encoding:'utf8'}).trim();}catch{}
fs.writeFileSync(path.join(dest,'release-manifest.json'),JSON.stringify({version,branch:'codex/northern-dachas',sourceCommit,mapId:'northern-dachas-v1',plots:80,houses:60,sectors:8,executable:'PixelApocalypse.exe'},null,2));
console.log(JSON.stringify({executable:exe,version,branch:'codex/northern-dachas'}));
