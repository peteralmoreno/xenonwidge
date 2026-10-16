'use strict';

const COLLAPSED = Object.freeze({width: 96, height: 390});
const EXPANDED = Object.freeze({width: 500, height: 560});
const clamp = (n, min, max) => Math.round(Math.max(min, Math.min(n, max)));

// Electron screen work areas and BrowserWindow bounds both use device-independent pixels.
function clampAnchor(anchor, area) {
  const width = Math.min(COLLAPSED.width, area.width);
  const height = Math.min(COLLAPSED.height, area.height);
  return {
    x: clamp(Number.isFinite(anchor.x) ? anchor.x : area.x + area.width - width - 20, area.x, area.x + area.width - width),
    y: clamp(Number.isFinite(anchor.y) ? anchor.y : area.y + 20, area.y, area.y + area.height - height),
  };
}

function placement(anchor, area, expanded, length = 'short', panelSize = EXPANDED) {
  const pos = clampAnchor(anchor, area);
  const leftSpace = pos.x - area.x;
  const rightSpace = area.x + area.width - pos.x - COLLAPSED.width;
  const side = rightSpace >= leftSpace ? 'right' : 'left';
  const size = expanded ? {width:clamp(panelSize.width || EXPANDED.width,500,2400),height:clamp(panelSize.height || EXPANDED.height,480,2400)} : COLLAPSED;
  const width = Math.min(size.width, area.width);
  const height = length === 'long' ? area.height : Math.min(size.height, area.height);
  const x = expanded && side === 'left' ? pos.x - (width - COLLAPSED.width) : pos.x;
  return {x: clamp(x, area.x, area.x + area.width - width), y: clamp(pos.y, area.y, area.y + area.height - height), width, height, side};
}

function moveAnchor(anchor, delta, areaAt) {
  const candidate = {x: anchor.x + delta.dx, y: anchor.y + delta.dy};
  // Probe the leading rail edge so small drags can cross a display seam before
  // clamping. Clamp the returned anchor immediately to avoid outer-edge debt.
  const probe = {
    x: Math.round(candidate.x + (delta.dx > 0 ? COLLAPSED.width - 1 : delta.dx < 0 ? 0 : COLLAPSED.width / 2)),
    y: Math.round(candidate.y + (delta.dy > 0 ? COLLAPSED.height - 1 : delta.dy < 0 ? 0 : 40)),
  };
  return clampAnchor(candidate, areaAt(probe));
}

function trustedSender(event, owner, rendererUrl) {
  return !!owner && event.sender === owner && !!event.senderFrame && event.senderFrame === owner.mainFrame && event.senderFrame.url === rendererUrl;
}

function objectWithKeys(value, keys) {
  return value !== null && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
}
function validId(value) { return typeof value === 'string' && value.length > 0 && value.length <= 256 && !/[\u0000-\u001f\u007f]/.test(value); }
const revision = value => Number.isSafeInteger(value) && value >= 0;
function fields(body, required, optional = []) {
  return body && typeof body === 'object' && !Array.isArray(body) && required.every(k=>Object.hasOwn(body,k)) && Object.keys(body).every(k=>[...required,...optional].includes(k));
}
function actionRequest(name, body) {
  if (name === 'poke' && objectWithKeys(body, ['id']) && validId(body.id)) return {route: '/admin/profile/check-work', body: {id: body.id}};
  if (name === 'pickup' && objectWithKeys(body, ['paused']) && typeof body.paused === 'boolean') return {route: '/admin/pickup', body: {paused: body.paused}};
  if (name === 'ring-all' && objectWithKeys(body, [])) return {route:'/admin/profile/ring-all',body:{}};
  if (['session','focus','clean'].includes(name) && objectWithKeys(body,['id']) && validId(body.id)) return name==='clean'?{route:'/admin/profile/clean',body}:{route:'/admin/action',body:{id:body.id,action:name==='session'?'resume':'focus'}};
  if (name==='membership' && objectWithKeys(body,['id','active','expectedRevision']) && validId(body.id) && typeof body.active==='boolean' && revision(body.expectedRevision)) return {route:'/admin/membership',body};
  if (name==='factory' && fields(body,['nickname','folder','role','color'],['design','personality','contextPolicy','instructionsPath','autoPickup','readOnly']) && typeof body.nickname==='string' && body.nickname.trim() && body.nickname.length<=32 && typeof body.folder==='string' && validId(body.role) && Number.isInteger(body.color) && body.color>=0 && body.color<32) return {route:'/admin/profile',body:{...body,active:false}};
  if (name==='queue' && objectWithKeys(body,['id','profileId','beforeTaskId','expectedRevision','expectedQueueRevision']) && validId(body.id) && (body.profileId===null||validId(body.profileId)) && (body.beforeTaskId===null||validId(body.beforeTaskId)) && revision(body.expectedRevision) && revision(body.expectedQueueRevision)) return {route:'/admin/task/queue',body};
  if (name==='task-save' && fields(body,['title','instructions','projectFolder','expectedRevision'],['id','acceptanceCriteria','reasoningRequest','modelEligibility','humanReview','family','releasedForPickup','dependsOn','stickyMode','pipeOnly']) && (body.id===undefined||validId(body.id)) && revision(body.expectedRevision) && typeof body.title==='string' && body.title.length<=120 && typeof body.instructions==='string' && body.instructions.length<=12000 && typeof body.projectFolder==='string' && (body.pipeOnly===undefined||typeof body.pipeOnly==='boolean') && (body.humanReview===undefined||typeof body.humanReview==='boolean') && (body.stickyMode===undefined||['inherit','on','off'].includes(body.stickyMode))) return {route:'/admin/task',body};
  if (name==='task-start' && objectWithKeys(body,['taskId','profileId','expectedRevision']) && validId(body.taskId) && validId(body.profileId) && revision(body.expectedRevision)) return {route:'/admin/task/start',body};
  if (name==='task-sticky' && objectWithKeys(body,['id','expectedRevision','stickyMode']) && validId(body.id) && revision(body.expectedRevision) && ['inherit','on','off'].includes(body.stickyMode)) return {route:'/admin/task/sticky',body};
  if (name==='family-sticky' && fields(body,['taskId','expectedRevision','sticky'],['clearPreference']) && validId(body.taskId) && revision(body.expectedRevision) && (typeof body.sticky==='boolean'||body.sticky===null) && (body.clearPreference===undefined||typeof body.clearPreference==='boolean')) return {route:'/admin/family/sticky',body};
  if (name==='task-review' && fields(body,['id','expectedRevision','action'],['note']) && validId(body.id) && revision(body.expectedRevision) && ['accept','follow-up'].includes(body.action) && (body.note===undefined||typeof body.note==='string'&&body.note.length<=4000)) return {route:'/admin/task/review',body};
  if (name==='task-archive' && objectWithKeys(body,['id','expectedRevision']) && validId(body.id) && revision(body.expectedRevision)) return {route:'/admin/task/archive',body};
  throw Error('Unsupported dock action.');
}
function pageUrl(page, taskId, {origin, adminKey, pairingKey}) {
  if (taskId !== undefined && (page !== 'board' || !validId(taskId))) throw Error('Unsupported page.');
  const admin = encodeURIComponent(adminKey);
  if (page === 'board') return `${origin}/board/#admin=${admin}${taskId === undefined ? '' : '&task=' + encodeURIComponent(taskId)}`;
  if (page === 'new-task') return `${origin}/board/#admin=${admin}&new=1`;
  if (page === 'settings') return `${origin}/setup/#admin=${admin}`;
  if (page === 'ranch') return `${origin}/ui/#pair=${encodeURIComponent(pairingKey)}`;
  throw Error('Unsupported page.');
}
function windowRequest(action, value) {
  if (action === 'resize' && objectWithKeys(value,['width','height']) && [value.width,value.height].every(n=>Number.isFinite(n)&&n>0&&n<=10000)) return {action,value:{width:Math.round(value.width),height:Math.round(value.height)}};
  if (action === 'length' && ['short','long'].includes(value)) return {action,value};
  if (action === 'mode' && ['icue', 'app'].includes(value)) return {action, value};
  if (['info', 'hide', 'reset'].includes(action) && value === undefined) return {action};
  if (['expand', 'pin'].includes(action) && typeof value === 'boolean') return {action, value};
  if (action === 'move' && objectWithKeys(value, ['dx', 'dy']) && [value.dx, value.dy].every(n => Number.isFinite(n) && Math.abs(n) <= 1000)) return {action, value: {dx: Math.round(value.dx), dy: Math.round(value.dy)}};
  throw Error('Unsupported window action.');
}
function utilityKind(value){if(value==='recovery'||value==='ai-sync')return value;throw Error('Unsupported utility.');}
function preferences(value) {
  const result = {pinned: typeof value?.pinned === 'boolean' ? value.pinned : true, mode: value?.mode === 'app' ? 'app' : 'icue', length:value?.length==='long'?'long':'short'};
  if (Number.isFinite(value?.x) && Number.isFinite(value?.y)) Object.assign(result, {x: Math.round(value.x), y: Math.round(value.y)});
  if (value?.panelSize && [value.panelSize.width,value.panelSize.height].every(n=>Number.isFinite(n)&&n>0)) result.panelSize={width:clamp(value.panelSize.width,500,2400),height:clamp(value.panelSize.height,480,2400)};
  if (value?.ranchBounds && ['x','y','width','height'].every(k=>Number.isFinite(value.ranchBounds[k]))) result.ranchBounds = Object.fromEntries(['x','y','width','height'].map(k=>[k,Math.round(value.ranchBounds[k])]));
  return result;
}
function ranchPlacement(saved, area) {
  const width = clamp(Number.isFinite(saved?.width) ? saved.width : 1400, Math.min(680,area.width), area.width);
  const height = clamp(Number.isFinite(saved?.height) ? saved.height : 800, Math.min(420,area.height), area.height);
  return {x:clamp(Number.isFinite(saved?.x)?saved.x:area.x+(area.width-width)/2,area.x,area.x+area.width-width),y:clamp(Number.isFinite(saved?.y)?saved.y:area.y+(area.height-height)/2,area.y,area.y+area.height-height),width,height};
}
function redact(value, secrets) {
  if (typeof value === 'string') return secrets.filter(Boolean).reduce((text, secret) => text.split(secret).join('[redacted]'), value);
  if (Array.isArray(value)) return value.map(item => redact(item, secrets));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [redact(key, secrets), redact(item, secrets)]));
  return value;
}

module.exports = {COLLAPSED, EXPANDED, clampAnchor, placement, moveAnchor, trustedSender, actionRequest, pageUrl, windowRequest, utilityKind, preferences, ranchPlacement, redact};
