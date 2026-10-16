import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { familyKey } from './pickup-policy.mjs';
import {normalizeFamily,ensureFamilies,validateContextRefs,sourceReport,updateFamilyPresentation} from './task-context.mjs';

const ACTIVE = new Set(['dispatching','awaiting-runtime','claimed','running','unresolved']);
const TASK_FIELDS = new Set(['title','instructions','acceptanceCriteria','workStation','reasoningRequest','modelEligibility','humanReview','pipeOnly','family','dependsOn','stickyMode']);
const PALETTE = new Set(['mint','cyan','lavender','rose','amber','lime']);
const MAX_OPERATIONS = 200;
const MAX_BYTES = 128 * 1024;

function fail(message, code = 'invalid') { throw Object.assign(new Error(message), { code }); }
function object(value) { return value !== null && typeof value === 'object' && !Array.isArray(value); }
function exactKeys(value, required, optional = []) {
  if (!object(value)) return false;
  const allowed = new Set([...required, ...optional]);
  return required.every(key => Object.hasOwn(value, key)) && Object.keys(value).every(key => allowed.has(key));
}
function clone(value) { return structuredClone(value); }
function safeTask(task) {
  const projected = clone(task);
  projected.attempts = (projected.attempts || []).map(({ dispatchTokenHash, roleInstructions, taskInput, contextSnapshot, claimClientId, ...attempt }) => attempt);
  return projected;
}
function cleanText(value, name, max, required = false) {
  if (typeof value !== 'string' || value.length > max || (required && !value.trim())) fail(`${name} must be ${required ? '1' : '0'}–${max} characters.`);
  return value;
}
function taskHasActiveWork(task) {
  return task.status === 'doing' || ACTIVE.has(task.status) || (task.attempts || []).some(attempt => ACTIVE.has(attempt.state));
}
function validateFamily(family) {
  if (family === null) return null;
  if (!object(family) || Object.keys(family).some(key => !['id','name','color'].includes(key)) || typeof family.name !== 'string' || !family.name.trim() || family.name.trim().length > 40 || !PALETTE.has(family.color)) fail('Family needs a name of 1–40 characters and a supported color.');
  return { ...(family.id?{id:family.id}:{}), name: family.name.trim(), color: family.color };
}
function canonicalProject(folder) {
  if (typeof folder !== 'string' || !path.isAbsolute(folder)) fail('Choose an existing absolute project workspace.');
  let real;
  try { real = fs.realpathSync(folder); if (!fs.statSync(real).isDirectory()) fail('Choose an existing absolute project workspace.'); }
  catch (error) { if (error.code === 'invalid') throw error; fail('Choose an existing absolute project workspace.'); }
  return real;
}
function validateDeps(id, dependencies, tasks) {
  if (!Array.isArray(dependencies) || dependencies.length > 100 || dependencies.some(dep => typeof dep !== 'string') || new Set(dependencies).size !== dependencies.length || dependencies.includes(id)) fail('Dependencies must be unique task IDs and cannot include the task itself.');
  const ids = new Set(tasks.map(task => task.id));
  if (dependencies.some(dep => !ids.has(dep))) fail('Every dependency must refer to an existing task.');
  const graph = new Map(tasks.map(task => [task.id, task.id === id ? dependencies : task.dependsOn || []]));
  const visiting = new Set(), visited = new Set();
  const walk = node => {
    if (visiting.has(node)) return false;
    if (visited.has(node)) return true;
    visiting.add(node);
    for (const next of graph.get(node) || []) if (graph.has(next) && !walk(next)) return false;
    visiting.delete(node); visited.add(node); return true;
  };
  for (const node of graph.keys()) if (!walk(node)) fail('Dependencies cannot contain a cycle.');
  return [...dependencies];
}
function publicPlanState(snapshot) {
  return {
    taskRevision: snapshot.taskRevision,
    tasks: (snapshot.tasks || []).map(safeTask),
    familyPolicies: clone(snapshot.familyPolicies || {}),
    contextFamilies: clone(snapshot.contextFamilies || {}),
  };
}
function validateBase({ snapshot, changeSetId, actor, operations, expectedTaskRevision }) {
  if (!object(snapshot) || !Array.isArray(snapshot.tasks) || !Array.isArray(snapshot.profiles)) fail('Board snapshot is unavailable.');
  if (!Number.isSafeInteger(snapshot.taskRevision) || !Number.isSafeInteger(expectedTaskRevision) || expectedTaskRevision !== snapshot.taskRevision) fail('Conflict: Board revision changed. Reload the Board before previewing.', 'conflict');
  if (typeof changeSetId !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,119}$/.test(changeSetId)) fail('Change-set ID must contain 1–120 safe characters.');
  if (typeof actor !== 'string' || !actor.trim() || actor.length > 80) fail('Actor label must contain 1–80 characters.');
  if (!Array.isArray(operations) || operations.length < 1 || operations.length > MAX_OPERATIONS || Buffer.byteLength(JSON.stringify(operations), 'utf8') > MAX_BYTES) fail(`A change set must contain 1–${MAX_OPERATIONS} operations and stay under ${MAX_BYTES} bytes.`);
}
function activeTaskOrThrow(task) {
  if (taskHasActiveWork(task)) fail('Cannot edit an active or unresolved task.');
  if (task.status !== 'todo') fail('Only pending tasks can be organized.');
}
function getTask(tasks, id) { const task = tasks.find(item => item.id === id); if (!task || task.archived) fail('Unknown or archived task.'); return task; }
function revisionForTask(task, expectedRevision) { if (!Number.isSafeInteger(expectedRevision) || task.revision !== expectedRevision) fail('Conflict: task revision changed. Reload the Board before previewing.', 'conflict'); }
function nextOrder(tasks, profileId) { return Math.max(-1, ...tasks.filter(task => !task.archived && task.assignedProfileId === profileId).map(task => task.queueOrder ?? 0)) + 1; }

/**
 * Build a complete staged Board sweep. This function does not mutate the supplied snapshot.
 * Every operation is validated before a preview is returned.
 */
export function previewChanges({ snapshot, changeSetId, actor, operations, expectedTaskRevision, now = Date.now, idFactory = randomUUID }) {
  validateBase({ snapshot, changeSetId, actor, operations, expectedTaskRevision });
  const internalBefore = { taskRevision: snapshot.taskRevision, tasks: clone(snapshot.tasks || []), familyPolicies: clone(snapshot.familyPolicies || {}), contextFamilies: clone(snapshot.contextFamilies || {}) };
  ensureFamilies(internalBefore.tasks,internalBefore.contextFamilies);
  const before = publicPlanState(internalBefore), staged = clone(internalBefore), original = clone(internalBefore);
  const profiles = snapshot.profiles;
  const taskChanges = new Set();
  const touched = new Set();
  for (const operation of operations) {
    if (!object(operation) || typeof operation.type !== 'string') fail('Every operation must have a supported type.');
    if (operation.type === 'task.create') {
      if (!exactKeys(operation, ['type','title','projectFolder','instructions'], ['acceptanceCriteria','workStation','reasoningRequest','modelEligibility','humanReview','pipeOnly','family','dependsOn','assignedProfileId','stickyMode'])) fail('Unsupported task.create fields.');
      const title = cleanText(operation.title, 'Task title', 120, true).trim();
      const instructions = cleanText(operation.instructions, 'Task instructions', 12000);
      const acceptanceCriteria = cleanText(operation.acceptanceCriteria ?? '', 'Acceptance criteria', 4000);
      const workStation=operation.workStation===undefined?'auto':operation.workStation;if(!['auto','reading','researching','writing','workshop'].includes(workStation))fail('Choose a supported task station.');
      const reasoningRequest = operation.reasoningRequest ?? 'auto'; if (!['auto','low','medium','high'].includes(reasoningRequest)) fail('Choose a supported reasoning request.');
      const modelEligibility = operation.modelEligibility ?? []; if (!Array.isArray(modelEligibility) || modelEligibility.some(model => !['gpt','deepseek','claude'].includes(model))) fail('Choose only supported model families.');
      const pipeOnly = operation.pipeOnly === undefined ? false : operation.pipeOnly; if (typeof pipeOnly !== 'boolean') fail('Pipe-only must be true or false.');
      const humanReview = operation.humanReview ?? false; if (typeof humanReview !== 'boolean') fail('Human review must be true or false.');
      const family = operation.family === undefined ? null : validateFamily(operation.family);
      const assignedProfileId = operation.assignedProfileId ?? null;
      if (assignedProfileId !== null && !profiles.some(profile => profile.id === assignedProfileId)) fail('Choose a saved bot profile.');
      const id = idFactory(); if (staged.tasks.some(task => task.id === id)) fail('Could not allocate a unique task ID.');
      const projectFolder = canonicalProject(operation.projectFolder), dependencies = operation.dependsOn ?? [];
      const task = { id, revision: 0, createdAt: now(), updatedAt: now(), queueOrder: nextOrder(staged.tasks, assignedProfileId), dependsOn: [], title, projectFolder, instructions, acceptanceCriteria, status: 'todo', assignedProfileId, releasedForPickup: false, workStation, reasoningRequest, modelEligibility: [...modelEligibility], humanReview, pipeOnly, family, archived: false, attempts: [], resultSummary: '', evidence: [], ...(operation.stickyMode === undefined ? {} : { stickyMode: operation.stickyMode }) };
      if (operation.stickyMode !== undefined && !['inherit','on','off'].includes(operation.stickyMode)) fail('Sticky mode must be inherit, on, or off.');
      task.dependsOn = validateDeps(id, dependencies, [...staged.tasks, task]);
      task.family=normalizeFamily(family,projectFolder,staged.tasks);
      for(const id of updateFamilyPresentation(task.family,projectFolder,staged.tasks,staged.contextFamilies)){taskChanges.add(id);staged.tasks.find(item=>item.id===id).updatedAt=now();}
      staged.tasks.push(task); taskChanges.add(id); touched.add(id); continue;
    }
    if (operation.type === 'task.update') {
      if (!exactKeys(operation, ['type','id','expectedRevision','changes'])) fail('Unsupported task.update fields.');
      if (!object(operation.changes) || !Object.keys(operation.changes).length || Object.keys(operation.changes).some(key => !TASK_FIELDS.has(key))) fail('Task changes contain an unsupported field.');
      const task = getTask(staged.tasks, operation.id); activeTaskOrThrow(task); revisionForTask(getTask(original.tasks, operation.id), operation.expectedRevision);
      const changes = operation.changes;
      if (Object.hasOwn(changes, 'title')) task.title = cleanText(changes.title, 'Task title', 120, true).trim();
      if (Object.hasOwn(changes, 'instructions')) task.instructions = cleanText(changes.instructions, 'Task instructions', 12000);
      if (Object.hasOwn(changes, 'acceptanceCriteria')) task.acceptanceCriteria = cleanText(changes.acceptanceCriteria, 'Acceptance criteria', 4000);
      if(Object.hasOwn(changes,'workStation')){if(!['auto','reading','researching','writing','workshop'].includes(changes.workStation))fail('Choose a supported task station.');task.workStation=changes.workStation;}
      if (Object.hasOwn(changes, 'reasoningRequest')) { if (!['auto','low','medium','high'].includes(changes.reasoningRequest)) fail('Choose a supported reasoning request.'); task.reasoningRequest = changes.reasoningRequest; }
      if (Object.hasOwn(changes, 'modelEligibility')) { if (!Array.isArray(changes.modelEligibility) || changes.modelEligibility.some(model => !['gpt','deepseek','claude'].includes(model))) fail('Choose only supported model families.'); task.modelEligibility = [...changes.modelEligibility]; }
      if (Object.hasOwn(changes, 'pipeOnly')) { if (typeof changes.pipeOnly !== 'boolean') fail('Pipe-only must be true or false.'); task.pipeOnly = changes.pipeOnly; }
      if (Object.hasOwn(changes, 'humanReview')) { if (typeof changes.humanReview !== 'boolean') fail('Human review must be true or false.'); task.humanReview = changes.humanReview; }
      if (Object.hasOwn(changes, 'family')) {task.family = normalizeFamily(validateFamily(changes.family),task.projectFolder,staged.tasks);for(const id of updateFamilyPresentation(task.family,task.projectFolder,staged.tasks,staged.contextFamilies)){taskChanges.add(id);staged.tasks.find(item=>item.id===id).updatedAt=now();}}
      if (Object.hasOwn(changes, 'dependsOn')) task.dependsOn = validateDeps(task.id, changes.dependsOn, staged.tasks);
      if (Object.hasOwn(changes, 'stickyMode')) { if (!['inherit','on','off'].includes(changes.stickyMode)) fail('Sticky mode must be inherit, on, or off.'); task.stickyMode = changes.stickyMode; }
      if (task.releasedForPickup && !task.instructions.trim()) fail('Add instructions before releasing work.');

      task.updatedAt = now(); taskChanges.add(task.id); touched.add(task.id); continue;
    }
    if (operation.type === 'task.assign') {
      if (!exactKeys(operation, ['type','id','expectedRevision','profileId'])) fail('Unsupported task.assign fields.');
      const task = getTask(staged.tasks, operation.id); activeTaskOrThrow(task); revisionForTask(getTask(original.tasks, operation.id), operation.expectedRevision);
      if (operation.profileId !== null && !profiles.some(profile => profile.id === operation.profileId)) fail('Choose a saved bot profile.');
      task.assignedProfileId = operation.profileId; task.queueOrder = nextOrder(staged.tasks.filter(item => item.id !== task.id), operation.profileId); task.updatedAt = now(); taskChanges.add(task.id); touched.add(task.id); continue;
    }
    if (operation.type === 'task.order') {
      if (!exactKeys(operation, ['type','id','expectedRevision','beforeTaskId'])) fail('Unsupported task.order fields.');
      const task = getTask(staged.tasks, operation.id); activeTaskOrThrow(task); revisionForTask(getTask(original.tasks, operation.id), operation.expectedRevision);
      if (operation.beforeTaskId !== null && typeof operation.beforeTaskId !== 'string') fail('beforeTaskId must be a task ID or null.');
      const lane = staged.tasks.filter(item => !item.archived && item.status === 'todo' && item.assignedProfileId === task.assignedProfileId && !taskHasActiveWork(item));
      const targetIndex = lane.findIndex(item => item.id === task.id); lane.splice(targetIndex, 1);
      const beforeIndex = operation.beforeTaskId === null ? lane.length : lane.findIndex(item => item.id === operation.beforeTaskId);
      if (beforeIndex < 0) fail('Queue target must be a pending task in the same assignment lane.');
      lane.splice(beforeIndex, 0, task); lane.forEach((item, index) => { if (item.queueOrder !== index) { item.queueOrder = index; item.updatedAt = now(); taskChanges.add(item.id); touched.add(item.id); } }); continue;
    }
    if (operation.type === 'task.attachContext') {
      if(!exactKeys(operation,['type','id','expectedRevision','references']))fail('Unsupported task.attachContext fields.');
      const task=getTask(staged.tasks,operation.id);activeTaskOrThrow(task);revisionForTask(getTask(original.tasks,operation.id),operation.expectedRevision);
      task.contextRefs=validateContextRefs(operation.references,task,staged.tasks);task.updatedAt=now();taskChanges.add(task.id);continue;
    }
    if(['family.preferBot','family.clearPreference','family.publishHandover','family.resetHandover'].includes(operation.type)){
      const extra=operation.type==='family.preferBot'?['profileId']:operation.type==='family.publishHandover'?['summary','sources']:[];
      if(!exactKeys(operation,['type','familyId','expectedRevision',...extra]))fail('Unsupported family operation fields.');
      ensureFamilies(staged.tasks,staged.contextFamilies);
      const entry=Object.entries(staged.contextFamilies).find(([,f])=>f.id===operation.familyId);if(!entry)fail('Unknown family.');const [key,family]=entry;
      if(!Number.isSafeInteger(operation.expectedRevision)||operation.expectedRevision!==family.revision)fail('Family revision changed.','conflict');
      if(operation.type==='family.preferBot'){
        if(!profiles.some(p=>p.id===operation.profileId))fail('Choose a saved bot profile.');
        staged.familyPolicies[key]={...(staged.familyPolicies[key]||{sticky:true}),preferredProfileId:operation.profileId,preferenceAt:now()};family.revision++;
      }else if(operation.type==='family.clearPreference'){
        staged.familyPolicies[key]={...(staged.familyPolicies[key]||{sticky:true}),preferredProfileId:null,preferenceAt:now()};family.revision++;
      }else{
        const summary=operation.type==='family.resetHandover'?'':cleanText(operation.summary,'Handover summary',4000,true);
        const references=operation.type==='family.resetHandover'?[]:validateContextRefs(operation.sources,{projectFolder:family.projectFolder},staged.tasks);
        family.handovers.push({revision:++family.revision,summary,author:actor,at:now(),kind:operation.type==='family.resetHandover'?'reset':'explicit-report',sources:references.map(ref=>({...sourceReport(getTask(staged.tasks,ref.taskId)),allowCrossProject:ref.allowCrossProject}))});
      }
      for(const task of staged.tasks.filter(t=>familyKey(t)===key&&!taskHasActiveWork(t))){taskChanges.add(task.id);task.updatedAt=now();}
      continue;
    }
    if (operation.type === 'family.setting') {
      if (!exactKeys(operation, ['type','key','sticky'])) fail('Unsupported family.setting fields.');
      if (typeof operation.key !== 'string' || !operation.key.trim() || operation.key.length > 512 || typeof operation.sticky !== 'boolean') fail('Family setting needs a valid key and boolean sticky value.');
      let pair;
      try { pair = JSON.parse(operation.key); } catch { fail('Family setting key must be the canonical family/project key.'); }
      if (!Array.isArray(pair) || pair.length !== 2 || typeof pair[0] !== 'string' || !pair[0] || typeof pair[1] !== 'string' || !pair[1] || (familyKey({ family: { name: pair[0] }, projectFolder: pair[1] }) !== operation.key && !staged.tasks.some(t=>familyKey(t)===operation.key))) fail('Family setting key must be the canonical family/project key.');
      staged.familyPolicies[operation.key] = { ...(staged.familyPolicies[operation.key] || {}), sticky: operation.sticky };
      if (JSON.stringify(staged.familyPolicies[operation.key]) !== JSON.stringify(original.familyPolicies[operation.key])) {
        const anchor = staged.tasks.find(task => familyKey(task) === operation.key);
        if (anchor) { anchor.updatedAt = now(); taskChanges.add(anchor.id); touched.add(anchor.id); }
      }
      continue;
    }
    fail('Unsupported operation type.');
  }
  if (!taskChanges.size && JSON.stringify(staged.familyPolicies) === JSON.stringify(original.familyPolicies) && JSON.stringify(staged.contextFamilies)===JSON.stringify(original.contextFamilies)) fail('The change set contains no changes.');
  for (const task of staged.tasks) {
    for (const dependency of task.dependsOn || []) if (!staged.tasks.some(item => item.id === dependency)) fail('Every dependency must refer to an existing task.');
    if (taskChanges.has(task.id)) task.evidence = [...(task.evidence || [])];
  }
  let revision = snapshot.taskRevision;
  for (const task of staged.tasks) if (taskChanges.has(task.id)) { task.revision = ++revision; task.updatedAt = task.updatedAt || now(); }
  ensureFamilies(staged.tasks,staged.contextFamilies);
  if (revision === snapshot.taskRevision && (JSON.stringify(staged.familyPolicies) !== JSON.stringify(original.familyPolicies)||JSON.stringify(staged.contextFamilies)!==JSON.stringify(original.contextFamilies))) revision++;
  staged.taskRevision = revision;
  const changed = staged.tasks.filter(task => taskChanges.has(task.id));
  const beforeTasks = original.tasks.filter(task => taskChanges.has(task.id));
  return {
    id: changeSetId, actor: actor.trim().replace(/[\u0000-\u001f\u007f]/g, ' ').slice(0, 80),
    expectedTaskRevision, createdAt: now(), operations: clone(operations),
    before: { ...before, tasks: beforeTasks.map(safeTask) }, after: { ...publicPlanState(staged), tasks: changed.map(safeTask) }, conflicts: [],
    stagedContextFamilies:staged.contextFamilies, stagedTasks: staged.tasks, stagedFamilyPolicies: staged.familyPolicies, stagedTaskRevision: staged.taskRevision,
  };
}

/** Persist a validated preview and publish its receipt only after the authoritative write succeeds. */
export async function applyChanges({ snapshot, preview, expectedTaskRevision, aiState, persistTransaction, now = Date.now }) {
  if (!object(snapshot) || !object(preview) || typeof preview.id !== 'string') fail('A valid preview is required.');
  if (preview.conflicts?.length) fail('Conflict: this preview contains unresolved conflicts.', 'conflict');
  const state = aiState || { access: 'inspect', audit: [], receipts: {} };
  const receipts = object(state.receipts) ? state.receipts : {};
  if (Object.hasOwn(receipts, preview.id)) return clone(receipts[preview.id]);
  if (state.access !== 'organize' && state.access !== 'operate') fail('AI Sync access mode does not allow applying Board changes.', 'permission');
  if (expectedTaskRevision !== snapshot.taskRevision || preview.expectedTaskRevision !== expectedTaskRevision) fail('Conflict: Board revision changed after preview. Preview the changes again.', 'conflict');
  if (!Number.isSafeInteger(preview.stagedTaskRevision) || !Array.isArray(preview.stagedTasks) || !object(preview.stagedFamilyPolicies) || typeof persistTransaction !== 'function') fail('The preview cannot be applied by this companion.');
  const appliedAt = now();
  const receipt = { receiptId: randomUUID(), changeSetId: preview.id, appliedAt, actor: preview.actor, expectedTaskRevision, taskRevision: preview.stagedTaskRevision, changes: clone(preview.after), exportWarnings: [] };
  const beforeById = new Map((preview.before.tasks || []).map(task => [task.id, task]));
  const changedFields = (preview.after.tasks || []).map(after => {
    const before = beforeById.get(after.id);
    const fields = before ? [...new Set([...Object.keys(before), ...Object.keys(after)])].filter(key => JSON.stringify(before[key]) !== JSON.stringify(after[key])) : Object.keys(after);
    return { taskId: after.id, fields };
  });
  if (JSON.stringify(preview.before.familyPolicies || {}) !== JSON.stringify(preview.after.familyPolicies || {})) changedFields.push({ familyPolicies: Object.keys(preview.after.familyPolicies || {}) });
  const auditEntry = { changeSetId: preview.id, receiptId: receipt.receiptId, actor: preview.actor, at: appliedAt, changedFields, before: clone(preview.before), after: clone(preview.after), operations: clone(preview.operations) };
  const nextState = { ...clone(state), contextFamilies:clone(preview.stagedContextFamilies||{}), familyPolicies: clone(preview.stagedFamilyPolicies), audit: [...(state.audit || []), auditEntry].slice(-100), receipts: { ...receipts, [preview.id]: receipt } };
  // The persistence callback must atomically write tasks, revision, audit and receipt before changing live memory.
  const persisted = await persistTransaction({ tasks: clone(preview.stagedTasks), taskRevision: preview.stagedTaskRevision, familyPolicies: clone(preview.stagedFamilyPolicies), aiState: nextState });
  if (Array.isArray(persisted?.exportWarnings)) receipt.exportWarnings = persisted.exportWarnings.map(String).slice(0, 20);
  if (receipt.exportWarnings.length) {
    const finalState = { ...nextState, receipts: { ...nextState.receipts, [preview.id]: receipt } };
    // Portable exports happen after authoritative commit. Warning text is returned and can be recorded by the hook.
    if (typeof persisted?.persistExportWarnings === 'function') await persisted.persistExportWarnings(finalState);
  }
  return clone(receipt);
}
