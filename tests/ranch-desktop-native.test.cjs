const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const {_electron: electron, expect} = require('@playwright/test');
const {stageRanch} = require('../tools/build.cjs');
// Windows rounds DIP sizes through physical pixels at fractional scaling.
function near(actual, expected) { assert.ok(Math.abs(actual - expected) <= 2, `${actual} should be within 2 DIP of ${expected}`); }

test('isolated hidden desktop keeps its bridge secure, resizes natively and leaves the companion running', {skip: process.platform !== 'win32', timeout: 60000}, async () => {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'bot-ranch-desktop-native-'));
  const pairingKey = 'a'.repeat(64), adminKey = 'b'.repeat(64);
  const requests = [];
  let application, server;
  try {
    const stage = path.join(temporary, 'release');
    const packagedRuntime = process.env.BOT_RANCH_TEST_DESKTOP_RUNTIME === '1';
    stageRanch(path.resolve(__dirname, '../sources'), stage, {desktop: true, runtime: packagedRuntime});
    fs.writeFileSync(path.join(temporary, 'pairing-key.txt'), pairingKey);
    fs.writeFileSync(path.join(temporary, 'admin-key.txt'), adminKey);
    const {createBridge} = await import(pathToFileURL(path.resolve(__dirname, '../sources/omp-bot-companion/server.mjs')).href);
    let connectionVersion = 2;
    const sharedTask={id:'shared-task',title:'Shared Board task',status:'todo',revision:1,modelEligibility:[],attempts:[],releasedForPickup:false};
    const manager = {
      locks: new Set(), taskLocks: new Set(), tasks: [],
      persist() {throw Error('The active test companion must never be shut down.');},
      residents:()=>[{id:'ranch-native-bot',profileId:'native-bot',project:'Native test bot',state:'reading',label:'Reading fixtures',managed:true,slot:0,color:0,lastSeen:Date.now()}],
      view: () => ({connectionVersion,homeFolder:'',roles:[],taskRevision:1,profiles: [{id: 'native-bot', nickname: 'Native test bot', active: true, activityBusy: true, state: 'working'}], tasks: [sharedTask], updates: [], pickupPaused: false, note: `${adminKey} ${pairingKey}`}),
    };
    server = createBridge({key: pairingKey, adminKey, manager});
    server.on('request', req => requests.push(req.url));
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const origin = 'http://127.0.0.1:' + server.address().port;
    const env = {...process.env, OMP_BOT_KEY_FILE: path.join(temporary, 'pairing-key.txt'), OMP_BOT_PORT: String(server.address().port), BOT_RANCH_DESKTOP_DATA: path.join(temporary, 'desktop-data')};
    delete env.ELECTRON_RUN_AS_NODE;
    const launchOptions = {
      executablePath: packagedRuntime ? path.join(stage, 'desktop/botRanch.exe') : require('electron'),
      args: [...(packagedRuntime ? [] : [path.join(stage, 'desktop/resources/app')]), '--test-hidden'],
      env, timeout: 20000,
    };
    application = await electron.launch(launchOptions);
    const page = await application.firstWindow({timeout: 5000}).catch(async error => {
      console.error(await application.evaluate(({app, BrowserWindow}) => ({appPath: app.getAppPath(), ready: app.isReady(), windows: BrowserWindow.getAllWindows().length, main: process.mainModule?.filename, argv: process.argv})));
      throw error;
    });
    await page.waitForFunction(() => !!window.botRanch);
    await expect.poll(() => page.evaluate(async () => {const state = await window.botRanch.state(); return state.offline === true && !state.starting;})).toBe(true);
    assert.equal(requests.filter(url => url === '/admin/shutdown').length, 1);
    connectionVersion = 1;
    // Exercise the real second-instance recovery handler while suppressing only
    // its show/focus side effects, keeping this isolated smoke entirely hidden.
    await application.evaluate(({app, BrowserWindow}) => {
      const win = BrowserWindow.getAllWindows()[0], show = win.show, focus = win.focus;
      win.show = () => {}; win.focus = () => {};
      try {app.emit('second-instance', {}, [], '', {});} finally {win.show = show; win.focus = focus;}
    });
    await expect.poll(() => page.evaluate(async () => (await window.botRanch.state()).profiles?.[0]?.id)).toBe('native-bot');
    const state = await page.evaluate(() => window.botRanch.state());
    assert.equal(state.note, '[redacted] [redacted]');
    assert.equal(JSON.stringify(state).includes(adminKey), false);
    assert.equal(JSON.stringify(state).includes(pairingKey), false);
    assert.deepEqual(await page.evaluate(() => ({require: typeof window.require, process: typeof window.process, keys: Object.keys(window.botRanch).sort()})), {require: 'undefined', process: 'undefined', keys: ['action', 'openPage', 'openUtility', 'state', 'window']});

    const initial = await application.evaluate(({BrowserWindow, screen}) => {
      const win = BrowserWindow.getAllWindows()[0];
      return {bounds: win.getBounds(), content: win.getContentBounds(), scale: screen.getDisplayMatching(win.getBounds()).scaleFactor, visible: win.isVisible(), pinned: win.isAlwaysOnTop(), area: screen.getDisplayMatching(win.getBounds()).workArea, preferences: win.webContents.getLastWebPreferences()};
    });
    assert.equal(initial.visible, false);
    assert.equal(initial.pinned, true);
    assert.equal(initial.preferences.contextIsolation, true);
    assert.equal(initial.preferences.sandbox, true);
    assert.equal(initial.preferences.nodeIntegration, false);
    near(initial.bounds.width, Math.min(96, initial.area.width));
    near(initial.bounds.height, Math.min(390, initial.area.height));
    const expanded = await page.evaluate(() => window.botRanch.window('expand', true));
    assert.equal(expanded.expanded, true);
    const expandedBounds = await application.evaluate(({BrowserWindow}) => BrowserWindow.getAllWindows()[0].getBounds());
    near(expandedBounds.width, Math.min(500, initial.area.width));
    near(expandedBounds.height, Math.min(560, initial.area.height));
    assert.ok(expandedBounds.x >= initial.area.x && expandedBounds.x + expandedBounds.width <= initial.area.x + initial.area.width);
    assert.ok(expandedBounds.y >= initial.area.y && expandedBounds.y + expandedBounds.height <= initial.area.y + initial.area.height);
    const resized=await page.evaluate(()=>window.botRanch.window('resize',{width:900,height:800}));
    const resizedBounds=await application.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].getBounds());
    near(resizedBounds.width,Math.min(900,initial.area.width));
    near(resizedBounds.height,Math.min(800,initial.area.height));
    assert.equal(resized.panelSize.width,Math.max(500,Math.min(900,initial.area.width)));
    await page.evaluate(() => window.botRanch.window('expand', false));
    const collapsedBounds = await application.evaluate(({BrowserWindow}) => BrowserWindow.getAllWindows()[0].getBounds());
    for (const key of ['x', 'y', 'width', 'height']) near(collapsedBounds[key], initial.bounds[key]);
    await page.evaluate(() => window.botRanch.window('pin', false));
    assert.equal(await application.evaluate(({BrowserWindow}) => BrowserWindow.getAllWindows()[0].isAlwaysOnTop()), false);
    assert.equal((await page.evaluate(() => window.botRanch.window('info'))).pinned, false);
    assert.equal((await page.evaluate(() => window.botRanch.action('launch', {id: 'native-bot'}))).ok, false);
    assert.equal((await page.evaluate(() => window.botRanch.action('/admin/shutdown', {}))).ok, false);
    assert.equal(requests.filter(url => url === '/admin/shutdown').length, 1);

    // Full Board and Settings are isolated native pop-outs, with no dock preload.
    assert.equal((await page.evaluate(() => window.botRanch.openPage('board'))).ok, true);
    await expect.poll(()=>application.windows().length).toBe(2);
    const board=application.windows().find(p=>p!==page);
    await expect(board.locator('#board-columns')).toBeVisible();
    assert.equal(await board.evaluate(()=>typeof window.botRanch),'undefined');
    await board.getByRole('link',{name:'Settings',exact:true}).evaluate(el=>el.click());
    await expect(board.locator('#settings-title')).toHaveText('Home & folders');
    assert.equal((await page.evaluate(()=>window.botRanch.openPage('board'))).ok,true);
    const restoredBoard=application.windows().find(p=>p!==page&&p!==board);
    await expect(restoredBoard.locator('#board-columns')).toBeVisible();
    // Keep the navigated Settings window and its possible drafts intact.
    await expect(board.locator('#settings-title')).toHaveText('Home & folders');
    await restoredBoard.close();
    assert.equal(await board.evaluate(async()=>{try{await fetch('https://example.com/');return false;}catch{return true;}}),true);
    assert.equal((await page.evaluate(() => window.botRanch.openPage('new-task'))).ok, true);
    const newTaskWindow=application.windows().find(p=>p!==page&&p!==board);
    await expect(newTaskWindow.locator('#task-editor')).toBeVisible();
    assert.equal((await page.evaluate(() => window.botRanch.openPage('settings'))).ok, true);
    await expect.poll(()=>application.windows().length).toBe(4);
    const settings=application.windows().find(p=>p.url().includes('/setup/'));
    await expect(settings.locator('#settings-title')).toHaveText('Home & folders');
    assert.equal(await settings.evaluate(()=>typeof window.botRanch),'undefined');
    assert.equal((await page.evaluate(() => window.botRanch.openPage('https://example.com'))).ok, false);
    await application.evaluate(({BrowserWindow})=>{for(const w of BrowserWindow.getAllWindows())if(w.webContents.getURL().startsWith('http:'))w.close();});
    await expect.poll(()=>application.windows().length).toBe(1);
    assert.equal((await page.evaluate(()=>window.botRanch.window('length','long'))).length,'long');
    const longBounds=await application.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].getBounds());
    near(longBounds.height,initial.area.height);near(longBounds.y,initial.area.y);
    await page.evaluate(()=>window.botRanch.window('length','short'));
    const rendererUrl = page.url();
    await page.evaluate(async () => {
      window.open('https://example.com');
      const link = document.createElement('a'); link.href = 'https://example.com'; document.body.append(link); link.click(); link.remove();
      await new Promise(resolve => setTimeout(resolve, 150));
    });
    assert.equal(page.url(), rendererUrl);
    assert.equal(await application.evaluate(({BrowserWindow}) => BrowserWindow.getAllWindows().length), 1);
    assert.equal(await page.evaluate(async origin => {try {await fetch(origin + '/must-not-load'); return false;} catch {return true;}}, origin), true);
    assert.equal(requests.includes('/must-not-load'), false);
    // Full Ranch runs without iCUE, consumes the same task state, and has no dock IPC.
    assert.equal((await page.evaluate(()=>window.botRanch.window('mode','app'))).mode,'app');
    const ranch=application.windows().find(p=>p!==page);
    assert.ok(ranch);
    await expect(ranch.locator('.bot')).toHaveCount(1);
    await expect(ranch.locator('#tasks-tab')).toHaveCount(0);
    await expect(ranch.locator('#task-list')).toHaveCount(0);
    await expect(ranch.locator('#wake-bell')).toBeVisible();
    assert.deepEqual(await ranch.evaluate(()=>({node:typeof window.require,bridge:typeof window.botRanch,hash:location.hash})),{node:'undefined',bridge:'undefined',hash:''});
    assert.equal(await ranch.evaluate(async()=>{try{await fetch('/admin/key');return false;}catch{return true;}}),true);
    assert.equal(requests.includes('/admin/key'),false);
    assert.equal(await ranch.evaluate(async()=>{try{await fetch('https://example.com/');return false;}catch{return true;}}),true);
    const uiWindows=await application.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().map(w=>({resizable:w.isResizable(),visible:w.isVisible(),prefs:w.webContents.getLastWebPreferences()})));
    const full=uiWindows.find(w=>w.resizable);assert.ok(full);assert.equal(full.visible,false);assert.equal(full.prefs.sandbox,true);assert.equal(full.prefs.nodeIntegration,false);assert.equal(full.prefs.preload,undefined);
    const preview=path.resolve(__dirname,'../artifacts/omp-bot/desktop-ranch-app.png');fs.mkdirSync(path.dirname(preview),{recursive:true});await ranch.screenshot({path:preview});
    assert.equal((await page.evaluate(()=>window.botRanch.window('mode','icue'))).mode,'icue');
    await expect.poll(()=>application.windows().length).toBe(1);
    // Explicit reopen revalidates a formerly successful companion connection.
    // An incompatible busy companion must refuse replacement until compatible again.
    connectionVersion=2;
    assert.equal((await page.evaluate(()=>window.botRanch.window('mode','app'))).ok,false);
    assert.equal(application.windows().length,1);
    assert.equal(requests.filter(url=>url==='/admin/shutdown').length,2);
    connectionVersion=1;
    assert.equal((await page.evaluate(()=>window.botRanch.openPage('ranch'))).ok,true);
    await expect.poll(()=>application.windows().length).toBe(2);
    assert.equal((await page.evaluate(()=>window.botRanch.window('info'))).mode,'app');
    await application.close(); application = undefined;
    const response = await fetch(origin + '/admin/state', {headers: {Authorization: 'Bearer ' + adminKey}, signal: AbortSignal.timeout(3000)});
    assert.equal(response.status, 200);
    assert.equal((await response.json()).profiles[0].activityBusy, true);
    assert.equal(requests.filter(url => url === '/admin/shutdown').length, 2);
    const saved = JSON.parse(fs.readFileSync(path.join(temporary, 'desktop-data/window.json'), 'utf8'));
    assert.equal(saved.panelSize.width,resized.panelSize.width);
    assert.equal(saved.mode,'app');assert.equal(saved.pinned,false);assert.ok(saved.ranchBounds.width>=680);
    // The saved B mode reopens a Ranch window on the next launch with the same store.
    application=await electron.launch(launchOptions);
    await expect.poll(()=>application.windows().length).toBe(2);
    const reopened=application.windows().find(p=>p.url().startsWith(origin+'/ui/'));
    assert.ok(reopened);await expect(reopened.locator('.bot')).toHaveCount(1);
    assert.equal(requests.filter(url=>url==='/admin/shutdown').length,2);
  } finally {
    if (application) await application.close().catch(() => {});
    if (server) {server.closeAllConnections(); await new Promise(resolve => server.close(resolve));}
    // Only the exact temporary directory created above is removed.
    assert.equal(path.dirname(temporary), path.resolve(os.tmpdir()));
    fs.rmSync(temporary, {recursive: true, force: true, maxRetries: 5, retryDelay: 100});
  }
});
