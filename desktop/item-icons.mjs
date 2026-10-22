export function itemPicture(def,stack,onClick,{label=def.name,action='Взять',className=''}={}){
 const b=document.createElement('button');b.type='button';b.className='item-picture '+className;b.title=action+': '+label;b.setAttribute('aria-label',action+': '+label+' ×'+stack.qty);b.dataset.key=def.key;b.dataset.uid=String(stack.uid??'');b.onclick=onClick;
 const img=document.createElement('img');img.src='media/'+def.file;img.alt='';img.draggable=false;b.append(img);
 if(stack.qty>1){const qty=document.createElement('b');qty.className='picture-quantity';qty.textContent='×'+stack.qty;b.append(qty);}
 if(Number.isFinite(stack.condition)){const meter=document.createElement('meter');meter.min=0;meter.max=100;meter.value=stack.condition;meter.className='picture-condition';meter.setAttribute('aria-label','Состояние '+Math.round(stack.condition)+'%');b.append(meter);}
 return b;
}
export function itemImage(def,className=''){const img=document.createElement('img');img.src='media/'+def.file;img.alt='';img.draggable=false;img.className=className;return img;}
