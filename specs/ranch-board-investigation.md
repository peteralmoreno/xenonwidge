# PRISM: Local Ranch Board investigation

Status: approved investigation contract, 2026-10-10. The investigation has not been executed. This specification does not authorize implementation.

## Problem

The existing Bot Ranch setup page already manages residents, terminals, readiness checks and pairing. A separate task application could duplicate navigation and configuration.

Investigate expanding this HTML application into a local Ranch Board while retaining its setup responsibilities.

**Affected users and systems:** the ranch operator, companion setup page, resident profiles, Bot Ranch and Ranch Desk.

**Desired observable outcome:** an evidence-backed recommendation and approval-ready feature specification.

**Scope:** local kanban, existing-page integration, task persistence, resident associations and preservation of current controls.

**Non-goals:** implementation, GitHub/cloud synchronization, autonomous scheduling, prompt dispatch, or creating another native/iCUE widget.

### Existing evidence to start from

These references establish the inspected baseline, not a completed investigation:

- [Setup HTML](../sources/omp-bot-companion/setup/index.html): resident controls, readiness checks, pairing, sleep settings and confirmation dialogs.
- [Setup application](../sources/omp-bot-companion/setup/app.js): admin-token handling, authenticated requests, resident rendering and refresh behavior.
- [Companion HTTP server](../sources/omp-bot-companion/server.mjs): `/setup/`, `/ui/` and `/desk/` hosting; authenticated admin actions and widget selection/status routes.
- [Setup launcher](../sources/omp-bot-companion/open-setup.mjs): companion readiness and the existing `/setup/#admin=...` launch target. Do not include actual token values in investigation artifacts.
- [Resident manager](../sources/omp-bot-companion/manager.mjs): resident identities, configuration persistence and terminal lifecycle operations.
- [OMP extension](../sources/omp-bot-companion/extension.mjs): activity/preview publication; not a task-dispatch implementation.
- [Release builder](../tools/build.cjs): explicitly listed companion setup files and widget assets.

## Requirements

**R1 — Current boundaries.** Document existing page responsibilities, authentication, launcher behavior, data ownership and release packaging, citing source evidence.

**R2 — Page integration.** Compare Board/Residents/Settings sections in the existing application against a separate board route within the same companion. Recommend one; identify navigation, editing and accessibility tradeoffs.

**R3 — Task behavior.** Propose observable behavior for creating, editing, moving and removing tasks, including empty/error states. Identify necessary fields and unresolved workflow choices.

**R4 — Persistence.** Compare appropriate local storage approaches. Specify proposed behavior across page reload, companion restart, failed saves and concurrent browser views.

**R5 — Resident association.** Define assignment/unassignment behavior, stable resident identity, nickname/color changes and disconnected residents. Keep association distinct from bot execution.

**R6 — Existing workflows.** Identify how resident editing, launch/resume, new-session confirmation, close/focus, readiness checks, pairing and sleep settings remain available.

**R7 — Decision package.** Deliver a recommendation, risks, open questions and a traceable feature-spec draft. Distinguish observed facts from proposed behavior.

## Invariants

**I1 — Specification boundary.** No runtime changes or implementation are authorized by this document.

**I2 — Local task data.** The proposed board must not require a cloud task service. Existing OMP model-provider networking is a separate concern.

**I3 — Preservation.** Recommendations must retain existing resident-management capabilities and interruption safeguards.

**I4 — No execution implication.** Assigning or moving a card is not permission to send prompts or start/interrupt bots.

**I5 — Honest evidence.** Distinguish existing behavior, proposed decisions and unverified assumptions; do not describe mockups as runtime proof.

**I6 — Sensitive data.** Investigation artifacts must exclude credentials, private conversations and real task content.

## Solution

**S1 — Fixed scope.** Investigate a local board associated with the existing companion; no GitHub integration.

**S2 — Preferred, not yet selected.** Expand the existing setup application with Board, Residents and Settings navigation. Retaining `/setup/` and its launcher is a compatibility preference, not a predetermined investigation result.

**S3 — Storage proposal.** Evaluate companion-owned durable task storage against browser-only storage. Record ownership, failure handling and concurrent-edit tradeoffs before selecting a format.

**S4 — Association proposal.** Use stable resident IDs for assignments; names and colors remain presentation. Keep task workflow state separate from observed bot activity.

**S5 — Interface boundary.** Assess useful selection/context links to Ranch and Desk without assuming those widgets need modification.

## Measures

These are acceptance measures for the investigation deliverable. They are not claims that a board has been implemented or verified.

**M1.** An evidence table covers current hosting, authentication, launch, persistence and packaging boundaries.

**M2.** An annotated navigation sketch demonstrates access to both the proposed board and every retained setup function.

**M3.** Task scenarios cover creation, edit cancellation, movement, removal and unavailable-companion behavior.

**M4.** A persistence decision table addresses reload/restart, save failure and conflicting edits without claiming an unbuilt backend has passed.

**M5.** Assignment scenarios cover renamed/recolored/offline residents and demonstrate that assignment does not trigger execution.

**M6.** The recommendation and feature draft label unresolved choices and trace every requirement to evidence.

## Traceability

| Requirement | Invariants | Solution | Measures |
| --- | --- | --- | --- |
| R1 | I1, I5, I6 | S1 | M1 |
| R2 | I3, I5 | S2, S5 | M2 |
| R3 | I4, I5 | S2, S4 | M3 |
| R4 | I2, I5, I6 | S3 | M4 |
| R5 | I3, I4 | S4, S5 | M5 |
| R6 | I3 | S2, S5 | M1, M2 |
| R7 | I1, I5, I6 | S1–S5 | M6 |

## Assumptions and open questions

- Expanding the setup application is the preferred direction, not yet a fixed layout.
- Proposed initial columns: **To do, Doing, Review, Done**. Whether Blocked is a column or marker remains open.
- One shared local board versus boards per project remains open.
- Task removal semantics and resident reassignment policy remain open.
- Browser keyboard/mouse editing is assumed; touch support needs explicit assessment.
- Task execution automation is excluded from this investigation unless the user broadens its scope.
