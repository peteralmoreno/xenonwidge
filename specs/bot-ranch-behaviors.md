# Bot Ranch behaviors and map workstations — PRISM

Status: approved by the user on 2026-10-10. Specification only; approval does not authorize implementation.

Context: `docs/guides/bot-ranch-behavior-consolidation-plan.md` contains the earlier investigation and implementation proposal. This specification is the approved behavior contract; it is not an implementation plan.

## 1. Problem

Bot Ranch repeats state interpretation across lifecycle handling, movement, labels, sprites and animation. Workstation coordinates are also defined separately for movement and scenery.

Affected systems: Bot Ranch's resident simulation and presentation, the companion's state projections, and Ranch Desk's shared status presentation.

Desired outcome: bots consistently visit the active map's designated station for their activity, while existing terminal statuses and interactions remain intact.

Scope: behavior-policy consolidation, activity-specific map routing, matching station artwork and destinations.

Non-goals: implementation during this specification phase; new map-editor UI; new activities; changes to terminal launch/recovery, selection, focus or pairing; merging Ranch and Desk.

## 2. Requirements

- **R1 — Activity-specific destinations.** Each supported map designates a workstation for reading, researching, writing, thinking, running and generic working. Multiple activities may share a station.
- **R2 — Correct work routing.** A working bot travels to the station designated by its activity and active map. Choosing a destination does not change its reported activity.
- **R3 — Transition handling.** Changing activity or map updates the destination at the next behavior update permitted by existing touch/dialog holds. Pause and reduced motion retain static destination poses.
- **R4 — Matching scenery.** The bot's destination corresponds to the visible station. Multiple residents at one station retain separate standing positions.
- **R5 — Non-work behavior.** Waiting/error bots use the attention bell; ready/done bots roam and then sleep; offline bots use their charging docks.
- **R6 — Preserved presentation.** Labels, props, badges and completion celebration remain distinguishable. Quiet, Pause and reduced motion do not hide status or attention information.
- **R7 — Complete delivery surfaces.** Routing and presentation work in both standalone and companion-hosted Ranch. Desk continues to show terminal activity rather than simulated ranch modes.

## 3. Invariants

- **I1 — Status integrity.** Preserve all 11 public terminal states, event-specific details and overlapping tool/approval precedence. Animation must not invent terminal activity.
- **I2 — Identity and geometry.** Resident slots remain independent of color. Preserve existing pace, bounds and same-station spacing.
- **I3 — Lifecycle integrity.** Preserve heartbeat freshness, idle/sleep timing, completion identity, managed-session ownership and conservative terminal recovery.
- **I4 — Interaction and privacy.** Selection does not implicitly focus a terminal. Authentication, pairing and preview/metadata handling remain unchanged.
- **I5 — Routing integrity.** Every work route references a station defined by that map. Unsupported map definitions must not silently send working bots home.

## 4. Solution

The following consequential decisions were approved with this specification. They describe responsibilities and ownership, not implementation steps.

- **S1 — Shared state policy.** One descriptor owns reusable state labels, attention membership and presentation identifiers. Keep event reduction in `BotState`; do not introduce a generic state-machine framework. This removes repeated policy without flattening lifecycle transitions or concurrent tool state.
- **S2 — Map-owned routing.** Each map owns `stations` and `workRoutes`. Bot activity selects a route; the route selects a station. Map data owns coordinates, not individual bot behaviors. Activity-specific routing was explicitly selected instead of one workstation for all working bots.
- **S3 — Shared movement families.** Keep one movement engine with work, attention, idle, sleep and offline families. Waiting/error share movement while retaining distinct status and badges. Celebration remains an event overlay. This consolidates common actions without reducing the public activity vocabulary.
- **S4 — Shared scene geometry.** Station artwork and bot destinations use the same map-coordinate source. Slot-specific standing offsets remain movement-engine responsibility. This prevents scene/target drift without collapsing multiple residents into one position.
- **S5 — Preserve boundaries.** Lifecycle, movement and rendering remain separate. Desk shares appropriate status policy but does not acquire a simulation. A merged Ranch/Desk controller is excluded because their representations and interactions differ.

Initial routes for Meadow and Courtyard remain:

| Activity | Designated station |
| --- | --- |
| reading | Reading nook |
| researching | Research station |
| writing | Writing bench |
| thinking | Research station |
| running | Workshop |
| working | Workshop |

Meadow and Courtyard retain their different station coordinates. Future supported maps may designate different stations through map definitions, subject to R1 and I5.

## 5. Measures

These are future acceptance evidence, not claims that the proposed design is implemented.

- **M1 — Routing matrix.** Exercise all six work activities on each supported map. Include a map definition with a different activity-to-station assignment; observe the correct destination and unchanged activity.
- **M2 — Transition scenarios.** Change activity during travel and after arrival; change map while working. Verify destination updates, including touch/dialog holds and static motion modes.
- **M3 — Visual geometry.** Observe station artwork and destinations together, including four residents sharing a station and supported responsive layouts.
- **M4 — State regression.** Exercise tool overlap, approvals, continuation, completion, idle/sleep cutoff, waiting/error and explicit/stale offline states.
- **M5 — Motion and interaction.** Verify Quiet, Pause, reduced motion, one-shot celebration, selection without focus, and distinct status labels.
- **M6 — Delivery check.** Load standalone and hosted widgets; verify dependencies, Ranch routing and unchanged Desk presentation.
- **M7 — Definition integrity.** Reject a map definition with a missing route or nonexistent station before accepting it as a supported map.

## 6. Traceability

| Requirement | Protected by | Solution | Evidence |
| --- | --- | --- | --- |
| R1 | I5 | S2 | M1, M7 |
| R2 | I1, I5 | S1, S2, S3 | M1 |
| R3 | I2, I3 | S2, S3 | M2, M5 |
| R4 | I2 | S4 | M3 |
| R5 | I1, I3 | S3, S5 | M4 |
| R6 | I1, I3, I4 | S1, S3, S5 | M4, M5 |
| R7 | I1, I4 | S1, S5 | M6 |

## 7. Assumptions and open questions

Confirmed through the user's choices and approval:

- Workstations are activity-specific per map, rather than one workstation for every working bot.
- Maps remain developer-authored definitions; no user-facing routing editor is added.
- Invalid map definitions block acceptance of that map; there is no silent destination fallback.
- Initial routes, preservation guarantees and solution decisions above are approved.
- Approval authorizes saving this specification only. Implementation requires a separate request.

No blocking specification decisions remain following approval. The exact code organization and mechanics of rejecting an invalid developer-authored map remain implementation choices within this contract.

Earlier investigation smoke runs establish the current behavior baseline only; they do not prove this consolidation. The measures above remain unexecuted against the proposed solution.
