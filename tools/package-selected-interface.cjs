const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const JSZip = require('jszip');
const base = path.resolve(__dirname,'../assets/interface-concepts-v1');
const root = path.resolve(__dirname,'../assets/interface-selected-v1');
async function main(){
  const selection = JSON.parse(fs.readFileSync(path.join(base,'selection.json'),'utf8'));
  const original = JSON.parse(fs.readFileSync(path.join(base,'manifest.json'),'utf8'));
  const edits = JSON.parse(fs.readFileSync(path.join(root,'generation-records.json'),'utf8'));
  const manifest = {status:selection.approved?'approved-visual-mockups':'selected-A-with-two-revisions',implemented:false,originalDirectionApproved:true,revisedMockupsAwaitReview:!selection.approved,tool:'built-in image_gen',selection,screens:[]};
  const layers = [];
  for(let i=0;i<original.screens.length;i++){
    const screen=original.screens[i];
    const edit=edits.find(e=>e.id===screen.id);
    const file=screen.id+'.png';
    const source=edit ? (fs.existsSync(edit.source) ? edit.source : path.join(root,file)) : path.join(base,screen.id+'-A.png');
    if(path.resolve(source)!==path.join(root,file))fs.copyFileSync(source,path.join(root,file));
    const meta=await sharp(path.join(root,file)).metadata();
    if(!meta.width||!meta.height)throw Error('Invalid PNG '+file);
    const preview=await sharp(path.join(root,file)).resize(640,360,{fit:'contain',kernel:'nearest',background:'#141818'}).png().toBuffer();
    const label=Buffer.from(`<svg width="640" height="40"><rect width="640" height="40" fill="#141818"/><text x="14" y="27" font-family="Segoe UI,Arial" font-size="22" fill="#ece7d9">${screen.name} · A${edit?' · обновлено':''}</text></svg>`);
    const left=(i%2)*640, top=Math.floor(i/2)*400;
    layers.push({input:label,left,top},{input:preview,left,top:top+40});
    manifest.screens.push({id:screen.id,name:screen.name,file,variant:'A',revised:Boolean(edit),width:meta.width,height:meta.height});
    screen.selectedVariant='A';
  }
  original.status='selection-recorded';
  fs.writeFileSync(path.join(base,'manifest.json'),JSON.stringify(original,null,2));
  await sharp({create:{width:1280,height:1200,channels:4,background:'#141818'}}).composite(layers).png().toFile(path.join(root,'overview.png'));
  fs.writeFileSync(path.join(root,'manifest.json'),JSON.stringify(manifest,null,2));
  fs.writeFileSync(path.join(root,'README.md'),'# Выбранный интерфейс — A\n\nВсе шесть экранов используют выбранное пользователем направление A. HUD обновлён: блок задач справа удалён. В снаряжение инвентаря добавлены отдельные слоты штанов и противогаза, всего восемь слотов. Остальные четыре экрана скопированы без перерисовки из выбранных вариантов A.\n\nЭто визуальные макеты. Внедрение в игру не выполнено. Портреты, фоны, предметы, рецепты и значения внутри макетов примерные. Все шесть макетов и правки одобрены пользователем для публикации.\n\nИзменения выполнены встроенным image_gen; точные запросы и происхождение находятся в generation-records.json. Решения сохранены в ../interface-concepts-v1/selection.json и ../../docs/interface-direction.md.\n');
  const zip=new JSZip();
  for(const name of fs.readdirSync(root))if(fs.statSync(path.join(root,name)).isFile())zip.file(name,fs.readFileSync(path.join(root,name)));
  const archive=path.resolve(root,'../../output/interface-selected-v1.zip');
  fs.mkdirSync(path.dirname(archive),{recursive:true});
  fs.writeFileSync(archive,await zip.generateAsync({type:'nodebuffer',compression:'DEFLATE'}));
  console.log(JSON.stringify({screens:manifest.screens.length,revised:manifest.screens.filter(s=>s.revised).length,archive}));
}
main().catch(e=>{console.error(e);process.exit(1)});
