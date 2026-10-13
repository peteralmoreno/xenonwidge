'use strict';
const path=require('node:path');
const {ranchPlacement}=require('./window-policy.cjs');
const files={recovery:'recovery.html','ai-sync':'ai-sync.html'};
function createUtilityWindows({BrowserWindow,Menu,screen,appDir,hidden=false}){
 const windows=new Map();
 return {get:kind=>windows.get(kind),async open(kind){if(!Object.hasOwn(files,kind))throw Error('Unsupported utility.');let win=windows.get(kind);if(win&&!win.isDestroyed()){if(!hidden){win.show();win.focus();}return win;}
  const area=screen.getPrimaryDisplay().workArea,bounds=ranchPlacement({width:620,height:680},area);win=new BrowserWindow({...bounds,title:kind==='recovery'?'botRanch · Connection & recovery':'botRanch · AI Sync',frame:true,resizable:true,minWidth:420,minHeight:420,show:!hidden,autoHideMenuBar:true,webPreferences:{preload:path.join(appDir,'preload.cjs'),partition:'bot-ranch-utility-'+kind,sandbox:true,contextIsolation:true,nodeIntegration:false,webSecurity:true,webviewTag:false}});windows.set(kind,win);win.setMenu(Menu.buildFromTemplate([{label:'Window',submenu:[{role:'reload'},{role:'resetZoom'},{role:'zoomIn'},{role:'zoomOut'},{role:'close'}]}]));win.webContents.setWindowOpenHandler(()=>({action:'deny'}));for(const event of ['will-navigate','will-frame-navigate','will-redirect','will-attach-webview'])win.webContents.on(event,e=>e.preventDefault());win.on('closed',()=>{if(windows.get(kind)===win)windows.delete(kind);});await win.loadFile(path.join(appDir,files[kind]));return win;
 }};
}
module.exports={createUtilityWindows};
