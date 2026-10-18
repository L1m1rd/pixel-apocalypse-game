const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const JSZip = require('jszip');
const root = path.resolve(__dirname, '../assets/interface-concepts-v1');
const plan = JSON.parse(fs.readFileSync(path.join(root, 'generation-prompts.json'), 'utf8'));
const selectionPath = path.join(root, 'selection.json');
const selection = fs.existsSync(selectionPath) ? JSON.parse(fs.readFileSync(selectionPath, 'utf8')) : null;
async function main() {
  const manifest = {status: selection ? 'selection-recorded' : 'awaiting-user-selection', implemented: false, previewArtworkOnly: true, placeholderContent: ['portraits', 'world-backdrops', 'item-art', 'stats', 'recipes', 'player-names', 'character-traits'], preservesApprovedGameAssets: true, screens: []};
  for (const screen of plan.screens) {
    const width = 960, frameHeight = 540, labelHeight = 48;
    const layers = [];
    const variants = [];
    for (let i = 0; i < plan.styles.length; i++) {
      const style = plan.styles[i];
      const file = screen.id + '-' + style.id + '.png';
      const source = path.join(root, file);
      const meta = await sharp(source).metadata();
      const resized = await sharp(source).resize(width, frameHeight, {fit: 'contain', background: '#141818', kernel: 'nearest'}).png().toBuffer();
      const label = Buffer.from(`<svg width="960" height="48"><rect width="960" height="48" fill="#141818"/><text x="20" y="32" font-family="Segoe UI,Arial" font-size="24" fill="#ece7d9">${style.id} — ${style.name} · ${screen.name}</text></svg>`);
      layers.push({input:label,top:i*(frameHeight+labelHeight),left:0},{input:resized,top:i*(frameHeight+labelHeight)+labelHeight,left:0});
      variants.push({variant:style.id,name:style.name,file,width:meta.width,height:meta.height});
    }
    const comparison = screen.id + '-comparison.png';
    await sharp({create:{width,height:(frameHeight+labelHeight)*3,channels:4,background:'#141818'}}).composite(layers).png().toFile(path.join(root,comparison));
    manifest.screens.push({id:screen.id,name:screen.name,comparison,selectedVariant:selection?.selectedVariant || null,variants});
  }
  fs.writeFileSync(path.join(root,'manifest.json'),JSON.stringify(manifest,null,2));
  fs.writeFileSync(path.join(root,'README.md'),'# Варианты интерфейса\n\n18 визуальных предложений: шесть экранов × три варианта. Ожидают выбора пользователя, интерфейс в игру не внедрён.\n\nA — полевой; B — бумажный; C — контрастный. Выбирать можно отдельно для каждого экрана. Кнопки, показатели и рецепты показаны как предложения и не фиксируют игровые правила.\n\nИсходные макеты созданы встроенным image_gen. generation-prompts.json содержит точные запросы. Листы comparison — только компоновка и масштабирование исходников.\n\n'+manifest.screens.map(s=>`- ${s.name}: ${s.comparison}`).join('\n')+'\n');
  const zip = new JSZip();
  for (const name of fs.readdirSync(root)) if(fs.statSync(path.join(root,name)).isFile())zip.file(name,fs.readFileSync(path.join(root,name)));
  await fs.promises.mkdir(path.resolve(root,'../../output'),{recursive:true});
  fs.writeFileSync(path.resolve(root,'../../output/interface-concepts-v1.zip'),await zip.generateAsync({type:'nodebuffer',compression:'DEFLATE'}));
  console.log(JSON.stringify({screens:manifest.screens.length,concepts:plan.jobs.length,manifest:path.join(root,'manifest.json')}));
}
main().catch(e=>{console.error(e);process.exit(1)});
