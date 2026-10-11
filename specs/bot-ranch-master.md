# Bot Ranch master specification — PRISM

Date: 2026-10-10.

Status: master draft requested by the user, incorporating agreed product direction. Detailed proposals and open decisions below are not yet approved. Specification only; no implementation is authorized or claimed.

## 1. Problem

Bot Ranch currently describes bot activity through an animated ranch, while Ranch Desk supplies details and the local setup page manages residents. The existing specifications address consistent visual behavior and an investigation of a local task board. They do not define a complete workflow for reusable bots that accept and execute project tasks.

The operator wants one Large Bot Ranch widget that can manage routine work without requiring the browser control page: choose bots, assign or release tasks for automatic pickup, inspect progress, handle attention, and review results. Bots should have persistent identities and configurable specialties while working on different projects over time.

**Affected users and systems:** the local operator, Bot Ranch widget, Ranch Desk presentation, companion service, local setup/control application, resident profiles, agent runtimes, project workspaces, and local task storage.

**Desired observable outcome:** the operator can select an existing task targeting `intv`, give it to an eligible bot or permit automatic pickup, observe the actual execution state, and review the result entirely through the widget. Failure, unavailable models, and unresolved execution ownership remain visible rather than looking like success.

**Scope:** one Large widget; integrated bot details; local task management and execution; bot bank and active membership; roles and model preferences; task reasoning controls; context/reset policies; meaningful drag-and-drop; slightly faster movement; shared local data and retained management controls.

**Non-goals:** implementation in this document; cloud task synchronization; a separate replacement Desk widget; user-authored map editors; universal support for every provider model; treating animation as execution evidence; deleting history or workspace files as an implicit cleanup operation. Detailed text composition and large code-diff review need not be comfortable on the widget, but routine operation must not require opening the webpage.

### Relationship to the two earlier specifications

The earlier files remain unchanged as historical contracts. This master records the user's newer direction and identifies exactly where it differs. On approval, it governs the expanded product; inherited requirements continue where compatible. It does not retroactively mark earlier investigation measures as completed.

| Earlier contract | Retain | Revised direction |
| --- | --- | --- |
| [Bot Ranch behaviors](bot-ranch-behaviors.md), R1–R4, I1, I5, S1–S4 | Truthful activities, map-owned routes and geometry, shared movement, distinct status presentation | Add operator drag holds and operational overlays without inventing terminal activities |
| Behavior R5, I3 | Attention bell, timed idle/sleep, offline distinction, conservative recovery | Rest, cleanup, and retirement add scheduling/lifecycle intent; they do not erase observed status |
| Behavior I2 | Identity independent of color, bounds, standing separation | Exact existing pace is superseded by a modest increase; proposed multiplier is 1.15 |
| Behavior non-goals, R7, S5 | Separate lifecycle, movement, and rendering responsibilities | Separate Desk presentation is superseded: fold its function into one Large Ranch widget |
| Behavior I4 | Explicit terminal focus, private metadata, authenticated control | New management actions need explicit authorization capabilities; old widget credentials must not silently acquire them |
| [Board investigation](ranch-board-investigation.md), R1, R4–R7, I2, I3, I5, I6 | Boundary investigation, durable local data, stable identity, existing controls, honest evidence, credential privacy | These remain evidence obligations; this document is not proof they have been investigated |
| Board R2, S2, S5 | One companion and shared data | Widget is the everyday control surface; browser page is the deeper editor/configuration surface |
| Board non-goals, I4, M5 | Ordinary assignment or board movement is not implicit execution permission | Explicit Start/drop-to-start and explicitly enabled automatic pickup may dispatch work |
| Board R3, S4 | Observable task editing and state distinct from bot activity | Extend association into task attempts, exclusive claims, execution, recovery, and review |

## 2. Requirements

The requirements are the proposed master contract. Confirmed product choices are identified in Section 4; unresolved details are listed in Section 7.

- **R1 — One Large widget.** Deliver Bot Ranch as one Large widget incorporating Desk's selected-bot details. Everyday operation must not require a second widget or visiting the browser page. Both packaged and companion-hosted delivery must provide the supported workflow.
- **R2 — Useful inspection.** Selecting a bot exposes its task, target project, observed activity, role, configured and actual model, context information when available, latest supported excerpt, attention reason, and explicit terminal action. Unavailable or stale values are identified. Selection alone does not focus a terminal.
- **R3 — Local task lifecycle.** Support creating, editing, assigning, unassigning, reviewing, and removing or archiving local tasks. Record target project, instructions, acceptance criteria, execution eligibility, reasoning request, and results. Distinguish unsaved edits, failed saves, empty lists, disconnected service, blocked work, and conflicts. The widget supports queue inspection, assignment, start, progress, and result review; the browser supports detailed authoring.
- **R4 — Bot bank.** Persist reusable bot profiles independently of active ranch slots and running sessions. Admit a saved bot to the active team and retire it without losing identity, configuration, or history. Busy retirement can be requested for after the current attempt; it must not silently interrupt work.
- **R5 — Role and behavior controls.** Provide role selection, model preferences, read-only mode, automatic-pickup eligibility, and context policy. Show both saved defaults and the effective settings of the current attempt. Changes apply to subsequent attempts unless a separately supported action explicitly changes the current one.
- **R6 — Project-targeted work.** A task targets a validated project workspace, independent of the bot's storage/home directory. Dispatch exposes the resolved workspace and loads applicable project instructions. Unavailable paths and conflicting workspace use block execution with reasons. Cross-project work must not accidentally resume the wrong conversation.
- **R7 — Direct dispatch.** The operator can select an eligible bot and explicitly start a ready task. Mere assignment or moving a card between display columns does not dispatch. An ineligible bot is rejected with actionable reasons; the task is not reported as running until execution acknowledgment is established.
- **R8 — Automatic pickup.** A task explicitly released for automatic pickup may be claimed by an eligible, available active bot whose pickup setting is enabled. A global pause prevents new automatic claims without stopping running attempts. Lack of an eligible bot leaves work queued with visible reasons.
- **R9 — Model and effort matching.** Consider GPT, DeepSeek, and Claude through supported adapters. Tasks can request reasoning effort and model eligibility; bots expose their configured models and supported capabilities. Show the resolved model and effort. Missing access produces a warning and blocks incompatible execution; unverified access remains visibly unverified. Unsupported effort requests are not silently presented as honored, and model substitution requires an explicit fallback policy.
- **R10 — Exclusive attempts and recovery.** Track each execution attempt separately from its task and bot. Competing claims, repeated input, and controller restarts must not create a second active owner. Lost contact produces an unresolved state until reconciled; it must not automatically release work that may still be executing. Preserve result/error evidence and retry history.
- **R11 — Meaningful completion.** A runtime's completion event records attempt completion, not automatic task acceptance. Present a result summary and available acceptance evidence for Review. The operator can accept the task or request follow-up; missing evidence and failures remain visible.
- **R12 — Context cleanup.** Provide a cleanup action and policy that start a fresh conversation while retaining prior history. Distinguish conversation reset, runtime restart, durable-memory deletion, and workspace cleanup. Busy cleanup is deferred until a safe boundary; failed or unverified cleanup prevents automatic reuse and shows a recovery action.
- **R13 — Grab and drop.** Bots can be picked up and dropped onto explicit semantic targets. Preview the exact action and eligibility before release. Drop outside a target cancels. Busy drops never implicitly interrupt. Every operational drag has a tap/keyboard equivalent and uses the same validation as buttons.
- **R14 — Movement and status.** Slightly increase walking speed while preserving readable motion, idle pauses, reduced motion, bounds, spacing, activity labels, attention information, and one-shot celebration. Preserve activity-specific map routes. Dragging temporarily holds movement; activity continues updating, and release resolves the current destination rather than a stale one.
- **R15 — Widget-first controls.** From the widget, the operator can inspect and assign existing work, enable/pause pickup, use the bank, change next-attempt defaults, request cleanup, inspect attention/results, and open the terminal. Longer details may expand over the scene. Readiness failures identify what can be resolved locally and what requires the browser or terminal.
- **R16 — Persistence and control compatibility.** Tasks, profiles, membership, policies, and attempt ownership survive page reload and companion restart. Failed saves are not shown as committed. Concurrent views detect conflicting edits. Retain launch/resume, new-session safeguards, close/focus, readiness checks, pairing, and sleep controls. Migration must preserve existing resident identities and histories and account for retired Desk settings/routes.

## 3. Invariants

- **I1 — Truthful state.** Preserve all 11 public terminal states and event/approval precedence. Keep terminal activity, task workflow, scheduling availability, connection health, and scene animation distinct. Sleeping, a process restart, or a sprite reaching a station is not proof of task success or readiness.
- **I2 — Stable identity.** Bot profile ID, ranch slot, session/process identity, conversation identity, task ID, and attempt ID are distinct. Names, colors, and folder labels are not identity keys.
- **I3 — Exclusive execution.** At most one active attempt owns a task, and at most one task attempt occupies a bot in this proposed initial contract. Unresolved dispatch or liveness never implies it is safe to retry. External side effects are not claimed to be exactly-once merely because local claims are exclusive.
- **I4 — Explicit authority.** A drag or button invokes a defined authorized action. Ordinary selection and association do not execute. Automatic execution requires task release plus enabled bot eligibility. Existing status/focus credentials do not silently become management credentials; no arbitrary shell-command endpoint is introduced.
- **I5 — Effective workspace and permissions.** Dispatch uses the validated task workspace and effective permissions, not an incidental working directory. Read-only is enforced by supported execution/tool boundaries, not merely role instructions. If enforcement is unavailable, block tasks requiring it. Concurrent writers require serialization or proven isolation.
- **I6 — Context integrity.** Fresh conversation is distinct from process restart, history deletion, persistent-memory deletion, and workspace cleanup. No implicit cleanup deletes history or files. Retained profile/project instructions and memory are disclosed; a fresh conversation is not advertised as complete erasure.
- **I7 — Capability honesty.** Model preference is not proof of access. Executable/version checks are not model-authentication checks. Requested model/effort, resolved configuration, and actual reported runtime values remain distinguishable. Context usage is not a model-quality score.
- **I8 — Lifecycle safety.** Preserve verified process ownership, conservative recovery, heartbeat interpretation, and interruption safeguards. Rest, retirement, and cleanup do not silently stop active work. Pause pickup and pause animation are separate controls.
- **I9 — Local durable ownership.** Local task management does not require a cloud task service; model-provider networking is separate. The companion owns accepted control state. UI optimism cannot replace durable acknowledgment, and reconnect cannot overwrite newer state silently.
- **I10 — Presentation and privacy.** Preserve map route validity, shared scene geometry, separate standing positions, reduced-motion status visibility, and explicit focus. Keep credentials and private process bindings out of widget payloads; do not expand excerpts into hidden reasoning or unrestricted logs.

## 4. Solution

### S1 — One product, complementary views

**Confirmed:** fold Ranch Desk into Bot Ranch and target Large. Do not retain a separately required Desk widget as the product direction.

**Proposed layout:** two primary widget views, Ranch and Tasks; persistent attention and controller-health indicators; a selected-bot panel; Bot Bank drawer; expandable details. The ranch shows the team and activity. Tasks provides legible cards and assignment targets. The browser application shares the same data and handles detailed task writing, setup, and advanced configuration.

Conceptual layout, not a verified device mockup:

```text
+--------------------------------------------------+
| Ranch | Tasks    Connection / Attention / Pickup |
+------------------------------+-------------------+
|                              | Selected bot      |
| Ranch scene                  | Task / project    |
| activity stations            | Role / model      |
| rest / available / cleanup   | Context / status  |
|                              | Relevant actions  |
+------------------------------+-------------------+
| Task tray / assignment targets       Bot Bank    |
+--------------------------------------------------+
```

In Tasks view, the queue replaces most scene space. An available bot strip allows assignment without navigating away. Exact proportions and touch geometry require device validation; the diagram does not establish fit.

### S2 — Separate profile, membership, session, task, and attempt

**Proposed ownership model:**

| Entity | Durable responsibility |
| --- | --- |
| Bot profile | ID, nickname/appearance, role default, preferred model, permission and context defaults |
| Ranch membership | Active-team admission and retirement intent, independent of visible slot |
| Session | Runtime/conversation linkage and recovery references; live telemetry remains transient |
| Project | Validated workspace reference and execution configuration |
| Task | Intent, project, acceptance criteria, workflow, requirements, assignment, pickup authorization |
| Attempt | Exclusive ownership, resolved settings, session/workspace association, progress, outcome/evidence |

**Direction from discussion:** use one local home/storage root with isolated bot and attempt storage. Execution occurs in each task's project workspace. No exact new filesystem schema is selected here. Do not hardwire the existing four-visible-resident limit into bank capacity or process capacity.

### S3 — Task workflow and dispatch

**Proposed workflow:** To do → Doing → Review → Done, with Blocked as a reason/status overlay and attempt states for claiming, starting, running, awaiting input, completed, failed, and unresolved. Assignment is separate from starting. Follow-up records a new attempt or an explicitly continued task session rather than erasing the old result.

The companion validates eligibility and durably claims the task before dispatch. A stable dispatch identity permits retry/reconciliation; unresolved acknowledgment blocks duplicate launch. Automatic pickup uses the same path as manual Start. Eligibility includes membership, pickup authorization where applicable, role requirements, model access, permissions, effort support, availability, and workspace compatibility. Ordering/fairness and cancellation rules remain open.

**Proposed initial simplification:** one attempt per bot and one writer per non-isolated workspace. Do not assume isolated workspaces can be merged automatically. Provider access can fail after preflight; record that as a failure/block without silent fallback.

### S4 — Roles, model adapters, and reasoning controls

**Requested direction:** bots have role/model defaults; support consideration of GPT, DeepSeek, and Claude; show access warnings; tasks have a thinking control.

**Proposed roles:** Generalist, Planner, Researcher, Implementer, Reviewer. Role presets supply instructions and tool policy; permissions remain separately enforced. Role changes do not replace bot identity.

**Proposed task control:** discrete Auto / Low / Medium / High effort, visually presented as a labeled slider, plus optional eligible-model constraints. Effort is not a universal model-quality ranking. Adapters declare support and explicit translations; no cross-provider equivalence or current runtime compatibility is assumed. Budget controls are a separate possible addition, not implied by the slider.

Record the effective model, effort, role and permissions per attempt. Adapter access states distinguish available, unavailable and unverified. Actual API/model inventories and access probes require a later capability investigation; this spec intentionally makes no current provider-support claims.

### S5 — Context and lifecycle controls

**Requested direction:** read-only toggle, role dropdown, cleanup pen, context/restart behavior controls.

**Proposed context policy:** Fresh per task / Continue within task / Manual, with a fresh session on project changes. Runtime restart is an advanced independent option. Neither reset implies deleting history, durable memory, or workspace files.

Cleanup is a controller-owned operation: wait for a safe boundary, finalize the attempt handoff, reset according to policy, verify readiness, then release the bot. The pen visualizes this operation; entering the pen does not perform it. Failure leaves the bot unavailable for pickup. Rest disables new pickup; retirement removes active membership after current work. Show pending operations and permit their cancellation before execution where safe.

### S6 — Drag semantics

**Confirmed direction:** support grab/drop with meaningful destinations. The following target behaviors capture the discussed design; exact activation timing remains a proposal.

| Target | Preview and action |
| --- | --- |
| Ready task card | “Start: [task]”; validate and assign/start an eligible idle bot |
| Available area | Enable pickup; does not automatically release unpublished tasks |
| Rest area | Disable pickup, finish current task if busy |
| Cleanup pen | Fresh conversation, keep history; defer while busy |
| Bot Bank | Retire after current task if busy; keep profile/history |
| Ordinary ground | Temporary visual reposition only, no operational effect |
| Outside a supported target | Cancel |

A busy bot dropped onto a task is rejected initially rather than implicitly reserving a second task. Invalid targets show the actual reason. Reading/research/writing stations remain activity indicators, not role-changing commands. Ordinary-ground placement yields to the next applicable routing update; it never suppresses attention or task status.

Tap selects. A proposed short hold starts touch dragging; mouse and keyboard alternatives are supported. During drag, movement is held but status remains live. On release the controller revalidates against current revisions; a stale preview is not authority. Show pending, accepted, or rejected feedback. Work begins on acknowledged dispatch, not when the sprite arrives. State-changing drops must expose their meaning before release; cancellation and irreversible-in-flight handling need final interaction design.

### S7 — Retain the behavior architecture, modestly increase pace

**Confirmed:** slightly faster movement. **Proposed tuning:** multiply baseline walking speed by 1.15, preserving relative traits and idle timing. The exact multiplier needs visual acceptance.

Retain map-owned stations/workRoutes, shared scene coordinates, one movement engine, and separate event reduction. Initial routes remain reading → Reading nook; researching/thinking → Research station; writing → Writing bench; running/working → Workshop. Both Meadow and Courtyard retain their own geometry. Invalid maps fail validation instead of sending working bots home.

Keep five baseline movement families: work, attention, idle, sleep, offline. Scheduling/rest/cleanup intent is a separate layer, not new public terminal activity. Offline indication and waiting/error attention remain visible regardless of pending rest/cleanup/retirement. Actual cleanup can occupy its pen when the bot is no longer executing task work. No generic state-machine rewrite is selected.

### S8 — Shared local persistence and authorization

**Proposed:** companion-owned durable records, atomic mutation acknowledgment, and revision checks for concurrent views. Browser-only storage is insufficient as authoritative ownership for dispatch. Storage format, transaction strategy, and recovery protocol remain design decisions requiring evidence.

The widget and browser use the same validated actions. Preserve the current distinction between display/focus and management authority. A deliberately granted widget-control capability is required for dispatch, lifecycle, and configuration actions; the provisioning/revocation design is open. Actions reference saved IDs and validated fields, not raw shell text. Sensitive bootstrap credentials and process metadata stay private.

### S9 — Compatibility and evidence boundary

Retain existing resident IDs, histories and useful management workflows. Define a migration for profile folders becoming defaults while tasks own target projects. Prefer retaining the existing launcher/route where compatible, but do not claim that route or old Desk clients remain compatible without a tested policy.

Packaging must deliver the integrated widget and matching companion. A later release must explain replacement of Desk, pairing/control enrollment, and treatment of old settings. Earlier smoke tests only establish the earlier baseline. They do not verify this design, automatic dispatch, provider compatibility, read-only enforcement, or physical touch use.

## 5. Measures

All measures below are future acceptance evidence, not completed tests. Use synthetic task content and exclude credentials from evidence.

- **M1 — Widget-only workflow.** On the physical Large display and hosted view, assign an existing synthetic `intv` task, inspect eligibility, start it, follow progress/attention, and review/accept its result without visiting the browser. Verify both orientations/layouts actually supported by the selected Large target; unsupported layouts must not be advertised.
- **M2 — Details and preservation.** Exercise all public terminal states, overlapping tools/approvals, stale/offline metadata, selection without focus, explicit focus failures, launch/resume/new/close safeguards, sleep timing, and existing pairing/readiness flows.
- **M3 — Bank and identity.** Save more profiles than visible slots, admit/retire/re-admit, rename/recolor, restart the companion, and verify stable identity and isolated histories. Busy retirement finishes work without replacement or hidden interruption.
- **M4 — Task data and edits.** Exercise task creation, cancellation of edits, assignment/unassignment, review/follow-up, and the selected removal policy. Reload/restart after saves; inject failed saves and concurrent conflicting edits. Verify explicit outcomes with no silently lost update.
- **M5 — Workspace and permissions.** Dispatch two different-project tasks through one bot and verify correct project instructions and conversation association. Attempt a write in read-only mode, including through shell/tool paths; verify enforcement or blocked dispatch. Compete for a shared writable workspace and verify the selected isolation/serialization rule.
- **M6 — Eligibility matrix.** For every supported adapter, cover model available/unavailable/unverified, unsupported effort, mismatched role/permissions, and access failure after preflight. Verify warning reasons, resolved/actual settings, and absence of silent fallback. Use adapter fixtures plus real integration evidence before claiming provider support.
- **M7 — Claim and recovery races.** Compete two bots for one task; repeat Start/drop; lose dispatch acknowledgment; disconnect/restart the companion while work continues. Verify one active owner, no automatic duplicate, visible unresolved state, and explicit reconciliation. Document side effects that cannot be proven idempotent.
- **M8 — Pickup controls.** Verify only released tasks and enabled eligible active bots participate. Global pause, rest, retirement, busy state, and cleanup block new claims appropriately without stopping current work. Verify the selected queue ordering and starvation policy once decided.
- **M9 — Cleanup semantics.** Verify fresh conversation excludes prior transcript while retaining history and declared persistent instructions/memory. Test runtime restart with resume separately. Busy cleanup defers; failure blocks reuse; neither path deletes workspace files.
- **M10 — Drag/tap equivalence.** On touch hardware, mouse, and keyboard, exercise every drop target, canceled holds, outside drops, busy bots, unavailable models, stale revisions, connection loss, and repeated release. Compare results with equivalent buttons. Record target sizes/gesture thresholds and observed accidental-action failures for tuning.
- **M11 — Routing and pace.** Run the inherited six-activity/two-map matrix, map/activity changes during drag, shared-station spacing, invalid definitions, and static motion modes. With the proposed factor, equal-distance travel time is baseline divided by 1.15, within a declared measurement tolerance. Human review confirms legibility; exact tuning remains unapproved until accepted.
- **M12 — Completion evidence.** Show a terminal-done event with unmet acceptance criteria; verify the task remains in Review rather than Done. Test failure, missing result evidence, user-requested follow-up, and explicit acceptance with retained attempt history.
- **M13 — Authority and migration.** Verify legacy status credentials cannot dispatch or manage; test the selected control enrollment/revocation flow and unauthorized requests. Migrate synthetic existing profiles/history/settings, test supported old-client behavior, and verify packaged/hosted dependency loading. Document recovery from failed migration before release.
- **M14 — Boundary investigation.** Produce source-backed evidence for hosting, launcher behavior, storage ownership, authentication, runtime dispatch/control capabilities, and packaging, satisfying the still-relevant board-investigation obligations. Identify unsupported capabilities before implementation commitments.

## 6. Traceability

| Requirement | Protected by | Solution | Evidence |
| --- | --- | --- | --- |
| R1 | I9, I10 | S1, S9 | M1, M13 |
| R2 | I1, I7, I10 | S1, S4, S7 | M1, M2, M6 |
| R3 | I1, I2, I9 | S2, S3, S8 | M4, M12 |
| R4 | I2, I8, I9 | S2, S5 | M3, M8 |
| R5 | I4, I5, I7 | S4, S5, S8 | M5, M6, M8, M9 |
| R6 | I2, I5, I6 | S2, S3, S5 | M5 |
| R7 | I3, I4, I5, I7 | S3, S4, S8 | M5, M6, M7 |
| R8 | I3, I4, I8 | S3, S5, S8 | M7, M8 |
| R9 | I7 | S4 | M6, M14 |
| R10 | I2, I3, I8, I9 | S2, S3, S8 | M7 |
| R11 | I1, I9 | S2, S3 | M12 |
| R12 | I6, I8 | S5, S7 | M9 |
| R13 | I1, I3, I4, I8, I10 | S6, S7, S8 | M7, M10 |
| R14 | I1, I8, I10 | S7 | M2, M11 |
| R15 | I4, I7, I8, I10 | S1, S4, S5, S6 | M1, M6, M10 |
| R16 | I2, I4, I8, I9, I10 | S8, S9 | M2, M4, M13, M14 |

## 7. Assumptions and open questions

### Confirmed product direction

- One Large Bot Ranch widget incorporating Ranch Desk.
- Routine widget operation should be useful without opening the webpage.
- Slightly faster bot movement.
- Grab/drop interaction with meaningful targets, as developed in the discussion.
- This request is to create the master specification, not implement the product.

### Requested concepts captured as proposed contracts

Bot bank, reusable roles/model defaults, shared home storage with per-task projects, direct and passive task pickup, thinking control, provider access warnings, cleanup pen, and behavior controls are represented above. Their detailed policies, data model, and technical enforcement have not been separately approved. The proposed 15% increase is a tuning candidate, not a previously measured result.

### Decisions needed before implementation of affected features

- **O1 — Widget authority:** how is management capability explicitly granted, stored, and revoked? This blocks execution/lifecycle controls, not visual design.
- **O2 — Runtime feasibility:** which agent runtime adapters can dispatch, acknowledge, recover, enforce permissions, select models/effort, and reset context? GPT/DeepSeek/Claude are desired families, not verified integrations. This blocks provider and execution commitments.
- **O3 — Capacity:** choose visible bot count, active membership capacity, bank limits if any, and simultaneous execution limits independently. Existing four-resident behavior is a baseline, not an approved new bank limit.
- **O4 — Scheduling and budgets:** choose task ordering/fairness, hard versus preferred role matching, budget limits, fallback rules, and treatment of unverified model access. Proposed default is no automatic dispatch until required capability/access is established.
- **O5 — Cancellation and retries:** define stop/cancel acknowledgment, handling of partial changes, retry authority, and reassignment of unresolved work. Do not implement automatic retry merely from connection loss.
- **O6 — Workspace policy:** confirm serialized writers as the initial default or specify isolated workspaces and result integration. Decide project registration, allowed paths, and read-only scope/enforcement.
- **O7 — Task ownership and retention:** confirm one local board filtered by project versus separate project boards; choose archive versus deletion and task/session/result retention. Proposed archive preserves active and historical attempt references.
- **O8 — Context defaults:** confirm Fresh per task as the default, project-switch reset, the meaning of Manual policy, durable-memory retention, and deferred-operation precedence/cancellation.
- **O9 — Device interaction:** validate available Large geometry, readable excerpts, touch targets, drag threshold, cross-view task dragging, and exact walking multiplier on hardware. Define any user confirmation needed for start-on-drop without making all routine actions cumbersome.
- **O10 — Migration:** choose old Desk route/client behavior and control enrollment while preserving resident histories and existing setup access. Decide any settings that can transfer versus require explicit user selection.
- **O11 — Structured attention:** define which questions/approvals can be answered safely inside the widget. Until a typed, authenticated interaction is supported, show the reason and explicit terminal access; do not claim full terminal interaction from an excerpt.

**Readiness verdict:** ready for product/specification review; not yet implementation-ready for task execution. Resolve the relevant open contracts and complete capability/boundary evidence before approving an implementation plan. The prior behavior measures and board investigation remain evidence sources and obligations, not proof of the new system.


## Accepted amendment: Companion Board and base project (2026-10-10)

This supersedes earlier proposed task-authoring, bot-model and context controls.

- Companion owns a dedicated Board page with light neon sticky notes against black. It authors tasks and supports drag assignment, Start, released pickup, review, rest and clean. Drag assignment alone does not launch work.
- Widget Tasks changes only the right-hand Desk. The ranch remains visible; authoring belongs to the companion.
- Setup selects home/base project, the default starting folder. Bots may work elsewhere but every launch receives home and handover instructions. Home stores reusable profiles, role/loading instructions, sanitized task records and handovers. Private credentials stay in companion state.
- Roles/personality own model preference and instructions. Profiles may select an additional Markdown instructions file; there is no separate bot-model selector.
- Context is Per task or Per session. Per session retains context only within the same project. Project changes, role/instructions changes and cleanup start fresh. Returning to an earlier project after a switch also starts fresh.
- Clean requires verified closure and no unresolved task; it preserves history/files. Retired closed bots can be deleted without deleting history/evidence.
- Six active ranch positions; sixteen colors. Home profiles retain settings and color for reuse/import.

Proof: library/manager tests cover persistence, deletion, context isolation, home instructions and handovers. Browser tests cover Board authoring/assignment/cleanup and persistent widget ranch visibility. Physical iCUE touch and live provider access require separate validation.


## Accepted amendment: playful ranch and authoritative work queues (2026-10-10)

The user approved the seven-point design following the 0.8.0 review.

R1. Ranch pokes, pickup and placement are visual interactions and never change execution, assignment, pickup eligibility, membership or context. Dropping on the Desk selects inspection; explicit controls perform work mutations.
R2. Desk selection remains pinned. Now shows actual running work, Next shows ordered released tasks, Needs you shows review/warnings/questions. Technical statistics are expandable.
R3. Companion offers Workflow and Bot queues views of the same task records. Inbox is unreleased pending work; Ready is released pending work. Draft instructions may be empty, but execution/release requires instructions.
R4. Tasks can be assigned to one bot or a shared pool. Assignment appends; reorder is explicit and revision checked. Assigned ready work precedes shared work; a blocked assigned head is explained and not silently bypassed.
R5. Explicit dependencies wait for accepted Done; order alone is not a dependency. Reject missing dependencies and cycles.
R6. Finish then rest affects only future pickup. Stop requires confirmation and verified runtime closure. Changes to role/context/model apply to subsequent attempts. Cleanup preserves saved history.
R7. Role determines work instructions/model; visual personality is independent. Completion remains Review until accepted, and handover evidence must reflect actual reported results.

I1. Gestures do not call work-mutation endpoints. I2. Active/unresolved attempts cannot be reassigned/edited/archived. I3. Claims use settings snapshotted at launch. I4. Stale queue revisions cannot overwrite another move. I5. A stop request is never presented as successful before closure is verified.

S1. Preserve stored todo status and releasedForPickup compatibility; add queueOrder and dependsOn. S2. Manager validates and owns all queue mutations; UIs project the same state. S3. Existing terminal adapter remains conservative: new dispatch waits for verified terminal closure. It cannot safely commandeer a user-open session.

M1. Node tests cover draft/release, reserved-before-shared scheduling, dependency acceptance/cycles, durable reorder/conflicts, active-task protection and stop failures. M2. Browser tests assert harmless pointer/native gestures, Desk selection, queue assignment/reorder and explicit controls. M3. Build tests include queue policy module; verify preview layouts at Large/XL.

Traceability: R1->I1->S2->M2; R3/R4/R5->I2/I4->S1/S2->M1; R6/R7->I3/I5->S3->M1/M2.


### Accepted amendment: idle work checks (2026-10-10)

The user approved Check for work and equivalent automatic idle checks. Ordinary pokes remain visual. Checks never interrupt busy work, queued messages/jobs or runtime-reported questions/approvals. Explicit checks persist until idle without altering pickup preferences or releasing held tasks. Claims use existing queue order, dependencies, workspace ownership and attempt evidence. Runtime authorization is private to a launch, separate from widget/status credentials.

Installed OMP exposes newSession only to command handlers and no background project-switch API. The launcher keeps the terminal window/binding and hands off between OMP processes at an idle boundary. Saved task context resumes only when policy permits; project changes start fresh. Lost handoff/acknowledgment blocks as unresolved. Existing terminals require one upgrade restart. Direct Start remains the closed-terminal route.

Proof: ranch-work-check.test.cjs covers authentication, ownership and context policies; ranch-work-runtime.test.cjs covers question/job/message deferral, busy races, environment handoff and extension integration; ranch-board.spec.cjs covers the UI action. No live model calls are used in automated tests.

Verification for 0.10.0: final unit suite 96/96; full browser suite 52/52; Windows terminal argument/color checks and .NET companion validation passed. One intermediate touch layout regression was fixed and retested. Shell syntax and release packaging passed. No live model requests or running-instance replacement. Matching widget/companion packages are under artifacts/releases/bot-ranch; companion is also extracted into bot-ranch-companion-0.10.0.


### Accepted amendment: one botRanch entry point (2026-10-10)

Install at LocalAppData/Programs/botRanch with a stable Start menu shortcut and versioned internal releases. The shortcut opens the companion Board, reuses a matching authenticated instance, and replaces an older supported instance only while idle. Never terminate an unrelated port owner or replace an active/uncertain task runtime. Legacy pre-0.11 companions need a one-time manual stop.

One user-facing connection key enables widget activity and management. Private admin/runtime credentials remain automatic. Existing connection keys migrate without re-pairing; legacy management tokens remain accepted for older widgets. The selected bot home initializes bots, roles, tasks, sessions and handovers without overwriting existing user guidance. Settings sections: Home & folders, Bots, Roles, Connection, Diagnostics. Archive/Hidden/Delete views and the visual task map are separate pending work.

Verification for 0.11.0: 105 unit tests and 53 browser tests passed; native color/terminal checks and .NET companion validation passed. Release packaging passed. Installed at LocalAppData/Programs/botRanch with a verified Start menu shortcut. Backed up the existing ranch state and replaced only the verified idle 0.9.0 companion; live 0.11.0 preserves the home, Pickle profile and archived task. All five home folders exist. Pickle's terminal was left running; restart it once to load the new runtime extension.

0.11.1 correction: /control OPTIONS preflights must succeed without bearer credentials; actual control requests still require authorization. Regression reproduced 401 before the fix and passes afterward for GET/POST preflights, including private-network headers and unauthorized actual requests. Ten focused authentication, installer and upgrade tests passed; release build passed. Installed 0.11.1, leaving live 0.11.0 running because Pickle has active work. Activate via the stable launcher after work finishes.

### Near-term fix: Thinking uses working animation (2026-10-10)

Status: planned, not implemented. User requests that a thinking bot look visibly at work. Keep the truthful Thinking status and runtime state, but map thinking to the same workshop action and working animation as working/running rather than the research-station presentation. Apply to both ranch maps, preserving quiet mode, reduced motion and animation pause. This is presentation only: no changes to task pickup, busy detection, interruption or context. Verify that a thinking bot visibly performs the working action with normal motion enabled and still displays Thinking in its status/details.

### Planned change: automatic acceptance with opt-in human review (2026-10-10)

Status: planned, not implemented. The board defaults to accepting successful bot task completions automatically; routine tasks do not require an operator review step. Add a per-task Human review checkbox, off by default, visible in task creation/editing and indicated on task cards when enabled.

When Human review is off, a verified successful runtime completion moves the task to Done/accepted and satisfies downstream dependencies. When it is on, successful completion moves the task to Review; only human acceptance satisfies dependencies. Preserve completion summaries, handovers and attempt history in both cases. Failed, interrupted, blocked or unresolved attempts must never be auto-accepted. This policy controls completion review only, not tool permissions or runtime approval prompts.

Changing this setting must not silently accept a task already awaiting review; existing Review tasks retain their review requirement unless explicitly accepted. Existing accepted tasks stay accepted. The UI must distinguish automatic acceptance from human acceptance. Verify both completion paths, dependency release, and failure/unresolved protection before shipping.
