const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const policyPath = require('node:path').join(__dirname, '../sources/omp-bot-desktop/window-policy.cjs');
const policy = fs.existsSync(policyPath) ? require(policyPath) : {};

test('expansion opens into the display without moving the rail horizontally', () => {
  assert.equal(typeof policy.placement, 'function');
  const area = {x: 0, y: 0, width: 1920, height: 1040};
  assert.deepEqual(policy.placement({x: 20, y: 200}, area, true), {x: 20, y: 200, width: 500, height: 560, side: 'right'});
  assert.deepEqual(policy.placement({x: 1800, y: 200}, area, true), {x: 1396, y: 200, width: 500, height: 560, side: 'left'});
  assert.deepEqual(policy.placement({x: 1800, y: 200}, area, false), {x: 1800, y: 200, width: 96, height: 390, side: 'left'});
});

test('geometry respects negative monitor coordinates, small work areas and stale positions', () => {
  assert.equal(typeof policy.placement, 'function');
  assert.deepEqual(policy.placement({x: -100, y: -50}, {x: -1920, y: -200, width: 1920, height: 1080}, true), {x: -504, y: -50, width: 500, height: 560, side: 'left'});
  assert.deepEqual(policy.placement({x: 9999, y: 9999}, {x: -300, y: 0, width: 300, height: 400}, true), {x: -300, y: 0, width: 300, height: 400, side: 'left'});
  assert.deepEqual(policy.clampAnchor({x: NaN, y: Infinity}, {x: 100, y: 50, width: 1000, height: 700}), {x: 984, y: 70});
});

test('small movement steps cross monitor seams without accumulating outer-edge overshoot', () => {
  assert.equal(typeof policy.moveAnchor, 'function');
  const areas = [{x: -1920, y: 0, width: 1920, height: 1080}, {x: 0, y: 0, width: 1920, height: 1080}, {x: 1920, y: 0, width: 1920, height: 1080}];
  const areaAt = point => areas[point.x < 0 ? 0 : point.x >= 1920 ? 2 : 1];
  assert.deepEqual(policy.moveAnchor({x: 1824, y: 20}, {dx: 12, dy: 0}, areaAt), {x: 1920, y: 20});
  assert.deepEqual(policy.moveAnchor({x: 0, y: 20}, {dx: -12, dy: 0}, areaAt), {x: -96, y: 20});
  const outer = policy.moveAnchor({x: 3744, y: 20}, {dx: 12, dy: 0}, areaAt);
  assert.deepEqual(outer, {x: 3744, y: 20});
  assert.deepEqual(policy.moveAnchor(outer, {dx: -12, dy: 0}, areaAt), {x: 3732, y: 20});
});

test('only the exact local renderer main frame can invoke privileged IPC', () => {
  assert.equal(typeof policy.trustedSender, 'function');
  const mainFrame = {url: 'file:///C:/app/index.html'};
  const owner = {mainFrame};
  assert.equal(policy.trustedSender({sender: owner, senderFrame: mainFrame}, owner, mainFrame.url), true);
  for (const event of [{sender: {}, senderFrame: mainFrame}, {sender: owner, senderFrame: {url: mainFrame.url}}, {sender: owner, senderFrame: null}]) {
    assert.equal(policy.trustedSender(event, owner, mainFrame.url), false);
  }
  mainFrame.url += '?injected=1';
  assert.equal(policy.trustedSender({sender: owner, senderFrame: mainFrame}, owner, 'file:///C:/app/index.html'), false);
});

test('companion actions reject arbitrary routes, launches, extra properties and malformed values', () => {
  assert.equal(typeof policy.actionRequest, 'function');
  assert.deepEqual(policy.actionRequest('poke', {id: 'bot-1'}), {route: '/admin/profile/check-work', body: {id: 'bot-1'}});
  assert.deepEqual(policy.actionRequest('pickup', {paused: false}), {route: '/admin/pickup', body: {paused: false}});
  for (const [name, body] of [['/admin/shutdown', {}], ['launch', {}], ['poke', {id: ''}], ['poke', {id: 'a', route: '/admin/shutdown'}], ['pickup', {paused: 'false'}]]) {
    assert.throws(() => policy.actionRequest(name, body));
  }
  assert.deepEqual(policy.actionRequest('task-sticky',{id:'task',expectedRevision:4,stickyMode:'on'}),{route:'/admin/task/sticky',body:{id:'task',expectedRevision:4,stickyMode:'on'}});
  assert.deepEqual(policy.actionRequest('family-sticky',{taskId:'task',expectedRevision:4,sticky:null,clearPreference:true}),{route:'/admin/family/sticky',body:{taskId:'task',expectedRevision:4,sticky:null,clearPreference:true}});
  assert.throws(()=>policy.actionRequest('family-sticky',{taskId:'task',expectedRevision:4,sticky:true,route:'/admin/shutdown'}));
  assert.equal(policy.utilityKind('recovery'),'recovery');assert.equal(policy.utilityKind('ai-sync'),'ai-sync');assert.throws(()=>policy.utilityKind('https://evil.test'));
});

test('external pages use fixed loopback routes and encode task IDs', () => {
  assert.equal(typeof policy.pageUrl, 'function');
  const credentials = {origin: 'http://127.0.0.1:43822', adminKey: 'secret', pairingKey: 'paired'};
  assert.equal(policy.pageUrl('board', 'task&new=1', credentials), 'http://127.0.0.1:43822/board/#admin=secret&task=task%26new%3D1');
  assert.equal(policy.pageUrl('new-task', undefined, credentials), 'http://127.0.0.1:43822/board/#admin=secret&new=1');
  assert.equal(policy.pageUrl('settings', undefined, credentials), 'http://127.0.0.1:43822/setup/#admin=secret');
  assert.equal(policy.pageUrl('ranch', undefined, credentials), 'http://127.0.0.1:43822/ui/#pair=paired');
  assert.throws(() => policy.pageUrl('https://evil.test', undefined, credentials));
  assert.throws(() => policy.pageUrl('settings', 'ignored', credentials));
});

test('window commands constrain native changes to valid bounded inputs', () => {
  assert.equal(typeof policy.windowRequest, 'function');
  assert.deepEqual(policy.windowRequest('move', {dx: -20, dy: 15.5}), {action: 'move', value: {dx: -20, dy: 16}});
  assert.deepEqual(policy.windowRequest('pin', false), {action: 'pin', value: false});
  for (const [name, value] of [['quit'], ['expand', 1], ['move', {dx: Infinity, dy: 0}], ['move', {dx: 1001, dy: 0}], ['hide', true]]) assert.throws(() => policy.windowRequest(name, value));
});

test('saved positions reject malformed input and credential redaction is recursive', () => {
  assert.equal(typeof policy.preferences, 'function');
  assert.deepEqual(policy.preferences({x: -1200, y: 80, pinned: false}), {x: -1200, y: 80, pinned: false, mode:'icue',length:'short'});
  assert.deepEqual(policy.preferences({x: '1', y: 80, pinned: 'false'}), {pinned: true, mode:'icue',length:'short'});
  assert.deepEqual(policy.redact({task: {note: 'the secret and paired'}, adminKey: 'secret'}, ['secret', 'paired']), {task: {note: 'the [redacted] and [redacted]'}, adminKey: '[redacted]'});
});

test('display modes are explicit and saved app geometry remains bounded',()=>{
 assert.deepEqual(policy.windowRequest('mode','app'),{action:'mode',value:'app'});
 assert.deepEqual(policy.windowRequest('mode','icue'),{action:'mode',value:'icue'});
 assert.throws(()=>policy.windowRequest('mode','https://example.com'));
 assert.equal(policy.preferences({mode:'app'}).mode,'app');
 assert.equal(policy.preferences({mode:'invalid'}).mode,'icue');
 const bounds=policy.ranchPlacement({x:99999,y:99999,width:99999,height:99999},{x:-1280,y:0,width:1280,height:720});
 assert.deepEqual(bounds,{x:-1280,y:0,width:1280,height:720});
});
