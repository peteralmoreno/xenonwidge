# Reliable Agent Board Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task-by-task. The user explicitly requested a plan handed to a sub-agent; one implementer owns the shared files sequentially. Steps use checkbox syntax for tracking.

**Goal:** Make the sidebar dependable for daily task management and safe agent-driven Board organization.

**Architecture:** Keep the existing companion as the sole task writer. Extract pickup ranking into a reusable policy, put lifecycle diagnosis in the native host, and route both agent CLI and AI Sync UI through revisioned companion operations. Extend existing native pop-outs instead of adding a second application or database.

**Tech Stack:** Existing Node ESM companion, Electron CommonJS host, React/TypeScript sidebar, Playwright and node:test. No new runtime dependency is required.

**Spec:** `docs/superpowers/specs/2026-10-13-reliable-agent-board.md`

## Global constraints

- Preserve all pre-existing uncommitted work; no reset, stash, broad commit, push or live installation.
- Do not use live bot homes, stored credentials, real model calls or occupied production port 43822 in tests.
- Leave running bot work and the currently installed companion alone.
- Default sticky mode off and AI access inspect. Existing context and task lifecycle invariants remain.
- Do not silently move ports, stop unknown processes, or force-restart busy/unresolved work.
- Keep the sidebar compact and preserve saved short/long and A/B mode choices.
- Package next release 0.17.0 with explicit allowlists and no private state.

## Review focus

1. Concurrent launch and PID reuse: no duplicate writer, no termination of an unverified process (Task 1).
2. Recovery click while a task starts: server guard wins; pending/cancel state is accurate (Task 2).
3. Family names reused across projects and failed launches: no cross-project affinity or phantom owner (Task 3).
4. An agent sweep races a user edit or sends the same apply twice: no partial writes or duplicated changes (Task 4).
5. Copy instructions, pop-out navigation and offline UI: no credential leakage, inaccessible recovery or misleading successful apply (Tasks 2/5).

## Working baseline and tracking

Existing feature files are uncommitted in the supplied checkout. Start by recording `git status --short`, then `git switch -c feat/reliable-agent-board` if that branch is absent and the checkout is still on main. Do not reconstruct from HEAD: it does not contain the 0.16 sidebar baseline. Update this plan's checkboxes and append short evidence/rulings in `docs/superpowers/plans/2026-10-13-reliable-agent-board-progress.md`. Do not ask for another approval; execution is authorized.

### Task 1: Companion ownership and typed health

**Files:** Create `sources/omp-bot-companion/companion-health.mjs`, `companion-lock.mjs`; modify `bridge.mjs`, `companion-start.mjs`, `server.mjs`; test `tests/ranch-companion-health.test.cjs`, `tests/ranch-companion-lock.test.cjs`.

**Interfaces:** `probeCompanion({origin,token,version,fetchImpl}) -> Promise<Health>` where Health has `status`, safe `message`, `origin`, optional authenticated `pid`, `instanceId`, `appVersion`, `homeFolder`, `busy`, `lastSuccessAt`. `acquireCompanionLock({directory,ownerIdentity,isOwnerAlive}) -> release()`; conflicting live or ambiguous owners throw typed errors. The bridge exposes authenticated `/admin/health` without task content or secrets.

- [x] Add failing tests with ephemeral listeners for absent service, timeout, wrong credentials, healthy compatible version, mismatched version and busy upgrade. Distinguish connection-refused from unresponsive and unknown-service.

```js
assert.equal((await probeCompanion({origin,token,version,fetchImpl:refused})).status,'offline');
assert.equal((await probeCompanion({origin,token,version,fetchImpl:unauthorized})).status,'port-conflict');
assert.equal((await probeCompanion({origin,token,version,fetchImpl:hung})).status,'unresponsive');
```

- [x] Test two contenders in a temporary private directory: second cannot acquire, stale known-dead owner can be reclaimed, unknown owner liveness fails closed, prior owner release cannot remove a replacement lock. Inject identity/liveness in tests instead of inspecting real processes.
- [x] Implement the lock using atomic creation and owner instance identity; acquire before `new RanchManager`. Release on owned clean shutdown/error paths. If platform process identity cannot be safely established, return an actionable diagnostic instead of guessing. Never kill for stale-lock cleanup.
- [x] Extend `ensureCompanion` with typed failures while keeping authenticated busy/version guards. Add a bounded private log writer for lifecycle summaries only; no raw request bodies, keys, task prompts or command lines. Cap file size and retain at most one rotated file.
- [x] Run `node --test tests/ranch-companion-health.test.cjs tests/ranch-companion-lock.test.cjs tests/ranch-install.test.cjs` (locate the existing install test filename if different). Record exact results.

### Task 2: Connection & recovery pop-out

**Files:** Modify `sources/omp-bot-desktop/main.cjs`, `preload.cjs`, `window-policy.cjs`, `FloatingTaskDock.tsx`, `dock.css`; create focused `RecoveryPanel.tsx` and a restricted native utility-window module as needed; extend `tests/ranch-desktop-native.test.cjs` and create `tests/ranch-recovery.spec.cjs`.

**Interfaces:** Explicit host IPC `health()`, `recover('reconnect'|'restart-when-idle'|'cancel'|'quit-when-idle')`, `diagnostics()` returning redacted text. No arbitrary URL, path, PID, command or shutdown route supplied by a renderer. Local utility pop-out loads bundled React UI and stays available with no companion.

- [x] Add tests: open recovery offline, show distinct conflict/unresponsive text, cancel a queued idle restart, click twice with only one recovery operation, busy-to-idle transition triggers exactly one authenticated shutdown, and a new active task causes server refusal without killing it.
- [x] Implement a serialized recovery controller with pending action and backoff. Reconnect may start only when the service is absent. A pending idle restart polls authenticated health (for example every 5 seconds); the server remains final authority immediately before shutdown. Cancel invalidates outstanding work before any later shutdown.
- [x] Make normal connection quiet: remove the healthy red dot, show labeled offline/reconnecting status when needed, and add a persistent accessible Connection & recovery entry. Diagnostics should include safe paths/version/status plus sanitized lifecycle lines, not task or credential data.
- [x] Add bounded copy-to-clipboard host capability returning success/error; logs can be viewed in the pop-out without opening arbitrary files.
- [x] Run recovery browser tests and the native smoke. Confirm close-window versus quit-desktop versus quit-and-stop-companion are accurately labeled.

### Task 3: Shared sticky pickup policy and UI

**Files:** Create `sources/omp-bot-companion/pickup-policy.mjs`; modify `manager.mjs`, `queue-policy.mjs`, `bot-library.mjs`, sidebar `sidebar-model.ts`/`SidebarPanels.tsx`, `window-policy.cjs`, full Board `setup/board.js`/`board.html`; tests `tests/ranch-sticky-pickup.test.cjs`, `tests/ranch-floating-dock.spec.cjs`, existing work-check/queue tests.

**Interfaces:** `familyKey(task) -> string|null`; `selectPickupTask({profile,profiles,tasks,runs,affinities,now,eligible}) -> {taskId,reason}|null`. Task `stickyMode:'inherit'|'on'|'off'`; persisted `familyPolicies[key]={sticky:boolean}` and `familyAffinities[key]={profileId,claimedAt,lastTaskId,consecutive}`. Record successful affinity through one manager method after dispatch succeeds. Expose resolved `sticky`, `preferredProfileId`, and `waitingReason` in public task views.

- [x] Red tests: default-off preserves current ordering; own explicit queue wins; same-family owner preferred within 30 seconds; expired/banked/closed/failed owner yields; family names in different projects stay independent; failed dispatch never claims affinity; three consecutive sticky picks yield to older unrelated eligible work; context settings are unchanged.

```js
assert.notEqual(familyKey(taskInProjectA),familyKey(taskInProjectB));
assert.equal(selectPickupTask(fixtureWithExplicitQueue).taskId,'explicit-first');
assert.equal(selectPickupTask(fixtureWithUnavailableOwner).taskId,'available-shared');
```

- [x] Normalize Windows project identity consistently with existing filesystem canonicalization, not family color. Reject malformed mode/default inputs and guard family-setting changes by revision.
- [x] Replace both duplicated selection sites (`pollWork` and `autoPickup`) with the same policy. Eligibility is checked before affinity; never bypass model verification at actual dispatch. If an owner's eligibility is unknown, label it unverified and expire the preference; do not pretend access is known.
- [x] Preserve new fields through save/export/import/restart and inherit on follow-up. Manual queue movements remain authoritative. Explain whether a pending shared task is waiting briefly for affinity, blocked by dependency, held, or awaiting runtime.
- [x] Add task Sticky inherit/on/off control, family default/reset control, and bot current/up-next markers in sidebar. Full Board edit must not discard new fields. Test polling does not overwrite drafts and sticky edits reject stale revisions.
- [x] Run sticky, queue, work-check, sidebar and Board tests; record results.

### Task 4: Versioned agent catalog and transactional Board edits

**Files:** Create `sources/omp-bot-companion/agent-api.mjs`, `board-changes.mjs`, `agent-catalog.json`; modify `server.mjs`, `manager.mjs` and persistence deliberately; tests `tests/ranch-agent-api.test.cjs`, `tests/ranch-board-changes.test.cjs`.

**Interfaces:** Authenticated `/admin/ai/catalog`, `/admin/ai/snapshot`, `/admin/ai/preview`, `/admin/ai/apply`, `/admin/ai/access`, `/admin/ai/history`. Access changes are management-only, not catalog operations. `previewChanges({changeSetId,actor,operations,expectedTaskRevision}) -> {id,before,after,operations,conflicts}`. `applyChanges({id,expectedTaskRevision}) -> {receiptId,appliedAt,actor,changes}`. Actor is a displayed caller-supplied label, not authenticated identity.

- [x] Define JSON schemas/examples for operations: `task.create` (held), `task.update` (pending metadata), `task.assign`, `task.order`, and sticky family setting. Operate-only catalog actions: explicit release/start/ring. Do not expose deletion, arbitrary routes, shell, filesystem, credentials, access changes or restart.
- [x] Red tests: inspect cannot apply; organize cannot release/start even with unknown nested fields; active/unresolved tasks reject editing; invalid dependency cycles or cross-revisions reject the whole batch; duplicate apply IDs return the prior receipt; unknown fields/oversized payloads reject; hostile actor/title strings remain plain text.

```js
const before = JSON.stringify(manager.tasks);
assert.throws(()=>applyMixedValidAndStaleBatch(),/conflict/i);
assert.equal(JSON.stringify(manager.tasks),before);
assert.deepEqual(applySameChangeSetAgain(),firstReceipt);
```

- [x] Implement side-effect-free staging/validation before any live mutation. Do not instantiate a cloned manager (its constructor writes files). Share/refactor domain validation as needed. Commit edits, new revisions and audit/receipt together in the authoritative atomic state write; no scheduling/launch side effect for organize operations. Portable exports follow authoritative persistence and surface export failure without applying the transaction twice.
- [x] Persist bounded audit history with actor, timestamp, changed fields, before/after, change-set ID and receipt. Keep entries free of credentials; content belongs in private state, not distribution artifacts. Maintain receipts sufficiently to guarantee documented idempotency; do not silently expire them without defining the retry boundary.
- [x] Reuse existing manager operations and runtime checks for explicit operate actions; do not let arbitrary status writes claim completion. Enforce access server-side on every AI route, not just in the CLI or pop-out.
- [x] Run new API/transaction tests and existing manager persistence/queue tests. Show tests for whole-batch validation and a failed authoritative write leaving live memory unchanged.

### Task 5: CLI, AI Sync pop-out and discovery instructions

**Files:** Create `sources/omp-bot-companion/ranch-cli.mjs`, `botRanch-cli.cmd`, sidebar `AiSyncPanel.tsx`, `docs/guides/bot-ranch-ai-sync.md`; modify host utility windows/IPC policy, installer stable launcher generation, `bot-library.mjs` generated guidance and release allowlists. Tests `tests/ranch-cli.test.cjs`, `tests/ranch-ai-sync.spec.cjs` and native smoke.

**CLI contract:** `botRanch-cli.cmd status --json`, `catalog --json`, `board --json`, `preview --file changes.json --actor cleanup-agent`, `apply --id CHANGESET_ID`, and explicit operate-only `release`, `start`, `ring` commands. Use a stable installed CLI path generated by installer; copied instructions contain that real invocation (no assumption it is globally on PATH). Treat file arguments as literal paths, never shell snippets. Do not print keys or automatically start a companion for read-only inspection.

- [x] Tests invoke CLI with a temporary config and fake HTTP server; verify correct routes, nonzero exits for offline/conflict/permission, JSON output, no secrets in stdout/stderr, and literal paths with spaces. Tests never read the real user's config.
- [x] CLI resolves private config internally and calls the documented agent API. A missing companion reports how to open/reconnect it. Catalog is versioned and matches implemented operations; generated instructions identify authoritative API versus portable exports.
- [x] AI Sync pop-out shows access selector, copy instructions/catalog commands, preview list with exact changes, explicit Apply (enabled only in allowed mode), receipts/history and the sweep prompt. Preserve drafts on refresh; show conflicts without discarding proposed work. Avoid introducing a second Board task store.
- [x] Add managed `integrations/botranch/` guidance under selected bot home without overwriting a user's existing agent.md or role instructions. Refresh only files explicitly owned by botRanch; no embedded tokens.
- [x] Add browser/native tests: AI Sync works as a read-only guide offline; apply permission is enforced independently of disabled UI; changed tasks appear in sidebar after normal polling; text is escaped; pop-outs cannot navigate to unrelated origins or invoke unrelated privileged IPC.

### Task 6: Integrated verification, docs and release

**Files:** `tools/build.cjs`, `tools/build-desktop.cjs`, `sources/omp-bot/manifest.json`, desktop package version, READMEs/guides and relevant tests.

- [x] Add all new CLI/catalog/runtime files to release allowlists. Bump matching source/release version to 0.17.0. Update installation, everyday usage, sticky policy, recovery and agent examples; clearly distinguish application permissions from an OS sandbox.
- [x] Run `npm run test:unit`, related Playwright sidebar/Board/recovery/AI Sync tests, `npm run test:ranch-native`, then hidden packaged Electron smoke with `BOT_RANCH_TEST_DESKTOP_RUNTIME=1`. Restore that test environment variable afterward.
- [x] Build with `npm run build:ranch`. Inspect sidebar and both pop-outs at short/long and a small work area using isolated fixtures. No live model jobs.
- [x] Verify ZIP files exactly match `release.json` plus the manifest itself, bundled new sources match checkout, CLI/help run from staged release, and no credentials/runtime homes/sessions/logs enter the archive. Run `git diff --check`.
- [x] Report completed requirements, test counts, artifact paths and genuine limitations to the parent agent. Do not install or restart the live app. Request focused review of transaction atomicity, pickup fairness and lifecycle recovery before claiming completion.

## Plan self-review

Recovery and ownership cover spec 1–3; shared ranking and UI cover 4–6; API, transaction audit, CLI and pop-out cover 7–11; release verification covers 12. The five review risks have explicit tests assigned above. New commands are proposed contracts in this plan, not claims that they already exist.
