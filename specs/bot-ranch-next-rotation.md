# botRanch next rotation: sidebar, reporting and context

Date: 2026-10-16 (America/Chicago)
Status: implementation authorized on 2026-10-16. Proposed details are resolved in the implementation plan; live installation remains untouched. UI requests below are confirmed user direction; context design and API names remain proposals. The live session must remain untouched until the user chooses to update.

## 1. Problem

Everyday management now happens in the desktop sidebar. The Ranch should emphasize bot activity, short public updates and playful interaction. Its embedded task and profile controls duplicate the sidebar and make context management feel more complicated than it should be.

The operator observed no updates from Sasha and wants predictable continuity for related tickets without carrying unrelated conversations into new work. A Project Manager should coordinate this through the companion's authoritative API rather than requiring users to understand session policies.

Scope: next-release visual cleanup, status reporting coverage, automatic family continuity, PM API/skill documentation and safe migration. This note does not install, restart, change permissions, edit live tasks or interrupt bots. It revises the product direction in the older master spec toward sidebar management and an observational Ranch; it does not retroactively claim that spec has been implemented or approved in full.

### Evidence gathered without changing the live session

- A read-only query of the default local companion found Sasha connected, zero retained posts attributed to Sasha, no Board tasks currently assigned to Sasha, and 18 retained posts overall. This does not establish exactly how Sasha's work was initiated or rule out other delivery problems.
- `extension.mjs` registers `ranch_status` only when task-dispatch identity and credentials are present (`taskRuntime`). A normal managed interactive session lacks that tool. This is a plausible explanation for the observation, not a verified reconstruction of Sasha's session.
- Task prompts ask agents to post milestones; ordinary session role instructions do not currently provide the same reporting path. Assistant prose/terminal previews are not automatically public posts.
- `updates.mjs` acknowledges duplicates and rate-limits successive progress posts inside 15 seconds. Delivery failures do not stop task work. Diagnostics need to distinguish these cases.
- Current per-session history is scoped by bot, workspace, role/settings fingerprint and context epoch, but not by task family. Same-project unrelated tasks can therefore share conversation history under that policy.
- Current sticky scheduling is separate from session reuse. The existing affinity grace is 30 seconds, so it is not a durable family owner.
- The sidebar currently orders Board before Bots. New built-in PM roles are labeled Product Manager.

## 2. Requirements

R1. **Confirmed:** use crimson rather than coral for the desktop bar's red accents. Preserve readable controls and distinguish selection from connectivity/error state.

R2. **Confirmed:** place Bots above Board in the sidebar navigation, including compact and expanded variants.

R3. **Confirmed:** use Project Manager consistently in default UI labels, generated role instructions, the bundled skill and current documentation. Keep the stable `pm` identity and existing assignments; do not overwrite user-authored role instructions.

R4. **Confirmed:** remove the Tasks pane, bot editing, and context/session policy controls from the physical Ranch. Keep activity, selection, recent bot posts and speech bubbles. **Proposed scope:** apply the same simplified presentation to both iCUE and desktop Ranch because they share the same role; leave management in the sidebar/Factory and full Board.

R5. **Confirmed need; proposed behavior:** a registered bot can post a short public update during either a dispatched task or an ordinary interactive session. Reporting shows whether a post was accepted, suppressed, rejected or undelivered. The feed and bubbles use the accepted shared feed, not a second record.

R6. **Proposed:** use one automatic task-context rule, with no per-task/per-session selector in normal UI: each newly dispatched task starts a fresh conversation populated with its own instructions, applicable project/role instructions, explicit dependency handovers, and its own family's concise handover. Active work continues normally within that task.

R7. **Proposed:** related tickets prefer a suitable bot with established family continuity. This preference does not indefinitely wait for a busy/offline bot or override explicit assignment, eligibility, dependencies or fair scheduling. Another suitable bot can continue using the same scoped family handover.

R8. **Proposed:** expose inspectable, revision-checked PM operations for family membership, preferred bot, handovers and next-task context. Show why a bot was selected and exactly which handover revisions supplied context. No API may silently inject new context into a running task.

R9. **Confirmed:** increase bot walking speed. **Proposed starting point:** approximately 50% faster than the current normal pace, then visually tune at Large and XL; avoid simply increasing idle wandering frequency.

R10. **Confirmed:** add movement behavior patterns and explain their visible effects. **Proposed:** choose personality in sidebar Factory with a plain-language hint and a small preview. The Ranch remains free of profile editing controls.

R11. **Confirmed:** the Attention Bell is a universal wake-up for every sleeping bot. Charging means off and is excluded. Working bots continue undisturbed. Show actual wake acknowledgment and pending/unavailable results. Waking does not implicitly launch closed sessions, override paused pickup or release held tasks. Sleeping Pipeline monitors are included; their existing external-job identity and monitoring limits remain authoritative.

R12. **Confirmed:** consolidate Quiet and Animate/Freeze into one visible motion control. **Proposed:** one Motion button opens Lively, Calm and Still choices, with its current state visible; this preserves useful distinctions without two competing buttons. This is a display preference, not a pause-work control.

R13. **Confirmed:** Ranch feed avatars show a close-up of the bot's head and chest, retaining its chosen design and color. Keep the compact message-first feed with name and subdued timestamp; do not show a tiny full-body sprite in each post.

R14. **Confirmed:** offer additional color themes and genuinely different map settings. Keep theme and map independent and preserve saved choices.

R15. **Confirmed:** provide more points of interest that bots can visit. Idle personalities influence visits; task activity still determines work stations. Visits should read as idle animation rather than fabricated work.

## 3. Invariants

I1. No rotation, migration, restart, session reset or bot interruption during this note-taking work. In a future release, migrate at a safe task boundary; retain history and rollback information.

I2. Project and family identity govern automatic context inclusion. A bot identity, matching display name, matching color or shared home folder never authorizes unrelated context reuse.

I3. A handover is a report with provenance, not a higher-priority instruction or proof of success. Preserve acceptance state, human review, unresolved attempts and evidence links. Unreviewed reports must remain labeled as such.

I4. Companion state remains authoritative. PM operations require existing access modes, current revisions and appropriate runtime identity; bots cannot impersonate each other. Changes remain visible in the app and auditable.

I5. Sticky preferences cannot bypass exclusive workspace ownership, active-attempt checks, read-only policy, available models or task dependencies.

I6. Missing status posts and silent agents are never shown as evidence of successful work. Never copy private reasoning, raw conversations or arbitrary terminal output into the public feed automatically.

I7. Animation is a representation of runtime state, not evidence of progress. Personality, color and visual bell reactions must not change task selection, model settings, permissions or actual work. System reduced-motion and saved motion preferences remain respected under the unified Motion control.

I8. An alert request is not an acknowledgment or a completed action. Debounce repeated rings, retain clear per-bot outcomes, and never require bots to abandon their current task to gather at the bell.

## 4. Solution

S1. **UI direction:** use a crimson accent token (proposed base `#DC143C`), reorder Bots/Board, and use Project Manager throughout default surfaces. The Ranch becomes the activity display with its integrated viewing desk. Retain selecting/moving bots and brief updates. Proposed small controls: ring bell and open the bot in the sidebar; move editing, task assignment and context management out of the Ranch.

S2. **Reporting:** provide a bot-owned status channel for authenticated managed sessions, with optional task linkage verified against current ownership. Ordinary session posts have no fabricated task ID. Retain task-scoped authorization for execution events. Give both ordinary and dispatched sessions the same concise public-reporting instruction. Expose last accepted post time and reporting capability/delivery state in diagnostics and PM inspection. Automatic lifecycle notices remain labeled system notices; do not synthesize fake bot progress to fill a silent feed.

S3. **Automatic context recommendation:** preserve useful continuity through an explicit family handover, while creating a new conversation for each task. The handover contains the objective, decisions, verified results, outstanding questions, relevant files, and source task/evidence references. Default assembly includes only the task's canonical project and stable family identity, plus explicitly linked dependency context. Unfamilied tasks get no arbitrary prior conversation. A resumed active task keeps its own conversation; a new attempt after a failed/unresolved run uses recorded evidence and a fresh conversation once recovery permits dispatch.

This trades the convenience of carrying an entire chat for predictable context inputs and easier diagnosis. It cannot guarantee that every sentence in a summary is relevant or true; source references, acceptance state, preview and revision history make that limitation visible. Handover size limits must be enforced and exposed; the exact budget is still to be selected. Do not introduce an automatic paid summarization call without making that behavior explicit.

S4. **Family identity and scheduling:** introduce durable family IDs scoped to a canonical project. Name and color remain presentation properties. Record a preferred bot after successful work, preserving useful affinity beyond the current 30-second grace. Keep preference soft and retain explicit queue/eligibility rules. A bot moving to a different project or family starts with that task's own context. Returning to an earlier family loads its handover, not the intervening conversation. Family reassignment never merges histories silently.

S5. **PM API proposal (names are design placeholders, not existing commands):**

| Capability | Proposed operation and behavior |
| --- | --- |
| Inspect continuity | `family.inspect`: identity, preferred bot, eligibility/fallback reason, handover revisions and source tasks |
| Organize related work | `task.setFamily`: revision-checked pending-ticket family membership |
| Guide assignment | `family.preferBot` / `family.clearPreference`: soft preference; explicit assignments remain authoritative |
| Maintain relevant memory | `family.publishHandover`: bounded, versioned summary with source/evidence references and author; validates scope and review state |
| Reset future family memory | `family.resetHandover`: starts a new revision/epoch for future tasks, preserves history and active attempts |
| Inspect exact next-task input | `task.previewContext`: selected context sources, revisions, size and reasons for exclusion |
| Add intentional context | `task.attachContext`: explicit source references scoped to the task; cross-family/project additions require explicit authorization and are visible, never inferred from color or bot identity |
| Report progress | bot-owned `status.post`: accepts ordinary-session or verified task-linked updates with delivery acknowledgment |

Read operations belong to Inspect; pending organization/handovers use Organize within delegation; execution and lifecycle actions remain Operate. Context reset affects future tasks, not running work. Update the live catalog and PM skill alongside implementation. Decide precise schemas, budgets and access for reset before exposing commands.

S6. **Compatibility:** keep PM IDs stable and preserve custom role content. Save legacy context settings for rollback, remove normal UI knobs, and migrate to automatic context only at safe boundaries. Do not reinterpret an in-flight session. Preserve historical task records, raw sessions and handover provenance without automatically loading them. UI-only changes may ship separately from the context migration.

S7. **Movement proposal:** apply a brisker base pace and bounded personality variation. Currently walking traits depend on color, while personality mainly affects poke reactions. Move visible behavior into personality so changing a bot's color does not unexpectedly change its pace. Working bots still head to the appropriate station and show the actual work activity; the extra routes apply while idle.

| Personality | Proposed movement | User-facing hint |
| --- | --- | --- |
| Calm (existing) | Short local walks and longer pauses | Stays nearby and takes short, steady walks when idle. |
| Curious (existing) | Visits different landmarks with brief inspection pauses | Explores the ranch between tasks. |
| Cheerful (existing) | Brisk short routes and small greeting/completion bounces | Moves with a spring in its step and reacts playfully. |
| Focused (new) | Direct travel to work; waits near its station when idle | Takes direct routes and rarely wanders. |
| Sociable (new) | Occasionally approaches an idle neighbor, leaving space | Visits idle neighbors without interrupting their work. |

Pattern selection changes appearance and idle movement only. Landmark visits must not label a bot as researching or working when its runtime is idle. Keep idle behavior deterministic enough to test, avoid crowding/occluding controls, and avoid exaggerated bobbing or excessive motion. Honor existing saved personalities and preserve a default for unknown values.

S8. **Attention Bell:** one click/tap requests wake-up for all sleeping bots using an authenticated companion command. It is not a generic broadcast to already-working bots. Determine sleeping/charging from authoritative runtime state, not just a sprite animation. Brief visual ripple/swing and nearby acknowledgment feedback explain what happened. Example feedback distinguishes wake requested, awake, and unavailable; do not manufacture acknowledgments from animation. Already-working bots continue their work without an injected wake request. Offline/banked bots do not animate as if they received it. Bell feedback is visual by default in every Motion mode; sound is optional rather than required feedback. Still mode uses static acknowledgment instead of a swing/ripple.

An independent Needs you badge near the bell shows real outstanding blockers/questions and opens the sidebar's attention list. Ringing is an outgoing request; the badge represents bots asking the user for help. Keep those hit targets and labels distinct.

Adapt existing Ring all semantics to target sleeping bots and exclude charging/off bots. Current `requestWorkCheck` can delegate to Pipeline wake/check handling. Include sleeping Pipeline monitors in universal wake-up, retaining the same external job and never submitting it again. Proposed limit behavior: perform a wake/status check; an exhausted monitoring budget stays exhausted until further waiting is authorized, rather than granting a new hour implicitly. Existing cooldown/deduplication and access checks should remain authoritative. Expose the same bell command and structured outcomes in the PM catalog, with bounded requests rather than continual ringing.

S9. **One Motion control:** current Quiet slows movement and increases idle pauses; Freeze disables animation. Consolidate these into one small, labeled menu: Lively (normal faster pace and personality actions), Calm (less wandering and no bounces), Still (no walking or decorative animation). All states continue live status/feed updates and keep the universal wake-up bell functional. Migrate saved motion-off to Still, saved Quiet to Calm, and the remaining normal setting to Lively. Honor system reduced-motion as an effective limit and explain that when relevant. Do not introduce a separate sound meaning into Motion.

S10. **Feed portraits:** crop/reframe the existing per-design SVG around the head and chest inside a compact avatar frame, rather than merely shrinking a full-body robot. Use a suitable crop for Classic, PM and Pipeline so faces and distinguishing features remain visible. Match the current bot color/design, keep avatars decorative for accessibility, and retain bot-name selection. No extra animation or larger post spacing is needed.

S11. **Appearance proposals:** add Crimson (deep burgundy, rich crimson, charcoal and warm ivory; no coral/salmon), Arctic (ice blue/steel) and Orchid (plum/lavender) alongside Moss, Sunset and Moonlight. Themes change world/UI colors without replacing bot identity colors or reducing text/status readability. Add Glasshouse (planted paths and garden seating), Rooftop (terraces and a skyline), and Depot (industrial lanes and service bays). Maps need distinct scenery and routes, not just reordered stations. Keep all six bot homes, work destinations and the clickable bell reachable; map changes are presentation changes and never reset tasks or sessions. Exact names/art direction are proposed, not confirmed.

S12. **Idle destinations:** add a fountain, coffee kiosk, noticeboard, planter garden, lookout and spare-parts rack, choosing a sensible subset/visual equivalent for each map. Use reachable destinations, brief dwell actions (look around, inspect a sign, greet a neighbor), visit cooldowns and occupancy spacing. Curious bots favor varied landmarks; Sociable bots favor shared seating/kiosk; Focused bots tend to wait near their work station. Work-state changes take precedence over idle excursions. POIs do not need separate user controls and must not obstruct dragging, portraits/speech bubbles, the bell, or outer menu swipe space. Support every map/theme combination and scaled layouts without crossing non-walkable scenery.

## 5. Measures

M1. Compare compact/tall sidebar and Ranch screenshots: crimson accents, Bots before Board, Project Manager labels, no Ranch Tasks/editor/context controls; sidebar management remains functional.

M2. With temporary profiles, run one directly prompted session and one Board-dispatched task. Each posts accepted public updates visible in the same feed and bubble path. Verify rejected ownership, offline delivery, duplicate/rate-limit acknowledgments and absence of raw private output. Reproduce Sasha's actual path when it is safe and its invocation is known.

M3. Context matrix: same project/same family, same project/different family, different project/same family display name, no family, family rename/recolor, return to a prior family, failed attempt/retry, handover revision change. Inspect assembled context and prove no unrelated transcript is resumed.

M4. Scheduling matrix: available preferred bot, unavailable/busy preferred bot, explicit override, fairness, role/model mismatch, active workspace conflict and human-review dependency. Preference never overrides eligibility or completion requirements.

M5. API tests: stale revisions, duplicates/retries, audit visibility, unauthorized cross-bot status, handover provenance, scope checks and immutable active-attempt context snapshot. Previewed input matches what is launched or dispatch rejects a changed revision.

M6. Migration/rollback test with an active session: no forced restart or altered task; new policy applies at a safe subsequent dispatch, old records remain readable, and downgrade cannot silently reuse incompatible new state.

M7. Compare equivalent routes before/after at Large and XL to confirm a noticeable pace increase without frame-rate dependence, teleporting, overshoot or edge clipping. Preview all personalities while idle and working; verify roles and runtime state remain unchanged, color changes do not change behavior, and system reduced-motion plus Lively/Calm/Still work.

M8. Ring with idle, busy, paused, disconnected, banked and sleeping Pipeline bots. Verify every sleeping bot receives a bounded wake request, charging/off bots receive none, and working bots remain undisturbed. Verify truthful outcomes and no forced launch, pickup override, duplicate external job or implicit monitoring-budget extension. Test keyboard/touch access, repeated-click suppression, menu-edge gestures, and the separate Needs you badge. No live-session mutation is part of this note-taking step.

M9. Verify there is exactly one motion control, its three states are keyboard/touch accessible, legacy preferences migrate correctly, and Still/system reduced-motion suppress decorative motion while status, feed and wake acknowledgments remain live.

M10. Inspect feed portraits for every bot design and representative colors: head/chest visible, no clipped distinguishing features, compact rows preserved, readable name/time, safe text rendering and unchanged selection behavior.

M11. Check each new map/theme at Large and XL with six residents: readable labels, distinguishable bots, reachable work/idle destinations, no scenery crossings or clipped bubbles, menu-edge swipes intact. Verify changing appearance leaves execution/session state unchanged and saved old themes/maps still load.

## 6. Traceability

- R1-R4 -> I1 -> S1/S6 -> M1/M6.
- R5 -> I4/I6 -> S2 -> M2/M5.
- R6 -> I1/I2/I3 -> S3/S4/S6 -> M3/M6.
- R7 -> I5 -> S4 -> M4.
- R8 -> I2/I3/I4 -> S5 -> M3/M5.
- R9-R10 -> I7 -> S7 -> M7.
- R11 -> I4/I7/I8 -> S8 -> M8.
- R12 -> I7/I8 -> S9 -> M9.
- R13 -> I7 -> S10 -> M10.
- R14-R15 -> I7 -> S11/S12 -> M7/M11.

## 7. Implementation decisions

Implementation was authorized by ?okay lets start ipml.? Both Ranch display modes use the observational view; task editing, assignments, interruption and profile editing live in the desktop sidebar. The viewing desk retains selection, terminal focus, latest activity and Board attention navigation.

Every managed task starts a fresh attempt conversation. Family/dependency reports are capped at 4000 characters per summary and 12000 composed characters, with explicit cross-project references and provenance. Schema 3 retains legacy settings and active attempts; manual interactive conversations are not reset merely because a PM edits tickets. Family preference is soft, defaults on, and retains eligibility, bounded fallback and fairness.

Lively uses the 50% pace increase; Calm and Still reduce decorative movement. The five personalities, three new palettes and three new maps are implemented tuning choices. Live provider execution and physical iCUE swipe behavior remain device/runtime checks; automated coverage uses isolated fixtures without changing the user's live session.

## Added implementation requirement: reliable handoff

R16. Eligible released work must move reliably from companion reservation to bot receipt, claim and execution. Retries after a dropped response must return the same reservation rather than strand work or dispatch twice. Show the current handoff phase and the actual blocker. Recovery must never reclaim an attempt whose execution ownership is uncertain. Test response loss, repeated polling, restart, stale launch identity, changed task state, busy/draft input and expired reservations without duplicate execution.


R16 -> I4/I6 -> persisted source-bound delivery and client-bound claim lifecycle -> runtime-delivery and runtime-retry integration tests. Tests cover response loss, restart, duplicate polling/client claims, acknowledgments, expiration and unresolved ownership. Sidebar diagnostics distinguish delivery phase and reporting support.
