import path from 'node:path';

export const STICKY_GRACE_MS = 30_000;
export const STICKY_FAIRNESS_LIMIT = 3;
const activeAttemptStates = new Set(['dispatching','awaiting-runtime','claimed','running','unresolved']);

export function normalizedProject(projectFolder) {
  if (typeof projectFolder !== 'string' || !projectFolder.trim()) return null;
  const value = projectFolder.trim();
  // Ranch stores fs.realpathSync paths. Normalize Windows drive/UNC paths with
  // win32 rules on every host so settings and tests have stable identities.
  if (/^(?:[a-z]:[\\/]|\\\\)/i.test(value)) {
    const normalized = path.win32.normalize(value);
    const root = path.win32.parse(normalized).root;
    const tail = normalized.slice(root.length).replace(/[\\/]+$/, '');
    return (root + tail).toLocaleLowerCase('en-US');
  }
  return path.resolve(value).replace(/[\\/]+$/, '') || path.parse(path.resolve(value)).root;
}

export function familyKey(task) {
  const name = typeof task?.family?.name === 'string'
    ? task.family.name.normalize('NFKC').trim().toLocaleLowerCase('en-US')
    : '';
  const project = normalizedProject(task?.projectFolder);
  if (!name || !project) return null;
  // JSON encoding prevents family names containing separators from colliding.
  return JSON.stringify([task.family.id || name, project]);
}

export function resolvedSticky(task, familyPolicies = {}) {
  const mode = task?.stickyMode ?? 'inherit';
  if (!['inherit','on','off'].includes(mode)) throw new TypeError('Sticky mode must be inherit, on, or off.');
  if (mode === 'on') return true;
  if (mode === 'off') return false;
  const key = familyKey(task);
  if (!key) return false;
  const policy = familyPolicies?.[key];
  if (policy === undefined) return !!task.family?.id;
  if (!policy || typeof policy !== 'object' || typeof policy.sticky !== 'boolean') {
    throw new TypeError('Family sticky defaults must contain a boolean sticky value.');
  }
  return policy.sticky;
}

function compareQueue(a, b) {
  const order = task => Number.isFinite(task.queueOrder) ? task.queueOrder : Number.isFinite(task.createdAt) ? task.createdAt : 0;
  return order(a) - order(b)
    || (Number.isFinite(a.createdAt) ? a.createdAt : 0) - (Number.isFinite(b.createdAt) ? b.createdAt : 0)
    || String(a.id).localeCompare(String(b.id));
}

function locked(lockSet, taskId) {
  if (lockSet instanceof Set || lockSet instanceof Map) return lockSet.has(taskId);
  if (Array.isArray(lockSet)) return lockSet.includes(taskId);
  return !!lockSet?.[taskId];
}

function eligibleFor(task, profile, eligible) {
  if (typeof eligible !== 'function') return true;
  try { return eligible(task, profile) === true; } catch { return false; }
}

function dependencyReady(task, tasksById) {
  for (const id of task.dependsOn || []) {
    const dependency = tasksById.get(id);
    if (!dependency || dependency.status !== 'done') return false;
  }
  return true;
}

function baseCandidate(task, tasksById, lockedTaskIds) {
  return task && typeof task.id === 'string'
    && task.status === 'todo'
    && task.archived !== true
    && task.releasedForPickup === true
    && !task.pickupBlockReason
    && !locked(lockedTaskIds, task.id)
    && !task.attempts?.some(attempt => activeAttemptStates.has(attempt.state))
    && dependencyReady(task, tasksById);
}

function liveAffinity(affinities, key, now) {
  const affinity = key && affinities?.[key];
  if (!affinity || typeof affinity.profileId !== 'string'
    || !Number.isFinite(affinity.claimedAt)
    || !Number.isFinite(now)
    || now < affinity.claimedAt
    || (!affinity.durable && now - affinity.claimedAt >= STICKY_GRACE_MS)) return null;
  return affinity;
}

function availableOwner(affinity, profilesById, runs) {
  const owner = profilesById.get(affinity.profileId);
  const run = runs?.[affinity.profileId];
  if (!owner || owner.active === false || !run) return null;
  if (['closed','failed','offline','unresponsive'].includes(run.status)) return null;
  // A profile in any other unknown state cannot safely reserve work.
  if (!['terminal open','connected'].includes(run.status)) return null;
  return owner;
}

/**
 * Rank pickup work for one bot. This is deliberately a pure policy function:
 * the caller still dispatches through RanchManager, which performs its final
 * workspace, lock, runtime, and model checks.
 */
export function selectPickupTask({
  profile,
  profiles = [],
  tasks = [],
  runs = {},
  affinities = {},
  familyPolicies = {},
  now = Date.now(),
  eligible,
  lockedTaskIds,
} = {}) {
  if (!profile || typeof profile.id !== 'string') return null;
  const tasksById = new Map(tasks.map(task => [task.id, task]));
  const profilesById = new Map(profiles.map(candidate => [candidate.id, candidate]));
  profilesById.set(profile.id, profile);
  const compare = (a, b) => compareQueue(a, b);

  // An explicitly assigned, released queue keeps its existing head-of-line
  // behavior. A dependency/workspace/model block must not silently send the
  // bot to unrelated shared work instead.
  const assignedQueue = tasks.filter(task => task?.assignedProfileId === profile.id
    && task.status === 'todo' && task.archived !== true && task.releasedForPickup === true
    && !locked(lockedTaskIds, task.id)
    && !task.attempts?.some(attempt => activeAttemptStates.has(attempt.state)))
    .sort(compare);
  if (assignedQueue.length) {
    const head = assignedQueue[0];
    return baseCandidate(head, tasksById, lockedTaskIds) && eligibleFor(head, profile, eligible)
      ? { taskId: head.id, reason: 'explicit-queue' }
      : null;
  }

  const candidates = tasks.filter(task => baseCandidate(task, tasksById, lockedTaskIds)
    && (task.assignedProfileId === profile.id || !task.assignedProfileId)
    && eligibleFor(task, profile, eligible));
  const assigned = candidates.filter(task => task.assignedProfileId === profile.id).sort(compare);
  if (assigned.length) return {taskId:assigned[0].id, reason:'explicit-queue'};

  const shared = candidates.filter(task => !task.assignedProfileId).sort(compare);
  if (!shared.length) return null;

  const sticky = shared.filter(task => resolvedSticky(task, familyPolicies));
  if (!sticky.length) return {taskId:shared[0].id, reason:'queue'};

  // Let a live, verified owner use its handoff window. An unavailable or
  // unverified owner never blocks another eligible profile.
  const deferKeys = new Set();
  for (const task of sticky) {
    const key = familyKey(task), affinity = liveAffinity(affinities, key, now);
    if (!affinity || affinity.profileId === profile.id) continue;
    const owner = availableOwner(affinity, profilesById, runs);
    if (owner && eligibleFor(task, owner, eligible) && now - affinity.claimedAt < STICKY_GRACE_MS) deferKeys.add(key);
  }
  const available = shared.filter(task => !deferKeys.has(familyKey(task)));
  if (!available.length) return null;

  const ownedFamilies = new Map();
  for (const task of available) {
    if (!resolvedSticky(task, familyPolicies)) continue;
    const key = familyKey(task), affinity = liveAffinity(affinities, key, now);
    if (affinity?.profileId === profile.id) {
      const familyTasks = ownedFamilies.get(key) || [];
      familyTasks.push(task);
      ownedFamilies.set(key, familyTasks);
    }
  }

  // Three completed same-family picks are enough; an older unrelated task
  // gets one turn before the affinity family continues.
  const fairness = [...ownedFamilies.entries()]
    .map(([key, items]) => ({key, items:items.sort(compare), affinity:liveAffinity(affinities,key,now)}))
    .filter(group => group.affinity?.consecutive >= STICKY_FAIRNESS_LIMIT)
    .sort((a,b)=>compare(a.items[0],b.items[0]));
  for (const group of fairness) {
    const olderUnrelated = available.filter(task => familyKey(task) !== group.key
      && compareQueue(task, group.items[0]) < 0).sort(compareQueue);
    if (olderUnrelated.length) return {taskId:olderUnrelated[0].id,reason:'fairness',affinityKey:familyKey(olderUnrelated[0])};
  }

  const preferred = [...ownedFamilies.entries()].sort((a,b)=>compare(a[1].sort(compare)[0],b[1].sort(compare)[0]));
  if (preferred.length) {
    const [key, items] = preferred[0];
    return {taskId:items.sort(compare)[0].id,reason:'sticky-family',sticky:true,preferredProfileId:profile.id,affinityKey:key};
  }

  return {taskId:available[0].id,reason:resolvedSticky(available[0],familyPolicies)?'sticky':'queue',
    sticky:resolvedSticky(available[0],familyPolicies),affinityKey:familyKey(available[0])||undefined};
}

/** Record only after the manager's dispatch promise has resolved successfully. */
export function recordSuccessfulAffinity({affinities = {}, key, profileId, taskId, now} = {}) {
  if (typeof profileId !== 'string' || !profileId || typeof taskId !== 'string' || !taskId || !Number.isFinite(now)) {
    throw new TypeError('A successful pickup needs a profile, task, and timestamp.');
  }
  const next = Object.fromEntries(Object.entries(affinities).map(([entryKey, value]) => [entryKey, {...value}]));
  const previous = key ? next[key] : null;
  const consecutive = previous?.profileId === profileId && Number.isSafeInteger(previous.consecutive)
    ? previous.consecutive + 1
    : 1;
  for (const affinity of Object.values(next)) {
    if (affinity.profileId === profileId) affinity.consecutive = 0;
  }
  if (key) {
    if (typeof key !== 'string') throw new TypeError('An affinity key must be a string.');
    next[key] = {profileId,claimedAt:now,lastTaskId:taskId,consecutive};
  }
  return next;
}
