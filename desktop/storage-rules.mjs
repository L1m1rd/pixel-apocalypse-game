export const STORAGE_SLOTS=['pants','shirt','jacket','vest','backpack'];
export function storageCapacity(d){if(!d)return 0;if(d.slot==='backpack')return d.capacity??0;return {pants:2,shirt:1,jacket:4,vest:2}[d.slot]??0;}
export function fitsStorage(name,d){if(!d)return false;if(name==='pockets')return true;if(name==='backpack')return d.slot!=='backpack';return !d.slot&&!['weapons','tools'].includes(d.category)&&d.weight<=2;}
