import {SLOT_NAMES,CATEGORY_NAMES} from './inventory.mjs';
export function createInventoryUI({getInventory,getPlayer,persist,notice,onToggle}){
 const $=id=>document.getElementById(id);let open=false,tab='bag',selected=null,filter='all',search='';
 const actions={eat:'Съесть',drink:'Выпить',heal:'Применить',read:'Прочитать'};
 const button=(text,action,cls='')=>{const b=document.createElement('button');b.textContent=text;b.className=cls;b.onclick=action;return b;};
 const icon=def=>{const img=document.createElement('img');img.src='media/'+def.file;img.alt='';return img;};
 const changed=()=>{render();persist().catch(()=>notice('Не удалось сохранить инвентарь.'));};
 const perform=(fn)=>{if(!fn())notice('Действие недоступно: проверь место в рюкзаке, количество или состояние героя.');changed();};
 function toggle(value=!open){open=value;$('inventory-overlay').hidden=!open;onToggle(open);if(open){render();$('inventory-close').focus();}else $('world').focus();}
 $('inventory-close').onclick=()=>toggle(false);
 $('inventory-bag-tab').onclick=()=>{tab='bag';selected=null;render();};$('inventory-catalog-tab').onclick=()=>{tab='catalog';selected=null;render();};
 $('inventory-search').oninput=e=>{search=e.target.value.toLocaleLowerCase('ru');render();};$('inventory-filter').onchange=e=>{filter=e.target.value;render();};
 $('inventory-merge').onclick=()=>{getInventory().merge();changed();};
 function render(){
  const inv=getInventory();if(!inv)return;
  $('inventory-bag-tab').setAttribute('aria-selected',String(tab==='bag'));$('inventory-catalog-tab').setAttribute('aria-selected',String(tab==='catalog'));
  $('inventory-summary').textContent=inv.state.bag.length+' / '+inv.slots()+' ячеек · '+inv.weight().toFixed(1)+' кг · '+inv.defs.size+' вариантов в каталоге';
  $('inventory-merge').hidden=tab!=='bag';
  const categories=[...new Set([...inv.defs.values()].map(d=>d.category))];if($('inventory-filter').options.length<2)for(const cat of categories){const o=document.createElement('option');o.value=cat;o.textContent=CATEGORY_NAMES[cat]??cat;$('inventory-filter').append(o);}
  const rows=tab==='catalog'?[...inv.defs.values()].map(d=>({key:d.key,catalog:true})):inv.state.bag;
  const visible=rows.filter(s=>{const d=inv.defs.get(s.key);return (filter==='all'||filter===d.category)&&(!search||(d.name+' '+d.key).toLocaleLowerCase('ru').includes(search));});
  const grid=$('inventory-grid');grid.replaceChildren();
  for(const s of visible){const d=inv.defs.get(s.key),id=s.catalog?s.key:s.uid,b=button('',()=>{selected=id;render();},'item-cell');b.dataset.key=s.key;if(!s.catalog)b.dataset.uid=s.uid;b.title=d.name;b.setAttribute('aria-label',d.name+(s.qty?' ×'+s.qty:''));b.setAttribute('aria-pressed',String(selected===id));b.append(icon(d));const name=document.createElement('span');name.textContent=d.name;b.append(name);if(s.qty){const qty=document.createElement('b');qty.textContent='×'+s.qty;b.append(qty);}grid.append(b);}
  if(!visible.length){const p=document.createElement('p');p.textContent=tab==='bag'?'Рюкзак пуст. Открой «Все предметы» и возьми нужные вещи.':'Ничего не найдено.';grid.append(p);}
  const s=rows.find(s=>(s.catalog?s.key:s.uid)===selected),detail=$('inventory-detail');detail.replaceChildren();
  if(s){const d=inv.defs.get(s.key);detail.append(icon(d));const h=document.createElement('h2');h.textContent=d.name;detail.append(h);const p=document.createElement('p');p.textContent=d.description;detail.append(p);const meta=document.createElement('p');meta.className='muted';meta.textContent='Вес: '+d.weight+' кг · Стак: '+d.maxStack+(d.slot?' · '+SLOT_NAMES[d.slot]:'')+(d.ammo?' · '+(s.loaded??0)+' / '+d.capacity+' · '+d.ammo:'');detail.append(meta);
   if(s.catalog){detail.append(button('Взять 1',()=>perform(()=>inv.add(d.key,1)),'primary'));if(d.maxStack>1)detail.append(button('Взять '+d.maxStack,()=>perform(()=>inv.add(d.key,d.maxStack))));}
   else{if(d.slot)detail.append(button('Экипировать',()=>perform(()=>inv.equip(s.uid)),'primary'));if(d.use)detail.append(button(actions[d.use],()=>perform(()=>inv.use(s.uid)),'primary'));if(s.qty>1)detail.append(button('Разделить пополам',()=>perform(()=>inv.split(s.uid))));detail.append(button('Выбросить',()=>perform(()=>inv.drop(s.uid,getPlayer()))));}
  }else{detail.textContent='Выбери предмет для осмотра и действий.';}
  const eq=$('inventory-equipment');eq.replaceChildren();
  for(const [slot,name] of Object.entries(SLOT_NAMES)){const s=inv.state.equipment[slot],b=button('',()=>{if(s)perform(()=>inv.unequip(slot));},'equipment-slot');b.dataset.slot=slot;const label=document.createElement('span');label.textContent=name;b.append(label);if(s){b.append(icon(inv.defs.get(s.key)));const title=document.createElement('small');title.textContent=inv.defs.get(s.key).name;b.append(title);b.title='Снять: '+inv.defs.get(s.key).name;}else{const blank=document.createElement('small');blank.textContent='Пусто';b.append(blank);}eq.append(b);}
  const ground=$('inventory-ground');ground.replaceChildren();for(const s of inv.nearby(getPlayer())){const d=inv.defs.get(s.key),b=button(d.name+' ×'+s.qty,()=>perform(()=>inv.pickup(s.uid)));b.dataset.groundUid=s.uid;ground.append(b);}
  $('inventory-learned').textContent='Изучено: '+(inv.state.learned.map(k=>inv.defs.get(k).name).join(', ')||'нет');
  updateHUD();
 }
 function updateHUD(){const inv=getInventory();if(!inv)return;const v=inv.state.vitals,w=inv.state.equipment.weapon,def=inv.defs.get(w?.key);$('item-hud').textContent='Здоровье '+v.health+' · Сытость '+v.hunger+' · Вода '+v.thirst+' | '+(def?def.name+' '+w.loaded+'/'+def.capacity:'Оружие не выбрано')+' | I — инвентарь';}
 return {toggle,render,updateHUD,get isOpen(){return open;}};
}
