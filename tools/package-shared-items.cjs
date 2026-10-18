const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
let JSZip;try{JSZip=require('jszip');}catch{JSZip=require(path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/jszip'));}
const ROOT=path.resolve(__dirname,'..');
module.exports=async function packageSharedItems(){
 const config=JSON.parse(await fs.readFile(path.join(ROOT,'publication-config.json'),'utf8')),excluded=p=>config.excludedLocalPaths.some(x=>p===x||p.startsWith(x+'/')),z=new JSZip(),added=new Set();
 async function add(file){if(added.has(file))return;assert(!excluded(file),'Retired file requested in archive '+file);z.file(file,await fs.readFile(path.join(ROOT,file)));added.add(file);}
 async function walk(dir){for(const e of await fs.readdir(path.join(ROOT,dir),{withFileTypes:true})){const rel=dir+'/'+e.name;if(excluded(rel))continue;if(e.isDirectory())await walk(rel);else await add(rel);}}
 for(const pack of ['item-visuals-v2','wildlife-loot-v1'])await walk('assets/'+pack);
 const core=JSON.parse(await fs.readFile(path.join(ROOT,'assets/item-visuals-v2/manifest.json'),'utf8'));
 for(const i of core.categories.flatMap(g=>g.items).filter(i=>i.sharedAssetRef))for(const key of ['art','sprite','worldAnimation'])if(i[key])await add(path.posix.normalize('assets/item-visuals-v2/'+i[key]));
 for(const p of ['docs/items-design.md','docs/asset-conflicts.md','docs/asset-registry.json','docs/asset-consistency-report.json','asset-ownership.json','AGENTS.md'])await add(p);
 z.file('README.md','# Текущие предметы без дублей\n\nОткрой assets/item-visuals-v2/preview.html или assets/wildlife-loot-v1/preview.html. Сохраняй структуру папок assets: оба каталога используют общие изображения. В архив включены используемые общие PNG окружения и анимационный просмотр костра. Все варианты окружения и остальные разделы проекта доступны отдельно в GitHub.\n\nСверка: docs/asset-conflicts.md.\n');
 for(const pack of ['item-visuals-v2','wildlife-loot-v1']){const m=JSON.parse(await fs.readFile(path.join(ROOT,'assets',pack,'manifest.json'),'utf8')),rows=m.items||m.categories.flatMap(g=>g.items);for(const i of rows)for(const key of ['art','sprite','ground'])if(i[key])assert(added.has(path.posix.normalize('assets/'+pack+'/'+i[key])),'Archive missing shared dependency '+i[key]);}
 const bytes=await z.generateAsync({type:'nodebuffer',compression:'DEFLATE',compressionOptions:{level:6}}),verified=await JSZip.loadAsync(bytes,{checkCRC32:true});assert(!Object.keys(verified.files).some(excluded));
 const archive='output/current-items-clean-v1.zip';await fs.mkdir(path.join(ROOT,'output'),{recursive:true});await fs.writeFile(path.join(ROOT,archive),bytes);console.log(JSON.stringify({archive,bytes:bytes.length,files:added.size+1,crcVerified:true,sharedDependenciesIncluded:true,retiredFilesExcluded:true}));
};
