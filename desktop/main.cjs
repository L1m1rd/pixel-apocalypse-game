const {app,BrowserWindow,ipcMain}=require('electron');
const fs=require('fs');
const path=require('path');
const {validateSave}=require('./save.cjs');
app.setPath('userData',path.join(app.getPath('appData'),'PixelApocalypse-NorthernDachas'));
if(process.env.PIXEL_APOCALYPSE_TEST_DATA)app.setPath('userData',path.resolve(process.env.PIXEL_APOCALYPSE_TEST_DATA));
const savePath=()=>path.join(app.getPath('userData'),'world-v1.json');
let win;
app.whenReady().then(()=>{
 ipcMain.handle('prototype:load',()=>{try{return validateSave(JSON.parse(fs.readFileSync(savePath(),'utf8')));}catch{return null;}});
 ipcMain.handle('prototype:save',(_event,value)=>{
  const data=validateSave(value);if(!data)throw Error('Некорректное сохранение');
  fs.mkdirSync(path.dirname(savePath()),{recursive:true});
  const tmp=savePath()+'.tmp';fs.writeFileSync(tmp,JSON.stringify(data));fs.renameSync(tmp,savePath());return true;
 });
 ipcMain.on('prototype:save-sync',(event,value)=>{try{const data=validateSave(value);if(!data)throw Error('Invalid save');fs.mkdirSync(path.dirname(savePath()),{recursive:true});const tmp=savePath()+'.tmp';fs.writeFileSync(tmp,JSON.stringify(data));fs.renameSync(tmp,savePath());event.returnValue=true;}catch{event.returnValue=false;}});
 ipcMain.handle('prototype:quit',()=>app.quit());
 win=new BrowserWindow({width:1280,height:800,minWidth:960,minHeight:640,title:'Pixel Apocalypse — тестовая версия',backgroundColor:'#111711',autoHideMenuBar:true,show:false,webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true,backgroundThrottling:!process.env.PIXEL_APOCALYPSE_TEST_DATA}});
 win.removeMenu();win.webContents.setWindowOpenHandler(()=>({action:'deny'}));
 win.webContents.on('will-navigate',event=>event.preventDefault());
 win.webContents.on('before-input-event',(event,input)=>{if(input.key==='F11'&&input.type==='keyDown'){event.preventDefault();win.setFullScreen(!win.isFullScreen());}});
 win.once('ready-to-show',()=>{if(!process.env.PIXEL_APOCALYPSE_TEST_DATA)win.show();});
 win.loadFile(path.join(__dirname,'index.html'));
});
app.on('window-all-closed',()=>app.quit());
