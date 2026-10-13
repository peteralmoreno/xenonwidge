const { test, expect } = require('@playwright/test');
const path = require('node:path');
const esbuild = require('esbuild');

const source = path.join(__dirname, '../sources/omp-bot-desktop');
let bundle;
test.beforeAll(async () => {
  bundle = (await esbuild.build({ entryPoints: [path.join(source, 'renderer.tsx')], bundle: true, write: false, format: 'iife', jsx: 'automatic' })).outputFiles[0].text;
});
async function setup(page) {
  await page.setViewportSize({ width: 500, height: 560 });
  await page.addInitScript(() => {
    window.dockCalls = [];
    window.dockOffline = false;
    window.dockInfo = { expanded: false, pinned: true, side: 'left', mode:'icue',length:'short' };
    window.dockData = {
      pickupPaused: true, taskRevision:7,homeFolder:'D:/Bots',roles:[{id:'generalist',name:'Generalist'},{id:'pipeline',name:'Pipeline'}],
      profiles: [{ id: 'p1', revision:1, nickname: 'Brick', color: 0, state: 'ready', status: 'connected', label: 'Ready', active: true, workCheckSupported: true }, { id: 'p2', revision:1, nickname: 'Piper', color: 1, state: 'offline', status: 'closed', active: true, workCheckSupported: false }],
      tasks: [{ id: 't1', revision:3, instructions:'Review carefully', projectFolder:'D:/Bots', title: 'Review the renderer', status: 'review', assignedProfileId: 'p1', family: { name: 'Desktop', color: 'cyan' } }, { id: 't2',revision:4,instructions:'Build and verify',projectFolder:'D:/Bots', title: 'Ship installer', status: 'todo' }, { id: 't3', title: 'Archived work', status: 'done', archived: true }],
      updates: [{ id: 'u1', profileId: 'p1', taskId: 't1', text: '<img src=x onerror=alert(1)> Finished review', at: Date.now() }]
    };
    window.botRanch = {
      state: async () => { window.dockReads = (window.dockReads || 0) + 1; if (window.dockHold) return new Promise(resolve => window.dockResolve = resolve); if (window.dockOffline === 'payload') return { offline: true, error: window.dockSafeError || 'Unavailable' }; if (window.dockOffline) throw Error('Internal exception details'); return window.dockData; },
      action: async (name, body) => { window.dockCalls.push({ name, body }); return { result: window.dockActionResult }; },
      openPage: async (page, taskId) => { window.dockCalls.push({ page, taskId }); },
      window: async (action, value) => { window.dockCalls.push({ action, value }); if (action === 'expand') window.dockInfo.expanded = value; if (action === 'pin') window.dockInfo.pinned = value; if(action==='mode')window.dockInfo.mode=value; if(action==='length')window.dockInfo.length=value; return window.dockInfo; }
    };
  });
  await page.route('http://dock.test/**', route => {
    const file = new URL(route.request().url()).pathname;
    if (file === '/renderer.js') return route.fulfill({ body: bundle, contentType: 'text/javascript' });
    return route.fulfill({ path: path.join(source, file === '/' ? 'index.html' : file.slice(1)) });
  });
  await page.goto('http://dock.test/');
  await page.getByRole('button', { name: 'Open task panel', exact: true }).click();
  await expect(page.getByRole('region', { name: 'botRanch panel' })).toBeVisible();
}

test('sidebar opens task details and authors locally; full Board is optional', async ({page})=>{
 await setup(page);
 await expect(page.getByText('Archived work',{exact:true})).toHaveCount(0);
 await page.getByRole('button',{name:/Review the renderer/}).click();
 await expect(page.getByRole('heading',{name:'Review the renderer'})).toBeVisible();
 await page.getByRole('button',{name:'Accept result',exact:true}).click();
 expect(await page.evaluate(()=>window.dockCalls)).toEqual(expect.arrayContaining([{name:'task-review',body:{id:'t1',expectedRevision:3,action:'accept'}}]));
 await page.getByRole('button',{name:'New task',exact:true}).first().click();
 await page.getByLabel('Task title',{exact:true}).fill('New sidebar work');
 await page.getByLabel('Instructions',{exact:true}).fill('Check this project');
 await page.getByRole('button',{name:'Save task',exact:true}).click();
 expect(await page.evaluate(()=>window.dockCalls.filter(c=>c.page))).toEqual([]);
 expect(await page.evaluate(()=>window.dockCalls.find(c=>c.name==='task-save').body)).toMatchObject({title:'New sidebar work',expectedRevision:7,projectFolder:'D:/Bots',releasedForPickup:false});
});

test('sidebar distinguishes running and installed versions and never claims stale companion data is live', async ({page})=>{
 await setup(page);
 await page.evaluate(()=>{
   Object.assign(window.dockInfo,{desktopVersion:'0.17.0',installedVersion:'0.17.1',updatePending:true});
   window.dockData.appVersion='0.16.0';
 });
 await expect(page.getByLabel('App versions')).toContainText('App v0.17.0');
 await expect(page.getByLabel('App versions')).toContainText('Companion v0.16.0');
 await expect(page.getByRole('status').filter({hasText:'v0.17.1 installed'})).toContainText('Quit desktop app');
 await page.evaluate(()=>{window.dockOffline=true;});
 await expect(page.getByLabel('App versions')).toContainText('Companion offline');
 await expect(page.getByLabel('App versions')).not.toContainText('Companion v0.16.0');
});

test('bots support bells only when available and updates render plain text', async ({ page }) => {
  await setup(page);
  await page.getByRole('button', { name: 'Bots', exact: true }).click();
  await page.getByRole('button', { name: 'Ring Brick', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Ring Piper', exact: true })).toBeDisabled();
  expect(await page.evaluate(() => window.dockCalls)).toEqual(expect.arrayContaining([{ name: 'poke', body: { id: 'p1' } }]));
  await page.getByRole('button', { name: 'Updates', exact: true }).click();
  await expect(page.getByText('<img src=x onerror=alert(1)> Finished review', { exact: true })).toBeVisible();
  await expect(page.locator('img')).toHaveCount(0);
});

test('disconnect retains stale rows and disables actions until reconnected', async ({ page }) => {
  await setup(page);
  await page.evaluate(() => window.dockOffline = true);
  await expect(page.getByText(/Offline.*read-only/)).toBeVisible({ timeout: 6000 });
  await expect(page.getByText('Review the renderer', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'New task', exact: true }).first()).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Resume pickup', exact: true })).toBeDisabled();
  await page.evaluate(() => window.dockOffline = false);
  await expect(page.getByRole('button', { name: 'New task', exact: true }).first()).toBeEnabled({ timeout: 6000 });
});

test('native movement, hide and Escape are wired without overflowing the window', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await setup(page);
  const grip = page.getByRole('button', { name: /Move dock/ });
  await grip.focus(); await page.keyboard.press('ArrowRight'); await page.keyboard.press('Shift+ArrowDown');
  expect(await page.evaluate(() => window.dockCalls)).toEqual(expect.arrayContaining([{ action: 'move', value: { dx: 12, dy: 0 } }, { action: 'move', value: { dx: 0, dy: 40 } }]));
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.documentElement.scrollHeight <= innerHeight)).toBe(true);
  await page.screenshot({ path: 'artifacts/omp-bot/desktop-dock-expanded.png' });
  await page.keyboard.press('Escape');
  await expect(page.getByRole('region', { name: 'botRanch panel' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Open task panel', exact: true })).toBeFocused();
  await page.setViewportSize({ width: 96, height: 390 });
  await expect(grip).toBeVisible();
  const hideBounds = await page.getByRole('button', { name: 'Hide dock', exact: true }).boundingBox();
  expect(hideBounds.y + hideBounds.height).toBeLessThan(390);
  await page.screenshot({ path: 'artifacts/omp-bot/desktop-dock-collapsed.png' });
  await page.getByRole('button', { name: 'Hide dock', exact: true }).click();
  expect(await page.evaluate(() => window.dockCalls)).toEqual(expect.arrayContaining([{ action: 'hide', value: undefined }]));
});

test('error payload becomes read-only and a timed-out response cannot overwrite it', async ({ page }) => {
  await page.clock.install();
  await setup(page);
  await page.evaluate(() => window.dockOffline = 'payload');
  await page.clock.runFor(2500);
  await expect(page.getByText(/Offline.*read-only/)).toBeVisible();
  await page.evaluate(() => { window.dockOffline = false; window.dockHold = true; });
  await page.clock.runFor(2500);
  const reads = await page.evaluate(() => window.dockReads);
  await page.clock.runFor(6500);
  expect(await page.evaluate(() => window.dockReads)).toBe(reads);
  await page.evaluate(() => window.dockResolve({ ...window.dockData, tasks: [{ id: 'late', title: 'Late result must not show', status: 'todo' }] }));
  await expect(page.getByText('Late result must not show')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'New task', exact: true }).first()).toBeDisabled();
});

test('pointer cancellation releases the grip and blocks subsequent motion', async ({ page }) => {
  await setup(page);
  const grip = page.getByRole('button', { name: /Move dock/ });
  const bounds = await grip.boundingBox();
  await page.mouse.move(bounds.x + 10, bounds.y + 10);
  await page.mouse.down();
  await page.mouse.move(bounds.x + 20, bounds.y + 20);
  await grip.dispatchEvent('pointercancel', { pointerId: 1 });
  const moves = await page.evaluate(() => window.dockCalls.filter(call => call.action === 'move').length);
  await page.mouse.move(bounds.x + 35, bounds.y + 35); await page.mouse.up();
  expect(await page.evaluate(() => window.dockCalls.filter(call => call.action === 'move').length)).toBe(moves);
});

test('tray window changes synchronize pin, expansion and panel direction', async ({ page }) => {
  await page.clock.install();
  await setup(page);
  await page.evaluate(() => window.dockInfo = { expanded: true, pinned: false, side: 'right' });
  await page.clock.runFor(2500);
  await expect(page.getByRole('button', { name: 'Pin dock above windows' })).toBeVisible();
  await expect(page.locator('.dock-shell')).toHaveClass(/expands-right/);
  await page.evaluate(() => window.dockInfo.expanded = false);
  await page.clock.runFor(2500);
  await expect(page.getByRole('button', { name: 'Open task panel', exact: true })).toBeVisible();
});

test('sleeping Pipeline Poke checks its owned job and shows the backend result', async ({ page }) => {
  await page.clock.install();
  await setup(page);
  await page.evaluate(() => {
    Object.assign(window.dockData.profiles[0], { status: 'monitor sleeping', state: 'ready', label: 'Monitoring asleep', activityBusy: true });
    window.dockActionResult = { message: 'Monitoring resumed for the existing job.' };
  });
  await page.clock.runFor(2500);
  await page.getByRole('button', { name: 'Bots', exact: true }).click();
  const poke = page.getByRole('button', { name: 'Ring Brick', exact: true });
  await expect(poke).toBeEnabled();
  await poke.click();
  expect(await page.evaluate(() => window.dockCalls)).toEqual(expect.arrayContaining([{ name: 'poke', body: { id: 'p1' } }]));
  await expect(page.getByText('Monitoring resumed for the existing job.', { exact: true })).toBeVisible();
  await page.evaluate(() => window.dockData.profiles[0].active = false);
  await page.clock.runFor(2500);
  await expect(poke).toHaveCount(0);
  await page.evaluate(() => Object.assign(window.dockData.profiles[0], { active: true, status: 'closed' }));
  await page.clock.runFor(2500);
  await expect(poke).toBeDisabled();
});

test('offline notice preserves safe host guidance but does not expose raw exceptions', async ({ page }) => {
  await page.clock.install();
  await setup(page);
  await page.evaluate(() => { window.dockOffline = 'payload'; window.dockSafeError = 'Finish active work before restarting the companion to upgrade.'; });
  await page.clock.runFor(2500);
  await expect(page.getByText(/Finish active work before restarting the companion to upgrade/)).toBeVisible();
  await page.evaluate(() => window.dockOffline = true);
  await page.clock.runFor(2500);
  await expect(page.getByText(/Offline.*read-only/)).toBeVisible();
  await expect(page.getByText(/Internal exception details/)).toHaveCount(0);
  await expect(page.getByText(/Finish active work before/)).toHaveCount(0);
});

test('Ranch display switches A/B without sending work mutations',async({page})=>{
 await setup(page);
 const mode=page.getByRole('combobox',{name:'Ranch display'});
 await expect(mode).toBeVisible({timeout:1500});await expect(mode).toHaveValue('icue');
 await mode.selectOption('app');await expect(mode).toHaveValue('app');
 await mode.selectOption('icue');await expect(mode).toHaveValue('icue');
 const calls=await page.evaluate(()=>window.dockCalls);
 expect(calls).toEqual(expect.arrayContaining([{action:'mode',value:'app'},{action:'mode',value:'icue'}]));
 expect(calls.filter(c=>c.name)).toEqual([]);
});


test('Factory saves a profile to Bank; bots can start sessions and ring all',async({page})=>{
 await setup(page);
 await page.getByRole('button',{name:'Factory',exact:true}).click();
 await page.getByLabel('Bot name').fill('Piper II');
 await page.getByRole('combobox',{name:'Role',exact:true}).selectOption('pipeline');
 await page.getByRole('combobox',{name:'Design',exact:true}).selectOption('pipeline');
 await page.getByRole('button',{name:'Mint',exact:true}).click();
 await page.getByRole('button',{name:'Create in Bank',exact:true}).click();
 expect(await page.evaluate(()=>window.dockCalls.find(c=>c.name==='factory').body)).toMatchObject({nickname:'Piper II',role:'pipeline',design:'pipeline',color:13,folder:''});
 await expect(page.getByRole('button',{name:/Bank 0/})).toHaveAttribute('aria-pressed','true');
 await page.getByRole('button',{name:/On ranch/}).click();
 await page.getByRole('button',{name:'Open session',exact:true}).click();
 await page.getByRole('button',{name:'Ring all',exact:true}).click();
 expect(await page.evaluate(()=>window.dockCalls)).toEqual(expect.arrayContaining([{name:'session',body:{id:'p2'}},{name:'ring-all',body:{}}]));
});

test('long mode is independent of Ranch display and shows more Board space',async({page})=>{
 await setup(page);
 await page.getByRole('button',{name:'Use long sidebar'}).click();
 await page.setViewportSize({width:500,height:1000});
 await expect(page.locator('.dock-shell')).toHaveClass(/is-long/);
 await expect(page.getByRole('combobox',{name:'Ranch display'})).toHaveValue('icue');
 expect((await page.locator('.panel-scroll').boundingBox()).height).toBeGreaterThan(600);
 await page.screenshot({path:'artifacts/omp-bot/sidebar-board-long.png'});
 await page.getByRole('button',{name:'Factory',exact:true}).click();
 await page.screenshot({path:'artifacts/omp-bot/sidebar-factory-long.png'});
 await page.getByRole('button',{name:'Use short dock'}).click();
 await expect(page.locator('.dock-shell')).toHaveClass(/is-short/);
});

test('pending cards assign with queue revision and drafts keep their original revision during polling',async({page})=>{
 await page.clock.install();await setup(page);
 await page.getByRole('button',{name:/Ship installer/}).click();
 await page.getByLabel('Assigned bot').selectOption('p1');
 expect(await page.evaluate(()=>window.dockCalls.find(c=>c.name==='queue').body)).toEqual({id:'t2',profileId:'p1',beforeTaskId:null,expectedRevision:4,expectedQueueRevision:7});
 await page.getByRole('button',{name:'Edit task',exact:true}).click();
 await page.getByLabel('Task title',{exact:true}).fill('Unsaved local draft');
 await page.evaluate(()=>{window.dockData.tasks[1].revision=10;window.dockData.tasks[1].title='Changed elsewhere';});
 await page.clock.runFor(2500);
 await expect(page.getByLabel('Task title',{exact:true})).toHaveValue('Unsaved local draft');
 await page.getByRole('button',{name:'Save task',exact:true}).click();
 expect(await page.evaluate(()=>window.dockCalls.find(c=>c.name==='task-save').body.expectedRevision)).toBe(4);
});


test('dragging pending cards assigns their queue without fabricating work status',async({page})=>{
 await setup(page);
 await page.getByRole('button',{name:/Ship installer/}).dragTo(page.locator('.queue-targets').getByText('Brick',{exact:true}));
 expect(await page.evaluate(()=>window.dockCalls.find(c=>c.name==='queue').body)).toEqual({id:'t2',profileId:'p1',beforeTaskId:null,expectedRevision:4,expectedQueueRevision:7});
 expect(await page.evaluate(()=>window.dockCalls.filter(c=>c.name==='task-save'||c.name==='task-start'))).toEqual([]);
});

test('busy bots are put away after current work and bank admission preserves revision checks',async({page})=>{
 await page.clock.install();await setup(page);
 await page.evaluate(()=>{window.dockData.profiles[0].activityBusy=true;window.dockData.profiles.push({id:'p3',revision:6,nickname:'Spare',active:false,status:'connected',color:4});});
 await page.clock.runFor(2500);
 await page.getByRole('button',{name:'Bots',exact:true}).click();
 await page.getByRole('button',{name:'Put away after task',exact:true}).click();
 await page.getByRole('button',{name:/Bank 1/}).click();
 await page.getByRole('button',{name:'Show session',exact:true}).click();
 await page.getByRole('button',{name:'Bring to Ranch',exact:true}).click();
 expect(await page.evaluate(()=>window.dockCalls)).toEqual(expect.arrayContaining([{name:'focus',body:{id:'p3'}},{name:'membership',body:{id:'p1',active:false,expectedRevision:1}},{name:'membership',body:{id:'p3',active:true,expectedRevision:6}}]));
 await page.screenshot({path:'artifacts/omp-bot/sidebar-bot-bank.png'});
});
