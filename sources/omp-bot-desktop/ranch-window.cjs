'use strict';
const path = require('node:path');
const {ranchPlacement} = require('./window-policy.cjs');
const assets = new Set(['/ui/','/ui/app.js','/ui/widget.css','/ui/world.js','/ui/sprites.js','/ui/appearance.js','/ui/resources/icon.svg']);
function allowedRequest(value, origin) {
  try {
    const url=new URL(value);
    return url.origin===origin && !url.username && !url.password && !url.search &&
      (assets.has(url.pathname)||['/state','/selection','/focus'].includes(url.pathname)||/^\/control\/[a-z/-]+$/.test(url.pathname));
  } catch {return false;}
}
function ranchOptions(appDir, bounds) {
  return {...bounds,title:'botRanch · Desktop Ranch',icon:path.join(appDir,'icon.png'),frame:true,resizable:true,maximizable:true,minimizable:true,skipTaskbar:false,show:false,backgroundColor:'#202e2a',autoHideMenuBar:false,minWidth:Math.min(680,bounds.width),minHeight:Math.min(420,bounds.height),webPreferences:{partition:'bot-ranch-view',sandbox:true,contextIsolation:true,nodeIntegration:false,webSecurity:true,allowRunningInsecureContent:false,webviewTag:false,navigateOnDragDrop:false,spellcheck:false}};
}
function createRanchWindow({BrowserWindow,Menu,session,screen,appDir,credentials,getBounds,onBounds,isAppMode,onIcue,onBoard,onSettings,hidden=false}) {
  let win, loading;
  const ses=session.fromPartition('bot-ranch-view');
  ses.setPermissionRequestHandler((_web,_permission,callback)=>callback(false));
  ses.setPermissionCheckHandler(()=>false);
  ses.on('will-download',event=>event.preventDefault());
  ses.webRequest.onBeforeRequest((details,callback)=>callback({cancel:!allowedRequest(details.url,credentials.origin)}));
  ses.webRequest.onHeadersReceived((details,callback)=>callback({responseHeaders:{...details.responseHeaders,'Content-Security-Policy':["default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'"]}}));
  async function open() {
    if(!win||win.isDestroyed()) {
      const saved=getBounds(),area=saved?screen.getDisplayMatching(saved).workArea:screen.getPrimaryDisplay().workArea;
      win=new BrowserWindow(ranchOptions(appDir,ranchPlacement(saved,area)));
      const current=win;
      current.setMenu(Menu.buildFromTemplate([
        {label:'Ranch',submenu:[{label:'A · Use iCUE widget',click:onIcue},{type:'separator'},{label:'Open Board',click:onBoard},{label:'Settings',click:onSettings},{type:'separator'},{label:'Close Ranch window',role:'close'}]},
        {label:'View',submenu:[{label:'Always on top',type:'checkbox',checked:false,click:item=>current.setAlwaysOnTop(item.checked)},{role:'reload'},{role:'resetZoom'},{role:'zoomIn'},{role:'zoomOut'},{role:'togglefullscreen'}]},
      ]));
      current.webContents.setWindowOpenHandler(()=>({action:'deny'}));
      for(const event of ['will-navigate','will-frame-navigate','will-redirect','will-attach-webview'])current.webContents.on(event,event=>event.preventDefault());
      current.on('page-title-updated',event=>event.preventDefault());
      const remember=()=>{if(!current.isDestroyed())onBounds(current.getNormalBounds());};
      current.on('move',remember);current.on('resize',remember);current.on('close',remember);
      current.on('closed',()=>{if(win===current){win=undefined;loading=undefined;}});
      loading=current.loadURL(credentials.origin+'/ui/#pair='+encodeURIComponent(credentials.pairingKey)).catch(()=>{if(!current.isDestroyed())current.destroy();throw Error('Could not load Ranch. Reopen it after the companion reconnects.');});
    }
    await loading;
    if(win&&!win.isDestroyed()&&isAppMode()&&!hidden){if(win.isMinimized())win.restore();win.show();win.focus();}
  }
  return {open,hide:()=>{if(win&&!win.isDestroyed())win.hide();},close:()=>{if(win&&!win.isDestroyed())win.close();}};
}
module.exports={ranchOptions,allowedRequest,createRanchWindow};
