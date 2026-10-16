import { previewChanges, applyChanges } from './board-changes.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readPmSkill } from './pm-skill.mjs';

const catalog = JSON.parse(fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'agent-catalog.json'), 'utf8'));

const routeNames = new Set(['/admin/ai/catalog','/admin/ai/skill','/admin/ai/snapshot','/admin/ai/preview','/admin/ai/apply','/admin/ai/access','/admin/ai/history','/admin/ai/operate','/admin/ai/context','/admin/ai/family']);
const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const statusFor = error => error?.code === 'conflict' ? 409 : error?.code === 'permission' ? 403 : 400;
const profileFields = ['id','nickname','revision','folder','design','color','active','slot','autoPickup','preferredModel','readOnly','role','contextPolicy','personality','instructionsPath','busy','activityBusy','status','state','label','workCheckSupported','workCheckPending','lastSeen'];
const pick = (value, fields) => Object.fromEntries(fields.filter(key => Object.hasOwn(value, key)).map(key => [key, structuredClone(value[key])]));

/** Shared closed request validation for the CLI and authenticated API. */
export function validateOperateRequest(body) {
  if (!isObject(body) || typeof body.action !== 'string' || !Object.hasOwn(catalog.operateActions, body.action)) throw Error('Unsupported operate action.');
  const required = catalog.operateActions[body.action].required;
  const allowed=[...required,...(catalog.operateActions[body.action].optional||[])];
  if (required.some(key=>!Object.hasOwn(body,key)) || Object.keys(body).some(key => !allowed.includes(key))) throw Error('Operate request contains unsupported or missing fields.');
  if (!['ring','wake'].includes(body.action) && (typeof body.taskId !== 'string' || !body.taskId.trim() || !Number.isSafeInteger(body.expectedRevision) || body.expectedRevision < 0)) throw Error('Operate request requires a task ID and nonnegative safe integer revision.');
  if (body.action === 'start' && (typeof body.profileId !== 'string' || !body.profileId.trim())) throw Error('Start requires a saved profile ID.');
  if (body.action === 'follow-up' && (typeof body.note !== 'string' || !body.note.trim() || body.note.length > 4000)) throw Error('Add a follow-up instruction of 1–4000 characters.');
  if(body.contextRevision!==undefined&&(typeof body.contextRevision!=='string'||!/^([a-f0-9]{64})$/.test(body.contextRevision)))throw Error('Context revision must be the preview fingerprint.');
  return structuredClone(body);
}

/**
 * Construct the restricted AI API route handler. Call only after the companion's existing
 * admin bearer authentication and origin check have succeeded.
 *
 * `persistTransaction` must call the manager's atomic authoritative commit hook.
 * `setAccess` and `operate` are native host integrations, never catalog-exposed routes.
 */
export function createAgentApi({ manager, persistTransaction, setAccess, operate, getAccess = () => manager?.aiState?.access || 'inspect', now = Date.now }) {
  if (!manager) throw new TypeError('A live companion manager is required.');
  const previews = new Map();

  const rawSnapshot = () => {
    const view = manager.view();
    return {
      taskRevision: manager.taskRevision,
      tasks: structuredClone(manager.tasks),
      profiles: (view.profiles || []).map(profile => ({ ...pick(profile, profileFields), workCheckResult: isObject(profile.workCheckResult) ? pick(profile.workCheckResult, ['status','message']) : null })),
      roles: (view.roles || []).map(role => pick(role, ['id','name','model','instructionsPath','error'])),
      updates: (view.updates || []).map(update => pick(update, ['id','profileId','taskId','text','kind','at'])),
      pickupPaused: view.pickupPaused === true,
      contextFamilies: structuredClone(manager.aiState?.contextFamilies || {}),
      familyPolicies: structuredClone(manager.aiState?.familyPolicies || manager.familyPolicies || {}),
      access: getAccess(),
    };
  };
  const snapshot = () => {
    const result = rawSnapshot();
    return { ...result, contextFamilies:Object.values(result.contextFamilies).map(({handovers,...family})=>({...family,handovers:handovers.map(({summary,sources,...h})=>({...h,sourceCount:sources?.length||0,characters:summary?.length||0}))})), tasks: manager.tasks.map(task => manager.publicTask ? manager.publicTask(task) : structuredClone(task)) };
  };
  const applyAccess = () => ({ access: getAccess(), allowed: ['inspect','organize','operate'] });

  async function handle({ method, url, body }) {
    try {
      if (!routeNames.has(url)) return { status: 404, body: { error: 'Not found.' } };
      const access = getAccess();
      if (!['inspect','organize','operate'].includes(access)) return { status: 503, body: { error: 'AI Sync access state is invalid. Restore inspect access in Settings.' } };
      if (method === 'GET' && url === '/admin/ai/catalog') return { status: 200, body: catalog };
      if (method === 'GET' && url === '/admin/ai/skill') return { status: 200, body: readPmSkill() };
      if (method === 'GET' && url === '/admin/ai/access') return { status: 200, body: applyAccess() };
      if (method === 'GET' && url === '/admin/ai/snapshot') return { status: 200, body: snapshot() };
      if (method === 'GET' && url === '/admin/ai/history') {
        const state = manager.aiState || {};
        return { status: 200, body: { audit: structuredClone(state.audit || []), receipts: Object.values(state.receipts || {}) } };
      }
      if (method !== 'POST' || !isObject(body)) return { status: 400, body: { error: 'Expected a JSON object.' } };
      if(url==='/admin/ai/context'){
        if(Object.keys(body).some(k=>!['taskId','expectedTaskRevision','profileId'].includes(k))||typeof body.taskId!=='string'||!Number.isSafeInteger(body.expectedTaskRevision))throw Error('Context preview requires taskId and expectedTaskRevision; profileId is optional.');
        return {status:200,body:manager.previewTaskContext(body)};
      }
      if(url==='/admin/ai/family'){
        if(Object.keys(body).some(k=>!['familyId'].includes(k))||typeof body.familyId!=='string')throw Error('Family inspection requires familyId only.');
        return {status:200,body:manager.inspectFamily(body)};
      }
      if (url === '/admin/ai/access') {
        if (typeof body.access !== 'string' || Object.keys(body).length !== 1 || !['inspect','organize','operate'].includes(body.access)) return { status: 400, body: { error: 'Choose inspect, organize, or operate.' } };
        if (typeof setAccess !== 'function') return { status: 403, body: { error: 'Access mode can only be changed in the native AI Sync window.' } };
        return { status: 200, body: await setAccess(body.access) };
      }
      if (url === '/admin/ai/preview') {
        if (Object.keys(body).some(key => !['changeSetId','actor','operations','expectedTaskRevision'].includes(key)) || Object.keys(body).length !== 4) return { status: 400, body: { error: 'Preview requires changeSetId, actor, operations, and expectedTaskRevision only.' } };
        if (manager.aiState?.receipts && Object.hasOwn(manager.aiState.receipts, body.changeSetId)) return { status: 409, body: { error: 'This change-set ID already has a receipt. Use a new ID for a changed proposal.' } };
        const plan = previewChanges({ snapshot: rawSnapshot(), changeSetId: body.changeSetId, actor: body.actor, operations: body.operations, expectedTaskRevision: body.expectedTaskRevision, now });
        if (previews.size >= 50) previews.delete(previews.keys().next().value);
        previews.set(plan.id, plan);
        const { stagedTasks, stagedFamilyPolicies, stagedTaskRevision, stagedContextFamilies, ...safePlan } = plan;
        return { status: 200, body: safePlan };
      }
      if (url === '/admin/ai/apply') {
        if (access !== 'organize' && access !== 'operate') return { status: 403, body: { error: 'Inspect access can preview changes but cannot apply them.' } };
        if (Object.keys(body).some(key => !['changeSetId','expectedTaskRevision'].includes(key)) || typeof body.changeSetId !== 'string' || (body.expectedTaskRevision !== undefined && !Number.isSafeInteger(body.expectedTaskRevision))) return { status: 400, body: { error: 'Apply requires a changeSetId and, optionally, expectedTaskRevision.' } };
        const state = manager.aiState || { access, audit: [], receipts: {} };
        const prior = state.receipts?.[body.changeSetId];
        if (prior) return { status: 200, body: structuredClone(prior) };
        const plan = previews.get(body.changeSetId);
        if (!plan) return { status: 409, body: { error: 'Preview expired or unknown. Preview this change set again.' } };
        const expectedTaskRevision = body.expectedTaskRevision ?? plan.expectedTaskRevision;
        const receipt = await applyChanges({ snapshot: { ...rawSnapshot(), aiState: state }, preview: plan, expectedTaskRevision, aiState: state, persistTransaction, now });
        previews.delete(body.changeSetId);
        return { status: 200, body: receipt };
      }
      if (url === '/admin/ai/operate') {
        if (access !== 'operate') return { status: 403, body: { error: 'Operate access is required for this action.' } };
        if (typeof operate !== 'function') throw Error('Operate actions are unavailable.');
        const action = validateOperateRequest(body);
        if (action.action === 'accept' && manager.tasks.find(task => task.id === action.taskId)?.humanReview !== false) throw Object.assign(Error('Human-review tasks require acceptance by a human in the Board.'), { code: 'permission' });
        return { status: 200, body: await operate(action.action, action) };
      }
      return { status: 404, body: { error: 'Not found.' } };
    } catch (error) {
      return { status: statusFor(error), body: { error: String(error?.message || 'AI Sync request failed.').replace(/[\u0000-\u001f\u007f-\u009f]/g, ' ').slice(0, 700), ...(error?.code === 'conflict' ? { code: 'conflict' } : {}) } };
    }
  }
  return Object.freeze({ handle, catalog, routes: [...routeNames] });
}
