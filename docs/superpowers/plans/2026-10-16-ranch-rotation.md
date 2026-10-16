# botRanch next rotation implementation plan

> **For agentic workers:** Use superpowers:subagent-driven-development. Track progress here and in `.superpowers/sdd/ranch-rotation/progress.md`. Do not repeat completed tasks.

**Goal:** Deliver sidebar-first bot management, an expressive observational Ranch, reliable reporting/handoff, and automatic scoped task context.
**Architecture:** Keep companion authoritative. Extend the existing runtime protocol with durable replayable delivery; separate public reporting from task execution credentials. Use fresh task conversations with bounded family/dependency handovers. Existing SVG/DOM Ranch rendering remains local and lightweight.
**Tech stack:** Node ES modules, React/Electron, vanilla SVG/CSS/JS, node:test and Playwright on Windows.
**Spec:** `specs/bot-ranch-next-rotation.md`.

## Global constraints

- Work only in D:/source/xenonwidge/.scratch/ranch-next-rotation. Never read/write live settings for mutation, kill live processes, install, launch bots or publish.
- Preserve busy sessions, current task ownership, human review and exclusive workspaces. Tests use temporary data, mock native processes and ephemeral ports.
- Version target 0.20.0. Root owns version/build/release/integration and full browser suite.
- No new dependencies or LLM calls. Color/theme/personality do not change execution semantics.
- PM means Project Manager. Stable role ID is pm. New theme name is Crimson, with burgundy/crimson/charcoal/ivory, no coral/salmon.
- Motion is one Lively/Calm/Still control. Universal bell wakes sleeping residents only, never charging/off or working; do not implicitly renew Pipeline budgets.
- Each implementer runs meaningful failing tests first and scoped checks, then reports files and evidence. Do not commit concurrently; root commits integrated work.

## Review focus

- Response lost after task reservation: same original runtime can obtain the same handoff, but no other bot or stale launch can claim it.
- Context at project/family boundaries: no old transcript resumes; mutations during dispatch cannot change a frozen attempt's input.
- Existing busy legacy installations: future dispatch migrates safely without overwriting custom roles or active sessions.
- Directly prompted managed sessions: public updates work without task credentials and cannot impersonate another bot.
- All map/theme/motion combinations: six bots remain visible, accessible bell and outer-edge gestures work, status stays truthful.

## Task 1: Ranch presentation and movement (visual agent)

Files: sources/omp-bot/{app.js,index.html,widget.css,world.js,appearance.js,sprites.js}; relevant visual/world tests. Do not edit companion/desktop/backend.
Interfaces: POST control `profiles/wake` returns {requested,acknowledged,pending,skipped,results,message}; use normal controlApi. Root/runtime agent produces route. Personality values calm,curious,cheerful,focused,sociable. Backend emits same status/session shapes plus optional wake info.
- [x] Write tests for one motion control/migration, faster personality motion independent of color, maps/POIs, portrait SVGs, bell sleeping semantics fixture, removal of task/editor UI.
- [x] Implement unified Motion; simplify Ranch (no Tasks pane, bot editing or per-context controls), retain selection/drag/feed/desk status and bell. Prefer removing dead UI paths, not merely hiding inaccessible controls.
- [x] Add Crimson, Arctic, Orchid themes; Glasshouse, Rooftop, Depot maps with distinct artwork/layout; idle POIs and visit behaviors. Working routing stays state-driven. Base pace +50%, Calm dampens, Still honors reduced-motion. Chest/head avatars preserve bot design.
- [x] Attention Bell sends one authenticated universal-wake command and exposes truthful result; separate Needs you link opens Board/attention view without waking. Do not inject task actions or session edits.
- [x] Scoped node tests; prepare browser tests but coordinate with root before running shared Playwright port. Capture L/XL visual examples. Report obsolete tests requiring rewrite.

## Task 2: Automatic context and PM continuity API (context agent)

Files: new focused context/family module(s); manager.mjs constructor/persistence/task-context dispatch block/saveTask/saveProfile/affinity integration; pickup-policy.mjs; board-changes.mjs; agent-api.mjs/agent-catalog.json/ranch-cli.mjs; relevant context/API tests. May edit server.mjs only AI route integration (coordinate with runtime agent). Do not edit extension, work-check, terminal-runner, world or desktop.
Interfaces: preserve publicTask and existing organization APIs. Add family/context endpoints/actions via existing authenticated AI surface with explicit schema/catalog. Runtime claim already returns roleInstructions; include immutable task context there for extension consumption. Root owns bot-library naming and UI controls.
- [x] Test fresh conversations for every new task/attempt across same-family and different-family cases; explicit same-project dependency source assembly; stale preview revisions; no unsafe session reuse.
- [x] Implement stable project-scoped family IDs (migrate legacy name+project deterministically; IDs survive recolor/rename), versioned handovers and automatic defaults. Preserve legacy context setting for record, no live restart. Cap composed handover inputs at 12000 characters, each explicit summary at 4000; expose truncation/source revisions. No paid summarization.
- [x] Use fresh unique attempt session directory. Include current role/project instructions plus family/dependency summaries, labeled untrusted reports with provenance and acceptance. Automatic successful-task handovers use reported resultSummary as report, not fabricated verified facts. No unrelated conversation injection.
- [x] Durable soft family owner recorded after successful accepted/completed work, not mere failed dispatch; preserve eligibility, explicit assignment and existing fairness. No indefinite wait for unavailable owner.
- [x] PM can inspect family/context, set membership via existing task edits, set/clear preference, publish/reset handover, attach explicit context references and preview next-task context. Existing Organize/Operate gates and atomic state/revision checks apply. Keep history, never rewrite active context. Cross-project context must be explicit in operation, never automatic.
- [x] Add focused/sociable to manager personality allowlist; new/default effective context is automatic. Accept legacy policy input compatibly but do not resume legacy task transcripts. Bump persisted schema if older app could misinterpret new records; active attempts preserved.
- [x] Run scoped context/API/pickup tests; report exact API and new modules for root packaging/docs.

## Task 3: Reliable handoff, reporting and universal wake (runtime agent)

Files: extension.mjs, work-check.mjs, terminal-runner.mjs, new focused runtime module(s); manager.mjs runtime auth/status/claim/pollWork/handoff return/reconcile/wake methods ONLY; server.mjs runtime/control routes ONLY; pipeline-manager.mjs if necessary; runtime/report tests. Coordinate manager surgical edits with Task 2; never whole-file overwrite.
Interfaces: `POST /control/profiles/wake` + admin equivalent return {requested,acknowledged,pending,skipped,results,message}. Keep old ring compatibility. Add AI wake operation through Task 2 agent or notify root exact adapter. Public planning snapshot should expose safe handoff/report diagnostics; never tokens/raw outbox.
- [x] Reproduce dropped response after pollWork reserves new launch: old runtime retry must recover same handoff, not 401/stranded attempt. Tests also cover duplicate delivery/ack, competing poll, restart, stale launch, busy editor/async work and claim expiry.
- [x] Persist private replayable reservation/delivery with bounded lifetime and source launch/token verification. Acknowledge receipt/claim phases idempotently. Never resend secrets to unauthorized callers or reassign uncertain executions. Show delivery/claim/start timeout reasons and conservative recovery. Work checker shutdown must be confirmed idle and handle retry/error without silent permanent stall.
- [x] Register ranch_status for normal authenticated managed sessions as well as task runtimes. Session reporting uses bot-bound runtime identity; task-linked reporting remains attempt-owned. Add ordinary-session prompt hint, acknowledgments and safe reporting diagnostics. No automatically copied private terminal text.
- [x] Wake only genuinely sleeping connected residents; off/charging and working excluded. Preserve pickup pause, held tasks and autoPickup. Sleeping Pipeline may receive one same-job status check without new job/new monitoring budget. Report requested vs actual acknowledgment honestly, with cooldown.
- [x] Run targeted runtime/replay/identity/status/wake tests, no live bot/process interactions. Report safe public fields and modules.

## Task 4: Sidebar, naming, integration and release (root)

Files: desktop FloatingTaskDock/SidebarPanels/dock.css/sidebar-model; bot-library.mjs/setup UI; docs/PM skill/build allowlist/version manifests; integration tests.
- [x] Crimson sidebar accents, Bots before Board. Remove normal per-task/per-session selector, describe automatic family handover continuity. Add five personality choices with visible hints; Factory still creates/edits bots.
- [x] Project Manager naming in generated defaults/current docs/AI Sync; migrate only known generated display name, preserve custom instructions and stable pm ID.
- [x] Integrate new API/modules, public diagnostics and PM skill; ensure public snapshots/receipts strip credentials/context bodies where appropriate.
- [x] Independent code review, scoped fixes; full npm test after integration, visual inspection L/XL, build:ranch 0.20.0; ZIP allowlist/secrets audit, SHA256s.
- [x] Commit feature branch, leave live installation untouched. Deliver installable artifact and clear tested limitations; no push/publish unless asked.


## Integration evidence (2026-10-16)

- Node suite: 288 passed; final session-to-task status attribution regression also passed after the last ownership hardening.
- Browser suite: 102 passed on full run; one obsolete Ring all label expectation failed. Updated expectation to Wake sleepers; targeted rerun passed (103 scenarios covered). Matrix covers 60 map/theme/size combinations.
- Native terminal argument/setup checks and .NET audio companion checks passed. Hidden Electron desktop smoke passed; current live app/bots were not touched.
- Independent review fixes: claim-client event/report ownership; ordinary-session task attribution denial; acknowledged sleep-clock reset including Done; atomic stable-family presentation updates and sibling revisions.
- Build: botRanch 0.20.0 companion ZIP and iCUE widget; 174 ZIP files match release allowlist, private-store filename and changed-source credential-pattern checks clean. New runtime/context modules match source in ZIP. SHA256SUMS generated.
- Limits: physical iCUE touch and real provider runtime behavior remain field validation. This release preserves unresolved work ownership instead of guessing whether execution stopped. Install and safe session reopen are operator actions after current work finishes.
