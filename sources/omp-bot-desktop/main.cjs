'use strict';
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const {pathToFileURL, fileURLToPath} = require('node:url');
const {spawn} = require('node:child_process');
const policy = require('./window-policy.cjs');
const {RecoveryController}=require('./recovery-controller.cjs');
const DESKTOP_VERSION=require('./package.json').version;

const UNAVAILABLE = 'The companion is unavailable. Open Board or Settings to check its status.';
function versionInfo(appDir, desktopVersion = DESKTOP_VERSION) {
  const result = {desktopVersion};
  const releaseRoot = path.resolve(appDir, '../../..');
  const versionsRoot = path.dirname(releaseRoot);
  if (path.basename(versionsRoot) !== 'versions') return result;
  try {
    const {version} = JSON.parse(fs.readFileSync(path.join(versionsRoot, '../current.json'), 'utf8'));
    if (/^\d+\.\d+\.\d+$/.test(version)) return {...result, installedVersion:version, updatePending:version !== desktopVersion};
  } catch { /* Version display remains available without an installed launcher. */ }
  return result;
}
function companionPaths(appDir, packaged = !fs.existsSync(path.resolve(appDir, '../omp-bot-companion/config.mjs'))) {
  return packaged
    ? {root: path.resolve(appDir, '../../..'), manifest: path.resolve(appDir, '../../../ui/manifest.json')}
    : {root: path.resolve(appDir, '../omp-bot-companion'), manifest: path.resolve(appDir, '../omp-bot/manifest.json')};
}
function browserOptions(appDir, bounds, pinned) {
  return {
    ...bounds, title: 'botRanch Dock', icon: path.join(appDir, 'icon.png'),
    frame: false, transparent: true, backgroundColor: '#00000000', hasShadow: true,
    alwaysOnTop: pinned, resizable: false, maximizable: false, fullscreenable: false,
    skipTaskbar: true, show: false, autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(appDir, 'preload.cjs'), partition: 'bot-ranch-dock',
      sandbox: true, contextIsolation: true, nodeIntegration: false,
      webSecurity: true, allowRunningInsecureContent: false, webviewTag: false,
      navigateOnDragDrop: false, spellcheck: false,
    },
  };
}
function mapHealthPayload(payload, version, origin, lastSuccessAt) {
  if (payload?.connectionVersion !== 1 || typeof payload.appVersion !== 'string' || typeof payload.instanceId !== 'string' || !payload.instanceId || typeof payload.busy !== 'boolean') return {status:'unknown-service',message:'The service on the expected address is not a recognized Bot Ranch companion.',origin,lastSuccessAt};
  const busy=payload.busy,compatible=payload.appVersion===version,status=compatible?'connected':busy?'busy-upgrade':'version-mismatch';
  return {status,message:compatible?'Bot Ranch companion is connected.':busy?'The companion version differs and active work must finish before an update.':'The companion version differs; a safe restart is available when idle.',origin,busy,...(Number.isSafeInteger(payload.pid)?{pid:payload.pid}:{}),instanceId:payload.instanceId,appVersion:payload.appVersion,...(typeof payload.homeFolder==='string'?{homeFolder:payload.homeFolder.slice(0,1024)}:{}),lastSuccessAt};
}
function createCompanionClient(credentials, fetchImpl = fetch, version = DESKTOP_VERSION) {
  let lastSuccessAt;
  async function request(route, body) {
    const response = await fetchImpl(credentials.origin + route, {
      method: body === undefined ? 'GET' : 'POST', redirect: 'error',
      headers: {Authorization: 'Bearer ' + credentials.adminKey, 'Content-Type': 'application/json'},
      ...(body === undefined ? {} : {body: JSON.stringify(body)}),
      signal: AbortSignal.timeout(body === undefined ? 3000 : 45000),
    });
    if (!response.ok) {
      const payload = await response.json().catch(()=>null);
      const error = Error('Companion request failed.');
      error.status=response.status;
      if ([400,409].includes(response.status) && typeof payload?.error === 'string') error.userMessage = policy.redact(payload.error.slice(0,700),[credentials.adminKey,credentials.pairingKey]);
      throw error;
    }
    return policy.redact(await response.json(), [credentials.adminKey, credentials.pairingKey]);
  }
  return {
    async state() {
      try { return await request('/admin/state'); }
      catch { return {offline: true, error: UNAVAILABLE}; }
    },
    async action(name, body) {
      const command = policy.actionRequest(name, body);
      try { return {ok: true, result: await request(command.route, command.body)}; }
      catch (error) { return {ok: false, error: error.userMessage || 'The companion could not complete that action.'}; }
    },
    async health(){try{const result=await request('/admin/health');lastSuccessAt=Date.now();return mapHealthPayload(result,version,credentials.origin,lastSuccessAt);}catch(error){return {status:error.status===401||error.status===403?'port-conflict':error.status?'unknown-service':/ECONNREFUSED/.test(String(error.cause?.message||error.message))?'offline':'unresponsive',origin:credentials.origin,lastSuccessAt,message:error.userMessage||'The companion health check did not complete.'};}},
    async shutdown(){try{await request('/admin/shutdown');return {ok:true};}catch(error){return {ok:false,status:error.status,error:error.userMessage||'The companion refused the shutdown request.'};}},
    async aiSync(action,body){const routes={skill:['GET','/admin/ai/skill'],catalog:['GET','/admin/ai/catalog'],snapshot:['GET','/admin/ai/snapshot'],preview:['POST','/admin/ai/preview'],apply:['POST','/admin/ai/apply'],history:['GET','/admin/ai/history'],access:['GET','/admin/ai/access'],'set-access':['POST','/admin/ai/access']};const spec=routes[action];if(!spec)return {ok:false,error:'Unsupported AI Sync action.'};try{return {ok:true,result:await request(spec[1],spec[0]==='GET'?undefined:body)};}catch(error){return {ok:false,status:error.status,error:error.userMessage||'The companion could not complete the AI Sync request.'};}},
  };
}

async function boot() {
  const {app, BrowserWindow, Menu, Tray, nativeImage, ipcMain, screen, session, clipboard} = require('electron');
  const override = process.env.BOT_RANCH_DESKTOP_DATA;
  if (override && !path.isAbsolute(override)) throw Error('Desktop data path must be absolute.');
  const dataDir = override || path.join(process.env.LOCALAPPDATA || path.join(os.homedir(), '.config'), 'OmpBot', 'desktop');
  fs.mkdirSync(dataDir, {recursive: true});
  app.setPath('userData', dataDir);
  app.setName('botRanch Dock');
  if (!app.requestSingleInstanceLock()) { app.quit(); return; }

  let win, tray, quitting = false, expanded = false, side = 'left';
  let client, credentials, startupError, startupStatus, connecting, starting = true, utilityWindows;
  const recovery=new RecoveryController({health:async()=>credentials&&client?client.health():{status:starting?'starting':'offline',message:startupError||'No companion is connected.'},shutdown:async()=>credentials&&client?client.shutdown():{ok:false,status:503},start:async()=>{await connect();if(startupError)throw Error(startupError);},quit:()=>app.quit()});
  let saveTimer;
  const preferenceFile = path.join(dataDir, 'window.json');
  let saved;
  try { saved = policy.preferences(JSON.parse(fs.readFileSync(preferenceFile, 'utf8'))); }
  catch { saved = {pinned: true}; }
  let pinned = saved.pinned;
  let mode = saved.mode || 'icue', length = saved.length || 'short', ranchBounds = saved.ranchBounds, ranchWindow, companionWindows;
  let anchor = {x: saved.x, y: saved.y}, panelSize = saved.panelSize || {...policy.EXPANDED};
  const info = () => ({expanded, pinned, side, mode, length, panelSize, ...versionInfo(app.getAppPath())});
  const preferences = () => ({...anchor,pinned,mode,length,panelSize,...(ranchBounds?{ranchBounds}:{})});
  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try { fs.writeFileSync(preferenceFile, JSON.stringify(preferences()) + '\n', {mode: 0o600}); } catch { /* Position persistence is best effort. */ }
    }, 180);
  }
  function areaFor(pos = anchor) {
    return Number.isFinite(pos.x) && Number.isFinite(pos.y)
      ? screen.getDisplayNearestPoint({x: Math.round(pos.x + 48), y: Math.round(pos.y + 40)}).workArea
      : screen.getPrimaryDisplay().workArea;
  }
  function place(area = areaFor()) {
    anchor = policy.clampAnchor(anchor, area);
    const bounds = policy.placement(anchor, area, expanded, length, panelSize);
    side = bounds.side;
    const {x, y, width, height} = bounds;
    win.setBounds({x, y, width, height}, false);
    save();
    return info();
  }
  function show() {
    if (!win || win.isDestroyed()) return;
    place();
    win.show();
    win.focus();
    updateTray();
  }
  function hide() { expanded = false; place(); win.hide(); updateTray(); }
  function reset() { expanded = false; anchor = {}; place(screen.getPrimaryDisplay().workArea); show(); }
  function pin(value) { pinned = value; win.setAlwaysOnTop(pinned); save(); updateTray(); }
  async function openPage(page, taskId) {
    if (!credentials) return {ok: false, error: UNAVAILABLE};
    const url = policy.pageUrl(page, taskId, credentials);
    if (page === 'ranch') {await setMode('app');return {ok:true};}
    try {
      if(!companionWindows)companionWindows=require('./companion-window.cjs').createCompanionWindows({BrowserWindow,Menu,session,screen,appDir,hidden:process.argv.includes('--test-hidden')});
      await companionWindows.open(page==='settings'?'settings':'board',url,credentials.origin);
      return {ok:true};
    } catch { return {ok:false,error:'Could not open the companion window.'}; }
  }
  async function openUtility(kind){
    try{kind=policy.utilityKind(kind);}catch{return {ok:false,error:'Unsupported utility.'};}
    if(!utilityWindows)utilityWindows=require('./utility-window.cjs').createUtilityWindows({BrowserWindow,Menu,screen,appDir,hidden:process.argv.includes('--test-hidden')});
    await utilityWindows.open(kind);return {ok:true};
  }
  function utilityTrusted(event,onlyKind){if(!utilityWindows||!event.senderFrame)return false;return (onlyKind?[onlyKind]:['recovery','ai-sync']).some(kind=>{const utility=utilityWindows.get(kind);if(!utility||utility.isDestroyed())return false;const expected=pathToFileURL(path.join(appDir,kind==='recovery'?'recovery.html':'ai-sync.html')).href;return policy.trustedSender(event,utility.webContents,expected);});}
  async function showRanch() {
    if(mode!=='app')return;
    if(!credentials||starting||startupError)throw Error(UNAVAILABLE);
    if(!ranchWindow)ranchWindow=require('./ranch-window.cjs').createRanchWindow({
      BrowserWindow,Menu,session,screen,appDir,credentials,getBounds:()=>ranchBounds,
      onBounds:bounds=>{ranchBounds=bounds;save();},isAppMode:()=>mode==='app',
      onIcue:()=>void setMode('icue'),onBoard:()=>void openPage('board'),onSettings:()=>void openPage('settings'),
      hidden:process.argv.includes('--test-hidden'),
    });
    await ranchWindow.open();
  }
  async function setMode(value) {
    mode=value;save();updateTray();
    if(mode==='icue'){ranchWindow?.close();return info();}
    await connect();
    await showRanch();return info();
  }
  function requestMode(value) {void setMode(value).catch(()=>{/* Reopen retries; dock state reports companion connectivity. */});}
  function updateTray() {
    if (!tray) return;
    tray.setContextMenu(Menu.buildFromTemplate([
      {label: win.isVisible() ? 'Hide dock' : 'Show dock', click: () => win.isVisible() ? hide() : show()},
      {label: 'Always on top', type: 'checkbox', checked: pinned, click: item => pin(item.checked)},
      {label:'Sidebar size',submenu:['short','long'].map(value=>({label:value==='long'?'Long sidebar':'Short dock',type:'radio',checked:length===value,click:()=>{length=value;place();updateTray();}}))},
      {label: 'Ranch display', submenu:[
        {label:'A · iCUE widget',type:'radio',checked:mode==='icue',click:()=>requestMode('icue')},
        {label:'B · Desktop app',type:'radio',checked:mode==='app',click:()=>requestMode('app')},
      ]},
      {label:'Open Desktop Ranch',click:()=>requestMode('app')},
      {type: 'separator'},
      {label: 'Open Board', click: () => void openPage('board')},
      {label: 'Settings', click: () => void openPage('settings')},
      {label: 'Reset dock position', click: reset},
      {type: 'separator'},
      {label: 'Quit desktop app', click: () => app.quit()},
    ]));
  }
  app.on('second-instance', () => {show(); void (async()=>{await connect();if(mode==='app')await showRanch();})().catch(()=>{});});
  app.on('activate', show);
  app.on('before-quit', () => {
    quitting = true;
    clearTimeout(saveTimer);
    try { fs.writeFileSync(preferenceFile, JSON.stringify(preferences()) + '\n', {mode: 0o600}); } catch { /* Keep quit reliable. */ }
  });
  // The companion is detached and deliberately has no shutdown/kill hook here.
  await app.whenReady();
  app.setAppUserModelId('com.xeneonwidge.botranch.desktop');
  const appDir = app.getAppPath();
  const rendererUrl = pathToFileURL(path.join(appDir, 'index.html')).href;
  const dockSession = session.fromPartition('bot-ranch-dock');
  dockSession.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
  dockSession.setPermissionCheckHandler(() => false);
  dockSession.on('will-download', event => event.preventDefault());
  dockSession.webRequest.onBeforeRequest((details, callback) => {
    let allowed = false;
    try {
      const relative = path.relative(appDir, fileURLToPath(details.url));
      allowed = relative !== '' && relative !== '..' && !relative.startsWith('..' + path.sep) && !path.isAbsolute(relative);
    } catch { /* Deny network and all other URL schemes. */ }
    callback({cancel: !allowed});
  });
  anchor = policy.clampAnchor(anchor, areaFor());
  const first = policy.placement(anchor, areaFor(), false, length);
  side = first.side;
  const {x, y, width, height} = first;
  win = new BrowserWindow(browserOptions(appDir, {x, y, width, height}, pinned));
  win.setMenu(null);
  win.webContents.setWindowOpenHandler(() => ({action: 'deny'}));
  win.webContents.on('will-navigate', event => event.preventDefault());
  win.webContents.on('will-frame-navigate', event => event.preventDefault());
  win.webContents.on('will-attach-webview', event => event.preventDefault());
  win.on('close', event => { if (!quitting) { event.preventDefault(); hide(); } });
  if (!process.argv.includes('--test-hidden')) win.once('ready-to-show', show);
  for (const event of ['display-added', 'display-removed', 'display-metrics-changed']) screen.on(event, () => place());
  function handle(channel, action) {
    ipcMain.handle(channel, async (event, ...args) => {
      if (!policy.trustedSender(event, win.webContents, rendererUrl)) throw Error('Unauthorized dock request.');
      try { return await action(...args); }
      catch { return {ok: false, error: 'Unsupported dock request.'}; }
    });
  }
  handle('bot-ranch:state', () => {
    if (starting) return {offline: true, starting: true, error: 'Connecting to the companion…'};
    if (startupError || !client) return {offline: true, status: startupStatus||'offline', error: startupError || UNAVAILABLE};
    return client.state();
  });
  handle('bot-ranch:action', (name, body) => {
    policy.actionRequest(name, body);
    return starting || startupError || !client ? {ok: false, error: UNAVAILABLE} : client.action(name, body);
  });
  handle('bot-ranch:open-page', openPage);
  handle('bot-ranch:open-utility', kind => openUtility(kind));
  ipcMain.handle('bot-ranch:utility-health', async event => {if(!utilityTrusted(event,'recovery'))throw Error('Unauthorized utility request.');const health=credentials&&client?await client.health():{status:starting?'starting':'offline',message:startupError||'No companion is connected.'};return {...health,...versionInfo(app.getAppPath()),...recovery.status()};});
  ipcMain.handle('bot-ranch:utility-recover', async (event,action) => {if(!utilityTrusted(event)||!['reconnect','restart-when-idle','quit-when-idle','cancel'].includes(action))throw Error('Unauthorized recovery request.');return action==='cancel'?recovery.cancel():recovery.request(action);});
  ipcMain.handle('bot-ranch:utility-diagnostics', async event => {if(!utilityTrusted(event,'recovery'))throw Error('Unauthorized utility request.');const health=credentials&&client?await client.health():{status:starting?'starting':'offline'};let recentLifecycle=[];try{const paths=companionPaths(app.getAppPath()),cfg=await import(pathToFileURL(path.join(paths.root,'config.mjs')).href),log=path.join(cfg.dataDir,'companion-lifecycle.log');if(fs.existsSync(log))recentLifecycle=fs.readFileSync(log,'utf8').split(/\r?\n/).filter(Boolean).slice(-20).map(line=>{try{const row=JSON.parse(line);return {at:row.at,event:row.event,status:row.status,code:row.code,version:row.version,instanceId:row.instanceId};}catch{return null;}}).filter(Boolean);}catch{}return JSON.stringify({...versionInfo(app.getAppPath()),status:health.status,origin:health.origin,appVersion:health.appVersion,homeFolder:health.homeFolder,pid:health.pid,instanceId:health.instanceId,lastSuccessAt:health.lastSuccessAt,pendingRecovery:recovery.status(),recentLifecycle},null,2).slice(0,16000);});
  ipcMain.handle('bot-ranch:utility-copy', async (event,text) => {if(!utilityTrusted(event)||typeof text!=='string'||text.length>16000)throw Error('Unsupported clipboard request.');clipboard.writeText(text);return {ok:true};});
  ipcMain.handle('bot-ranch:utility-ai-sync', async (event,action,body) => {if(!utilityTrusted(event,'ai-sync')||!['skill','catalog','snapshot','preview','apply','history','access','set-access'].includes(action))throw Error('Unauthorized AI Sync request.');if(starting||!client)return {ok:false,error:'The companion is offline. Open Connection & recovery to reconnect.'};return client.aiSync(action,body);});
  handle('bot-ranch:window', (action, value) => {
    const command = policy.windowRequest(action, value);
    if(command.action==='mode')return setMode(command.value);
    if(command.action==='length'){length=command.value;place();updateTray();}
    if (command.action === 'expand') { expanded = value; place(); if(expanded)show(); }
    if (command.action === 'resize' && expanded) {
      const area=areaFor();
      panelSize=policy.preferences({panelSize:{width:Math.min(command.value.width,area.width),height:length==='long'?panelSize.height:Math.min(command.value.height,area.height)}}).panelSize;
      place();
    }
    if (command.action === 'pin') pin(value);
    if (command.action === 'hide') hide();
    if (command.action === 'reset') reset();
    if (command.action === 'move') {
      anchor = policy.moveAnchor(anchor, command.value, point => screen.getDisplayNearestPoint(point).workArea);
      place();
    }
    return info();
  });
  const trayImage = nativeImage.createFromPath(path.join(appDir, 'icon.png'));
  tray = new Tray(trayImage.resize({width: 32, height: 32}));
  tray.setToolTip('botRanch v' + DESKTOP_VERSION);
  tray.on('click', () => win.isVisible() ? hide() : show());
  updateTray();
  await win.loadURL(rendererUrl);

  function connect() {
    if (connecting) return connecting;
    starting = true;
    startupError = undefined;
    connecting = (async () => {
      try {
        // Staged release layouts also run under a development Electron executable.
        const paths = companionPaths(appDir);
        const config = await import(pathToFileURL(path.join(paths.root, 'config.mjs')).href);
        const nextCredentials = {origin: 'http://127.0.0.1:' + config.port, adminKey: config.ensureAdminKey(), pairingKey: config.ensureKey()};
        if (credentials && (credentials.origin !== nextCredentials.origin || credentials.pairingKey !== nextCredentials.pairingKey)) {
          ranchWindow?.close();
          ranchWindow = undefined;
        }
        credentials = nextCredentials;
        client = createCompanionClient(credentials,fetch,app.getVersion());
        const {ensureCompanion} = await import(pathToFileURL(path.join(paths.root, 'companion-start.mjs')).href);
        const version = JSON.parse(fs.readFileSync(paths.manifest, 'utf8')).version;
        await ensureCompanion({origin: credentials.origin, token: credentials.adminKey, version, start: () => new Promise((resolve, reject) => {
          const child = spawn(process.execPath, [path.join(paths.root, 'bridge.mjs')], {
            cwd: paths.root, detached: true, windowsHide: true, stdio: 'ignore',
            env: {...process.env, ELECTRON_RUN_AS_NODE: '1'},
          });
          child.once('error', reject);
          child.once('spawn', () => {child.unref(); resolve();});
        })});
      } catch {
        startupError = 'The companion could not connect or needs an update. Finish active work, then open botRanch again to retry. Board and Settings remain available.';
      } finally { starting = false; }
    })().finally(() => {connecting = undefined;});
    return connecting;
  }
  await connect();
  if(mode==='app')await showRanch().catch(()=>{});
}

module.exports = {browserOptions, companionPaths, createCompanionClient, mapHealthPayload, versionInfo};
// Electron's entry loader need not make this module require.main (notably with
// its inspector loader). Plain Node imports remain inert for policy tests.
if (process.versions.electron && process.type === 'browser') boot().catch(() => {
  // Do not print exception details: startup paths may involve credentials.
  console.error('botRanch Dock could not start. Check the installed desktop files and try again.');
  require('electron').app.quit();
});
