const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('desktop',{load:()=>ipcRenderer.invoke('prototype:load'),save:value=>ipcRenderer.invoke('prototype:save',value),saveSync:value=>ipcRenderer.sendSync('prototype:save-sync',value),quit:()=>ipcRenderer.invoke('prototype:quit')});
