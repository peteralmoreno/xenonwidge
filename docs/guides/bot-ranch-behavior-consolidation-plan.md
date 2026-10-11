# Bot Ranch behavior consolidation plan

Status: investigation and proposal only. No runtime implementation changes.

## Decision

Consolidate behavior policy, not terminal states or the two widgets into one controller. Preserve all 11 public states and their meanings. Organize ranch movement around five behavior families: work, attention, idle, sleep and offline. Treat completion celebration as a one-shot overlay, and Quiet/Pause/reduced motion/touch holds as modifiers rather than additional bot states.

The movement engine is already centralized in `sources/omp-bot/world.js`. The useful change is eliminating repeated state interpretation and giving state metadata and scene coordinates clear owners. A generic state-machine framework, separate behavior classes per activity, or a merged Ranch/Desk renderer would add complexity without removing the real duplication.

## Current ownership and evidence

| Layer | Current responsibility | Evidence |
| --- | --- | --- |
| OMP adapter | Filters subagent events, supplies pending-message/async-job context, publishes snapshots and heartbeats | `sources/omp-bot-companion/extension.mjs:29-46` |
| Event reducer | Tool classification, overlapping tools/approvals, retry/compaction, completion/error/abort, timestamps | `sources/omp-bot-companion/state.mjs:1-40` |
| Generic-session projection | Snapshot validation/order, idleSince, 12-second freshness, five-minute retention, focus eligibility | `sources/omp-bot-companion/server.mjs:10-13,42-43,51-59,74-81` |
| Managed-resident projection | Launch identity, heartbeat freshness, managed idleSince, close confirmation, process recovery | `sources/omp-bot-companion/manager.mjs:4,10-20` |
| Ranch simulation | Derived mode, station selection, destination packing, movement, bounds, color pace, hammering | `sources/omp-bot/world.js:2-23` |
| Ranch presentation | State labels, completion identity, touch hold, Quiet/Pause, DOM datasets and animation loop | `sources/omp-bot/app.js:2,28-31,41-43` |
| Sprite/CSS presentation | Props/badges, station art placement, walking/work/attention/sleep/celebration animation | `sources/omp-bot/sprites.js:6-15`; `sources/omp-bot/widget.css:19-25,33-53,74` |
| Desk presentation | Raw state, detail, metadata/preview, attention/done counts, explicit focus | `sources/ranch-desk/app.js:5,44-77,128-138` |

### Existing behavior matrix

| Public state | Proposed movement family | Destination | Distinction to retain |
| --- | --- | --- | --- |
| ready | idle, then sleep | Whole field, then slot home | Ready label; sleep derives from idle time |
| reading | work | Reading nook | Book and reading activity |
| researching | work | Research station | Magnifying glass and scanning animation |
| writing | work | Writing bench | Pencil and writing activity |
| thinking | work | Research station | Thought badge; not the researching prop |
| running | work | Workshop | Terminal prop; hammer only after arrival |
| working | work | Workshop | Generic work/retry/continuation details |
| waiting | attention | Bell | Question/approval label and question badge |
| error | attention | Bell | Error label and exclamation badge |
| done | idle, then sleep | Whole field, then slot home | Persistent done status/badge; one short celebration per completion |
| offline | offline | Slot charging dock | Charging activity, muted sprite, unavailable live metadata |

Today `RanchWorld.mode()` has separate `waiting` and `error` modes, but `step()` sends both to the same bell. Their badges and alert styling already depend on the raw activity, not a separate movement implementation. Combining only their derived movement mode into `attention` preserves the useful distinction.

### Duplication worth removing

- Identical short state-label dictionaries in Ranch `app.js:2` and Desk `app.js:5`.
- State categories independently encoded in `state.mjs`, manager's `active` set, world mode/station selection, sprite conditionals and Desk summary predicates. These categories overlap but are not interchangeable.
- Meadow/Courtyard station centers in `world.js:11-12` repeat station placement in Ranch CSS. Art and destinations can drift independently.
- Freshness uses the same default 12,000 ms in generic sessions, managed residents and managed action confirmation, but is owned independently.

Related duplication exists in the twelve-color palette and the two `appearance.js` files. Leave appearance-controller and palette restructuring outside this behavior plan; neither is required to consolidate bot actions. Likewise, do not expand this into polling/selection transport consolidation.

## Proposed ownership

### 1. One small shared state descriptor

Use a browser-safe, dependency-free `sources/omp-bot-companion/shared/behavior.js` as the canonical source of state metadata. Follow the existing plain-script/CommonJS-compatible pattern used by `world.js`; Node consumers import it and browser consumers receive a global. This avoids a new bundler or a generated second source of truth.

Each descriptor supplies only facts consumed by existing behavior paths:

- Short UI label and default terminal detail. Keep these separate: `Needs you` must not replace `Question waiting in terminal`, and event-specific retry/compaction/approval details remain authoritative.
- Work activity identifier, if applicable; the active map chooses its concrete station.
- Attention membership.
- Sprite prop/badge identifier; SVG construction remains in `sprites.js`.
- Explicit interruption-confirmation membership for the managed close policy.

Do not create one ambiguous `active` flag. Manager currently treats waiting/error as interruption-sensitive; world does not treat them as work. Derive allowed public states from the descriptor keys, while keeping tool-name classification and event transitions in `state.mjs`.

### 2. Keep one event reducer

`BotState` remains the only event reducer. Preserve its precedence:

1. An outstanding approval wins.
2. An active waiting tool wins over other tools.
3. Otherwise the latest-started remaining tool wins.
4. Otherwise use the base lifecycle state.

Retain the tool map and approval set. Do not replace overlapping work with a scalar state or move OMP pending-work detection into the HTTP server. Retry, compaction restoration, abort, continuation and session reset are lifecycle transitions, not animation behaviors.

### 3. Keep ranch behavior resolution and movement in World

Replace separate mode/station interpretation with one resolution path in `world.js`, driven by the shared descriptors, active map and session timing. Resolve work/attention/idle/sleep/offline before movement. For work, look up the activity's station in the active map. Pass the resolved station to `step()` instead of reclassifying the raw state inside it.

Preserve raw `data-state`/`data-activity` for labels, badges and state-specific art. Migrate derived waiting/error modes to `attention` everywhere they are consumed; do not keep old mode aliases. Keep the resolution path allocation-light by reusing immutable descriptor/behavior records rather than building a fresh policy object per bot per frame.

World still owns pixel-speed movement, color traits, whole-field roaming, target completion before retargeting, facing, responsive packing, bounds, home/dock destinations and arrival-dependent hammering. Rendering and completion-event identity stay in Ranch `app.js`/CSS. Desk consumes shared labels and attention membership but does not load the world or replace raw status with Sleeping/Charging.

### 4. Map-owned workstations and scene coordinates

Confirmed direction: activity-specific workstations per map, not one destination for all working bots.

Each map owns two small tables:

- `stations`: station IDs, visible names and scene centers, shared by art placement and movement.
- `workRoutes`: an explicit station ID for each of reading, researching, writing, thinking, running and working.

The state descriptor identifies the activity; it does not hardcode a physical station. Resolve destinations through `activeMap.workRoutes[activity]`, then `activeMap.stations[stationId]`. Maps may route multiple activities to one station, but every work activity must have an explicit valid route. A missing route is a map-definition error, not a reason to send the bot home or silently choose Workshop.

Preserve these routes for Meadow and Courtyard during the consolidation:

| Activity | Meadow station | Courtyard station |
| --- | --- | --- |
| reading | Reading nook | Reading nook |
| researching | Research station | Research station |
| writing | Writing bench | Writing bench |
| thinking | Research station | Research station |
| running | Workshop | Workshop |
| working | Workshop | Workshop |

Their coordinates differ; the routing structure also permits future maps to designate different stations without editing bot movement logic. Station choice does not change the raw activity, prop or badge. Hammering remains restricted to running/working bots at a Workshop after arrival, rather than every activity routed to that location.

Move Meadow/Courtyard centers into static scene data in `world.js`. Apply station/bell art positions from that same data on initialization and map changes, not every animation frame. Re-resolve an existing working bot's destination immediately when its activity or active map changes, including when its behavior family remains work. Remove duplicate CSS map coordinates after every scene consumer is migrated.

Keep slot homes, docks and destination packing distinct from station art centers: four bots at one station still need separate positions. Preserve per-widget appearance storage and Desk's background-only interpretation of a map. Waiting/error still use the bell; idle/sleep/offline bypass work routes.

### 5. Share freshness without flattening lifecycle semantics

Use one companion-side freshness constant/helper for generic and managed sessions and managed close confirmation. Preserve the existing configurable generic `ttl` parameter and exact boundary: a heartbeat age equal to the threshold is live; greater is stale.

Keep generic retention, managed launch/recovery status, identity checks, focus routes and idleSince policies in their current owners. In particular:

- Generic idleSince is preserved when state and startedAt are unchanged.
- Managed active/error/waiting pulses refresh idleSince; stable ready/done pulses preserve it.
- Done sleep timing prefers finishedAt; heartbeats must not postpone sleep.
- Managed offline labels distinguish starting, failed launch, missing extension heartbeat and closed/disconnected. Do not replace them with one generic Offline detail.

These differences are intentional contracts to preserve, not evidence that the server and manager should become one state machine.

## Implementation sequence for a later change

1. **Lock the behavior contract.** Inspect references before changing exported APIs. Extend existing behavioral tests only for uncovered consumer-visible boundaries: approval/tool overlap, attention-state distinctions, sleep cutoff, managed/generic freshness and idle timing. Record current event-specific labels and completion behavior. Do not add tests that merely compare copied tables or source text.
2. **Introduce the descriptor and migrate consumers.** Update `state.mjs`, manager interruption membership, Ranch labels, Desk labels/summary and sprite prop/badge selection. Preserve wire states, snapshots, authentication and detail overrides. Remove superseded dictionaries/predicates after all callers migrate.
3. **Consolidate World resolution and map-owned workstations.** Update `world.js`, Ranch `app.js`, scene positioning and affected CSS/tests together. Give each map explicit work routes and station definitions; use those definitions for both art and targets. Waiting/error share attention movement; reading/research/writing/thinking/running retain their distinct presentation. No other behavior redesign.
4. **Consolidate freshness defaults.** Migrate the existing server and manager freshness checks without unifying idle policies or process recovery. Verify explicit offline and stale heartbeat independently.
5. **Complete source/hosted/package integration.** Extend `tools/build.cjs` to stage the canonical shared asset into both standalone widgets and companion shared files. Add `/ui/behavior.js` and `/desk/behavior.js` routes pointing to that same source/staged asset; load it before consumer scripts in both HTML files. Update explicit release-input lists and affected build assertions. Standalone widgets must resolve the asset locally without relying on a sibling widget or running companion.
6. **Verify the integrated result.** Run focused behavior regressions, launch the actual hosted views, exercise transitions and motion controls, validate both widgets and inspect packaged/hosted dependency loading. Update existing READMEs to explain unchanged terminal states and consolidated internal behavior ownership.

Suggested affected files: companion `state.mjs`, `manager.mjs`, `server.mjs`; Ranch `world.js`, `app.js`, `sprites.js`, `widget.css`, `index.html`; Desk `app.js`, `index.html`; `tools/build.cjs`; relevant existing tests and READMEs. No native launcher, extension event-adapter, saved-settings or pairing migration is expected.

## Acceptance and risks

- **No status loss:** all 11 states retain their labels, props/badges and detail overrides. Unknown browser states retain the current Working label fallback; server validation remains strict.
- **Attention is not work:** waiting/error share bell movement but remain distinguishable, block unsafe unconfirmed managed closure as before, and never become idle/sleep.
- **Concurrent tools stay correct:** finishing one tool reveals the remaining tool; approvals and waiting tools keep precedence; pending async work never produces false completion.
- **Completion is an event overlay:** repeated done polls do not replay celebration; quiet, Pause and reduced motion suppress its animation without hiding done status.
- **Motion semantics stay intact:** Quiet slows roaming without suppressing alerts; Pause/reduced motion use current static destination poses rather than freezing obsolete activity; touch/dialog holds remain effective.
- **Identity and layout stay intact:** colors remain independent of four resident slots; all colors retain their current pace; same-station residents keep separate destinations; resized/portrait layouts stay bounded; Meadow/Courtyard art matches targets.
- **Map routing is authoritative:** all six work activities resolve through the active map; activity/map changes reroute immediately even within the work family. Exercise a map with a different activity-to-station assignment, shared-station packing and invalid/missing routes. Changing the destination must not change the activity's label/prop or make non-workshop work hammer.
- **Freshness and lifecycle stay intact:** exact TTL boundary, explicit offline, higher-sequence revival, generic five-minute expiry, managed duplicate suppression, stale live metadata and launch-status labels remain correct.
- **Packaging is part of the cutover:** source preview success alone is insufficient. Both standalone widgets and companion-hosted views load the shared script in the right order. Remove old duplicate definitions and derived-mode branches, not compatibility shims.
- **No unrelated consolidation:** selection races, focus affordances, appearance storage, authentication, sequence rejection, preview sanitization and native launch/recovery remain unchanged.

Relevant existing coverage: `tests/omp-bot.test.cjs`, `tests/ranch-manager.test.cjs`, `tests/ranch-world.test.cjs`, `tests/ranch-cozy.spec.cjs`, `tests/bot-ranch.spec.cjs`, `tests/ranch-peek.spec.cjs`, `tests/ranch-appearance.spec.cjs`, `tests/ranch-desk.spec.cjs`, `tests/ranch-selection-race.spec.cjs` and `tests/build.test.cjs`. Preserve meaningful observable assertions; remove incidental implementation assertions only if made obsolete by the cutover.

## Investigation verification performed

- Executed the actual `BotState` and World modules. Observed all 11 states' mode/station mappings, overlapping read/write tools, approval override/resolution, remaining-tool restoration, completion, and idle/sleep immediately before and at the 120-second cutoff.
- Started an isolated real `createBridge()` HTTP server on an ephemeral loopback port, published snapshots through authenticated `/snapshot`, and opened the real Ranch and Desk pages in Chromium. No running user companion, terminals or persisted settings were modified.
- Observed reading at the nook, thinking at research, running/generic working at workshop, waiting/error at the bell, done roaming and offline charging. Natural heartbeat expiry also projected residents offline.
- Exercised Quiet, Pause and OS reduced motion; observed stationary poses and retained waiting activity. Observed a Ranch selection synchronize to Desk with Thinking still shown as the raw state. Captured the Ranch surface visually. Neither page reported runtime errors during the smoke.
- Closed browser tabs and the isolated server. No tests, builds, permanent runtime scaffolds or implementation edits were made. Native terminal focus and physical iCUE behavior were not exercised.
