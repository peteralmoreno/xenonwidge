'use strict';
const {ranchOptions}=require('./ranch-window.cjs');
const {ranchPlacement}=require('./window-policy.cjs');
const pages=new Set(['/board/','/setup/']);
const assets=new Set(['/setup/board.js','/setup/board.css','/setup/app.js','/setup/style.css','/setup/settings.css','/ui/sprites.js']);
const routes=new Set(['state','checks','key','control-key','control-key/revoke','profile/check-work','profile/ring-all','profile/delete','profile/clean','library/import','role','pickup','task/start','profile','settings','action','task/queue','task/stop','task','task/archive','task/pipeline','task/retry','task/review','membership']);
function allowedRequest(value,origin){try{const u=new URL(value);return u.origin===origin&&!u.username&&!u.password&&!u.search&&(pages.has(u.pathname)||assets.has(u.pathname)||u.pathname.startsWith('/admin/')&&routes.has(u.pathname.slice(7)));}catch{return false;}}
function allowedNavigation(value,origin){try{const u=new URL(value);return allowedRequest(value,origin)&&pages.has(u.pathname);}catch{return false;}}
function createCompanionWindows({BrowserWindow,Menu,session,screen,appDir,hidden=false}){
 const windows=new Map();
 return {async open(page,url,origin){
  const fragment=new URLSearchParams(new URL(url).hash.slice(1));
  const key=page+':'+(fragment.get('task')|| (fragment.get('new')==='1'?'new':''));
  let win=windows.get(key);
  if(win&&!win.isDestroyed()&&win.webContents.getURL().split('#')[0]===url.split('#')[0]){if(!hidden){if(win.isMinimized())win.restore();win.show();win.focus();}return;}
  const options=ranchOptions(appDir,ranchPlacement({width:1100,height:820},screen.getPrimaryDisplay().workArea));
  options.title=page==='settings'?'botRanch · Settings':'botRanch · Full Board';
  options.webPreferences.partition='bot-ranch-companion-'+page;
  const ses=session.fromPartition(options.webPreferences.partition);
  ses.setPermissionRequestHandler((_c,_p,cb)=>cb(false));ses.setPermissionCheckHandler(()=>false);
  ses.on('will-download',event=>event.preventDefault());
  ses.webRequest.onBeforeRequest((details,cb)=>cb({cancel:!allowedRequest(details.url,origin)}));
  win=new BrowserWindow(options);windows.set(key,win);
  win.setMenu(Menu.buildFromTemplate([{label:'View',submenu:[{role:'reload'},{role:'resetZoom'},{role:'zoomIn'},{role:'zoomOut'},{role:'togglefullscreen'},{role:'close'}]}]));
  win.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  for(const name of ['will-navigate','will-frame-navigate','will-redirect'])win.webContents.on(name,(event,url)=>{if(!allowedNavigation(url,origin))event.preventDefault();});
  win.webContents.on('will-attach-webview',event=>event.preventDefault());
  win.on('closed',()=>{if(windows.get(key)===win)windows.delete(key);});
  try{await win.loadURL(url);if(!hidden&&!win.isDestroyed()){win.show();win.focus();}}
  catch{if(!win.isDestroyed())win.destroy();throw Error('Could not open the companion window.');}
 }};
}
module.exports={allowedRequest,allowedNavigation,createCompanionWindows};
