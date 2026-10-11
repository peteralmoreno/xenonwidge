# Bot Ranch Master Implementation Plan

> Inline execution ledger for specs/bot-ranch-master.md and its two linked behavior/investigation specs. Keep this file current as work and verification advance.

**Goal:** Fold everyday Ranch Desk and task management into one Large Ranch widget; preserve ranch behavior, provide durable task/runtime management, and report only runtime-confirmed state.

**Architecture:** The local companion owns profiles, tasks, attempts, revisions, and the separately granted management capability. The widget presents ranch/task controls. The installed Oh My Pi extension API supplies prompt injection, lifecycle acknowledgment, authenticated model inventory, model/effort selection, tool-call policy, and command-scoped fresh sessions. Setup remains the advanced editor and credential-provisioning surface.

**Constraints:** Existing widget pairing credentials remain status/selection/focus-only. No arbitrary shell endpoint, paid model prompt, credential disclosure, deployment, or implicit terminal interruption. Unknown or unresolved attempts block duplicate execution. Conversation history and workspace files are never silently deleted.

## Staged plan and ledger

### Stage 0 — Inspect and establish boundaries

- [x] Read the master spec, linked specs, applicable repository guidance, source, tests, build staging, and installed OMP capabilities.
- [x] Run focused baseline tests before implementation: 22/22 passed.
- [x] Preserve existing untracked specifications and other user work.

### Stage 1 — One Large Ranch foundation

- [x] Integrate resident details and task management into the Large Ranch workflow while retaining Desk route/package compatibility.
- [x] Implement the approved map-owned station route matrix and 1.15 movement factor; preserve existing relative movement traits, raw state vocabulary, bounds, and reduced-motion behavior.
- [x] Migrate old ranch-desk.appearance browser settings into the integrated widget without removing the legacy key.
- [x] Keep selection separate from explicit terminal focus.

### Stage 2 — Durable profiles, tasks, attempts, runtime controls

- [x] Keep schema migration, stable profile identity, active membership, Bot Bank, task revisions, archival history, and separate management-key grant/revoke.
- [x] Persist an attempt before launch and authenticate one-time runtime claim with a token hash; remove the plaintext token from OMP process environment after extension load.
- [x] Dispatch explicit and auto-picked work through the same checks. Run only when the resident terminal is verified closed. Use the requested workspace as OMP cwd, inject role/task/acceptance instructions, and prevent two active writers to one workspace.
- [x] Select only models returned by the authenticated runtime inventory and enforce saved preference/eligibility without fallback. Confirm selected model and requested reasoning level via runtime readback.
- [x] Enforce requested read-only access in OMP tool-call hooks: workspace-contained file read/search/find/list are allowed; writes, shell, MCP, URLs, unknown tools, and paths escaping via symlink are blocked.
- [x] Move to Doing only on agent_start, Review only on successful terminal completion, Blocked on reported error/abort, and Done only after explicit user acceptance. Retain attempts/results through follow-up.
- [x] Persist unresolved attempts when startup acknowledgment times out or a terminal closes before completion; prohibit automatic retry.
- [x] Offer an explicit retry only after the previous terminal is verified closed; record that recovery and retain every prior attempt.
- [x] Auto-pickup released FIFO tasks only while unpaused and when an eligible active bot is available.
- [x] Implement same-task-only continuation after a completed attempt is reviewed. Fresh/manual policies create isolated sessions; a workspace or policy mismatch prevents reuse.
- [x] Add OMP command /ranch-clean, which waits for the current agent to go idle and asks OMP to open a fresh session while preserving prior history and workspace files.

### Stage 3 — Widget-first workflows and interactions

- [x] Add Ranch and Tasks views, role/model/context/access defaults, assignment, task create/edit/archive, release/pause, attempt settings/results, and conflict/disconnected feedback.
- [x] Add Start, explicit result acceptance, follow-up, and effective attempt history. Runtime-generated completion is never treated as user acceptance.
- [x] Add drag-source bot chips in Tasks view. Dragging onto a To do card previews; release assigns and dispatches through the normal revision/readiness/availability checks.
- [x] Add long-press pointer dragging for touch/pen, visible drop preview, outside-drop cancellation, and direct button/keyboard equivalents.
- [ ] Run on physical XENEON hardware to verify fit, touch behavior, and whether the movement change reads well.

### Stage 4 — Integration evidence and release verification

- [x] Add synthetic manager/controller tests for recovery, claims, permissions, model capabilities, pickup, context isolation, review/follow-up, and interrupted tasks.
- [x] Add synthetic extension integration test that uses real local HTTP claim/event endpoints but mocks the OMP APIs; it makes no provider request.
- [x] Add Playwright coverage for management, migration, desktop drag dispatch, and synthetic touch-hold dispatch.
- [x] Run the full unit/native/browser/media test suite, packaging/build checks, and packaged asset inspection.
- [x] Reconcile every master requirement to implementation evidence and remaining limits.

## Confirmed implementation rulings

- A task never commandeers an already-open user terminal. Dispatch waits until native status verifies the prior terminal is closed, then uses a task-owned session directory.
- Automatic pickup uses the exact same durable claim and dispatch path as manual Start. Preflight failures stay visible and are not retried until an explicit release/unpause action.
- An unresolved attempt keeps ownership of its workspace after timeout or lost contact. It is released only after the operator requests retry and the native terminal check confirms closed.
- Continue within task resumes only that task's previous OMP session after successful completion and user review. Fresh and Manual always start with an empty session. Changing workspace or policy forces a fresh session.
- Dragging a bot to a task is explicit intent to assign and start, but it still passes the same server-side checks as Start. It cannot interrupt existing work.
- OMP model inventory means the runtime reports a model as configured; it does not guarantee a later provider request will succeed. No paid provider prompt is used for verification.
- Read-only enforcement is an OMP tool-call boundary, not an operating-system sandbox. It does not isolate against unrelated processes running as the same Windows user.
- The Cleanup pen cannot invoke command-scoped OMP session control. It directs the user to /ranch-clean inside the terminal. That command preserves history and files; native behavior remains unverified.
- UI drag/touch checks are browser simulations. They do not establish physical-device acceptance.

## Progress and evidence

| Area | Status | Evidence / remaining limit |
| --- | --- | --- |
| Large widget integration and inherited Ranch behavior | Implemented; device acceptance open | Route/movement tests, appearance migration test, browser suite; physical Large fit remains. |
| Durable local profiles/tasks/credentials | Implemented | Revision/conflict, schema migration, bank membership and token-boundary tests. |
| Runtime dispatch and acknowledgment | Implemented with native-runtime gap | One-time claims and event-driven state transitions covered by manager and synthetic extension integration tests. No real terminal or provider prompt executed. |
| Automatic pickup | Implemented | Synthetic queue/release/pause/eligibility test; no retries on failure. |
| Model/effort selection | Implemented with provider gap | Authenticated runtime model inventory, selection/readback, explicit eligibility, reasoning capability checks. Provider request acceptance unverified. |
| Read-only policy | Implemented at OMP tool boundary | Tests cover allowed workspace reads, blocked write/shell/unknown/URL/path traversal/symlink escape. No OS sandbox is claimed. |
| Context policy and cleanup | Partial | Task-scoped fresh/resume directories and /ranch-clean command implemented. Widget cannot issue the command; native session behavior is not verified. |
| Review, acceptance, follow-up | Implemented with runtime gap | Successful agent-end moves to Review, explicit acceptance moves to Done, follow-up preserves old results; injected lifecycle test. |
| Drag/drop and touch | Browser-verified | Desktop drag and synthetic touch long-press/drop dispatch through controller; hardware touch remains open. |
| Build/release verification | Passed | Final `npm test`: Node 64/64, native setup 1/1, PowerShell terminal argument validation passed, Playwright 46/46, Audio Deck media validation passed. `npm run build:ranch` passed; companion ZIP contains extension, runtime-policy, and widget assets. |

## Requirement traceability

| Requirement | Status | Evidence and limit |
| --- | --- | --- |
| R1 One Large widget | Partial | Integrated Large workflow; Desk compatibility route/package retained; physical fit untested. |
| R2 Useful inspection | Partial | Task/project/activity/role/preferences/effective settings/results/excerpts/focus shown; provider acceptance and device display unverified. |
| R3 Task management | Implemented with runtime gap | Durable CRUD, assignment, dispatch, attempts, review, accept/follow-up. OMP/provider runtime was simulated for tests. |
| R4 Bot bank | Implemented locally | Profiles exceed visible capacity, preserve identity/history, safely retire busy residents. |
| R5 Role and behavior controls | Implemented with provider gap | Role/model/effort/context/access/pickup settings are persisted and used. Provider acceptance remains unverified. |
| R6 Project isolation | Implemented with native gap | Project cwd and instructions are passed; active workspace writers conflict; workspace change forces fresh context. Native OMP behavior unverified. |
| R7 Explicit Start | Implemented with runtime gap | Durable attempt precedes launch, one-time runtime claim, Doing requires agent_start. |
| R8 Automatic pickup | Implemented locally | Released FIFO pickup uses shared claim path and respects global pause, profile eligibility, and availability. |
| R9 Model/effort support | Partial | Runtime inventory, no-fallback preference, selected model/readback, and reasoning checks. Provider acceptance/capability is not tested. |
| R10 Attempts and recovery | Implemented with recovery limit | Attempts persist; unresolved ownership blocks other writers; retry requires a native verified close and preserves prior attempt evidence. No automatic retry/cancellation. |
| R11 Review and follow-up | Implemented with runtime gap | Success enters Review; only user acceptance is Done; follow-up retains history. |
| R12 Context management | Partial | Task-isolated fresh/resume sessions and /ranch-clean command. Widget-triggered reset and native validation remain open. |
| R13 Meaningful dragging | Implemented in browser tests | Drag previews and executes through normal checks; long-press touch simulation and button/keyboard equivalents. Physical touch remains untested. |
| R14 Slightly faster movement | Implemented in simulation | 1.15 multiplier and route/status/bounds tests; visual device acceptance pending. |
| R15 Widget-first routine use | Partial | Routine task/profile/dispatch/review controls in Ranch. OMP manual cleanup command and provider acceptance remain external. |
| R16 Migration and consistency | Partial | Schema migration, stable identity, appearance migration, revisions, credentials and package coverage; multi-process atomicity/device migration not proven. |

## Current status

Core authorized implementation and local verification are complete. `npm test` passes Node 64/64, native setup 1/1, PowerShell terminal argument checks, Playwright 46/46, and Audio Deck media validation. `npm run build:ranch` passes and the 0.7.0 companion ZIP includes runtime-policy.mjs. Native OMP terminal execution, provider request acceptance, physical XENEON fit/touch, and multi-process write behavior remain unverified; injected tests send no paid prompts and do not imply those external checks passed.
