const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const filename = path.join(__dirname, '../sources/omp-bot-desktop/main.cjs');
const host = fs.existsSync(filename) ? require(filename) : {};

test('version information distinguishes the running app from a newly installed release', () => {
  const os = require('node:os');
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ranch-version-info-'));
  try {
    const appDir = path.join(root, 'versions/0.17.0/desktop/resources/app');
    fs.mkdirSync(appDir, {recursive:true});
    fs.writeFileSync(path.join(root,'current.json'), JSON.stringify({version:'0.17.1'}));
    assert.deepEqual(host.versionInfo(appDir,'0.17.0'), {desktopVersion:'0.17.0',installedVersion:'0.17.1',updatePending:true});
    fs.writeFileSync(path.join(root,'current.json'), JSON.stringify({version:'../secret'}));
    assert.deepEqual(host.versionInfo(appDir,'0.17.0'), {desktopVersion:'0.17.0'});
    assert.deepEqual(host.versionInfo(path.join(root,'uninstalled/app'),'0.17.0'), {desktopVersion:'0.17.0'});
  } finally {fs.rmSync(root,{recursive:true,force:true});}
});

test('desktop window starts isolated and transparent with no native resize affordance', () => {
  assert.equal(typeof host.browserOptions, 'function');
  const options = host.browserOptions('/app', {x: 10, y: 20, width: 96, height: 390}, true);
  assert.equal(options.frame, false);
  assert.equal(options.transparent, true);
  assert.equal(options.alwaysOnTop, true);
  assert.equal(options.resizable, false);
  assert.equal(options.webPreferences.sandbox, true);
  assert.equal(options.webPreferences.contextIsolation, true);
  assert.equal(options.webPreferences.nodeIntegration, false);
  assert.equal(options.webPreferences.webSecurity, true);
});

test('packaged companion path resolves to the release while development uses sibling sources', () => {
  assert.equal(typeof host.companionPaths, 'function');
  assert.deepEqual(host.companionPaths(path.resolve('sources/omp-bot-desktop'), false), {root: path.resolve('sources/omp-bot-companion'), manifest: path.resolve('sources/omp-bot/manifest.json')});
  assert.deepEqual(host.companionPaths(path.resolve('release/desktop/resources/app'), true), {root: path.resolve('release'), manifest: path.resolve('release/ui/manifest.json')});
  assert.deepEqual(host.companionPaths(path.resolve('release/desktop/resources/app')), {root: path.resolve('release'), manifest: path.resolve('release/ui/manifest.json')});
  assert.equal(host.companionPaths(path.resolve('sources/omp-bot-desktop')).root, path.resolve('sources/omp-bot-companion'));
});

test('authenticated companion requests never send or return credential material to the renderer', async () => {
  assert.equal(typeof host.createCompanionClient, 'function');
  const calls = [];
  const client = host.createCompanionClient({origin: 'http://127.0.0.1:12345', adminKey: 'admin-secret', pairingKey: 'pair-secret'}, async (url, options) => {
    calls.push({url, options});
    return {ok: true, json: async () => ({profiles: [], note: 'admin-secret pair-secret'})};
  });
  assert.deepEqual(await client.state(), {profiles: [], note: '[redacted] [redacted]'});
  await client.action('poke', {id: 'bot-1'});
  assert.equal(calls[0].url, 'http://127.0.0.1:12345/admin/state');
  assert.equal(calls[0].options.headers.Authorization, 'Bearer admin-secret');
  assert.equal(calls[0].options.redirect, 'error');
  assert.equal(calls[1].url, 'http://127.0.0.1:12345/admin/profile/check-work');
  assert.equal(calls[1].options.body, '{"id":"bot-1"}');
  await assert.rejects(() => client.action('launch', {}));
  assert.equal(calls.length, 2);
});

test('companion failures return a safe error independent of response content', async () => {
  assert.equal(typeof host.createCompanionClient, 'function');
  const client = host.createCompanionClient({origin: 'http://127.0.0.1:1', adminKey: 'secret', pairingKey: 'pair'}, async () => {throw Error('secret in low-level failure');});
  assert.deepEqual(await client.state(), {offline: true, error: 'The companion is unavailable. Open Board or Settings to check its status.'});
  assert.deepEqual(await client.action('pickup', {paused: true}), {ok: false, error: 'The companion could not complete that action.'});
});

test('revision conflicts reach sidebar forms with credentials redacted',async()=>{
 const client=host.createCompanionClient({origin:'http://127.0.0.1:1',adminKey:'admin-secret',pairingKey:'pair-secret'},async()=>({ok:false,status:409,json:async()=>({error:'Conflict: reload admin-secret pair-secret'})}));
 assert.deepEqual(await client.action('membership',{id:'bot',active:false,expectedRevision:3}),{ok:false,error:'Conflict: reload [redacted] [redacted]'});
});
test('authenticated health payload maps verified companion states and strips unrecognized metadata',async()=>{const hostVersion='0.17.0',origin='http://127.0.0.1:12345',credentials={origin,adminKey:'admin-secret',pairingKey:'pair-secret'};const payload=(appVersion,busy=false)=>({connectionVersion:1,appVersion,instanceId:'instance',pid:42,homeFolder:'C:\\Bot Ranch',busy,note:'admin-secret pair-secret'});const clientFor=data=>host.createCompanionClient(credentials,async(url,options)=>({ok:true,status:200,json:async()=>data}),hostVersion);const connected=await clientFor(payload(hostVersion)).health();assert.equal(connected.status,'connected');assert.equal(connected.origin,origin);assert.equal(connected.instanceId,'instance');assert.equal(connected.busy,false);assert.equal(connected.note,undefined);assert.doesNotMatch(JSON.stringify(connected),/admin-secret|pair-secret/);assert.equal((await clientFor(payload('0.16.0',true)).health()).status,'busy-upgrade');assert.equal((await clientFor(payload('0.16.0',false)).health()).status,'version-mismatch');assert.equal((await clientFor({...payload('0.16.0'),busy:'false'}).health()).status,'unknown-service');const partial=payload('0.16.0');delete partial.busy;assert.equal((await clientFor(partial).health()).status,'unknown-service');assert.equal((await clientFor({other:'service'}).health()).status,'unknown-service');});
test('health and AI Sync bridge use fixed authenticated routes without returning credentials',async()=>{const calls=[],client=host.createCompanionClient({origin:'http://127.0.0.1:12345',adminKey:'admin-secret',pairingKey:'pair-secret'},async(url,options)=>{calls.push({url,options});return {ok:true,status:200,json:async()=>url.endsWith('/health')?{connectionVersion:1,appVersion:'0.17.0',instanceId:'id',busy:false,note:'admin-secret pair-secret'}:{}};},'0.17.0');const health=await client.health();assert.equal(health.status,'connected');assert.equal(health.origin,'http://127.0.0.1:12345');assert.doesNotMatch(JSON.stringify(health),/admin-secret|pair-secret/);const result=await client.aiSync('catalog');assert.equal(result.ok,true);assert.doesNotMatch(JSON.stringify(result),/admin-secret|pair-secret/);assert.equal(calls[0].url,'http://127.0.0.1:12345/admin/health');assert.equal(calls[1].url,'http://127.0.0.1:12345/admin/ai/catalog');assert.equal(calls[0].options.headers.Authorization,'Bearer admin-secret');assert.deepEqual(await client.aiSync('https://evil.test'),{ok:false,error:'Unsupported AI Sync action.'});assert.equal(calls.length,2);});
