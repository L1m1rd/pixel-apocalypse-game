// Reconcile catalog ownership without deleting source history or other chats' work.
const fs=require('node:fs'),path=require('node:path'),{policy,worldItem}=require('./asset-ownership.cjs');
const ROOT=path.resolve(__dirname,'..'),read=p=>JSON.parse(fs.readFileSync(path.join(ROOT,p),'utf8')),write=(p,v)=>fs.writeFileSync(path.join(ROOT,p),JSON.stringify(v,null,2)+'\n');
const catalog=read('assets/item-visuals-v2/catalog.json');
for(const g of catalog.retained)g.items=g.items.filter(i=>!policy.itemAliases[i.id]).map(worldItem);
for(const g of catalog.groups)g.items=g.items.map(worldItem);
catalog.retainedVisuals=catalog.retained.reduce((n,g)=>n+g.items.length,0);
catalog.notes=[...new Set([...catalog.notes,'Shared world objects resolve to environment-variants-v1; do not generate additional copies.','materials-planks is a compatibility alias of resource-harvest-boards, not a second item.'])];
write('assets/item-visuals-v2/catalog.json',catalog);
const retired=[];
for(const id of [...Object.keys(policy.sharedWorldItems),...Object.keys(policy.itemAliases)]){
 const isNew=catalog.groups.some(g=>g.items.some(i=>i.id===id)),base='assets/item-visuals-v2/'+(isNew?'':'retained/');
 retired.push(base+'art/'+id+'.png',base+'sprites/'+id+'.png');
}
for(const id of policy.retiredLootFood)for(const folder of ['art','sprites','ground','sources','records'])retired.push('assets/wildlife-loot-v1/'+folder+'/'+id+(folder==='records'?'.json':'.png'));
const config=read('publication-config.json');config.excludedLocalPaths=[...new Set([...config.excludedLocalPaths,...retired])];write('publication-config.json',config);
const ignorePath=path.join(ROOT,'.gitignore');let ignore=fs.readFileSync(ignorePath,'utf8');const lines=new Set(ignore.split(/\r?\n/));const added=retired.map(p=>'/'+p).filter(p=>!lines.has(p));if(added.length)ignore+='\n# Reconciled duplicate item exports; owners are in asset-ownership.json\n'+added.join('\n')+'\n';fs.writeFileSync(ignorePath,ignore);
console.log(JSON.stringify({retiredDuplicateFiles:retired.length,sharedWorldObjects:Object.keys(policy.sharedWorldItems).length,retiredLootFood:policy.retiredLootFood.length,remainingRetainedEntries:catalog.retainedVisuals}));
