# Playful Ranch and Work Queues Implementation Plan

**Goal:** Implement the approved October 10 design: harmless ranch play, a pinned inspection Desk, and companion-owned ordered work queues.
**Architecture:** Keep the manager authoritative for task state, readiness, dependencies and queue order. Both UI surfaces read the same records; ranch gestures never mutate work. Existing todo status remains stored for compatibility; readiness separates Inbox from Ready.
**Tech Stack:** Existing Node companion, OMP extension, vanilla browser UI, Node tests and Playwright.
**Spec:** User-approved seven-point design in conversation; this document records its execution contract.

- [x] Backend: persist queue order and explicit dependency IDs; ordered assigned queues before shared tasks; held tasks never auto-run; unmet dependencies wait for accepted Done; expose waiting reasons; prohibit edits to active attempts; test revisions and migration.
- [x] Companion: Workflow Inbox/Ready/Working/Review/Done plus attention, Bot queues view, drag task assignment/reorder and keyboard equivalents, readiness and dependency controls, explicit rest/stop/clean; retain neon notes.
- [x] Ranch: visual poke/drag and Desk selection, no action drop zones, pinned Now/Next/Needs you, expandable metadata, explicit next-task settings/rest/stop/clean. Separate visual personality from role.
- [x] Review/tests: harmless gesture assertions, ordered queues/dependency tests, browser workflows, matching release build and documentation.

Constraints: preserve existing changes, credentials, history, profile IDs and live terminals. No live paid requests or deployment. Stop is confirmed through existing native close checks; never label an unconfirmed interruption paused. Current adapter requires verified closure before dispatch; never take over an arbitrary open session. Assignment is separate from release and from execution. Queue order is not dependency.

Ruling: Work in the current shared workspace because it contains the user's entire authorized, uncommitted feature set; isolated clean checkout would omit it. Delegate non-overlapping UI files; root owns manager/API/storage tests. Use explicit buttons for consequential actions; provide observable failure reasons.


Review resolutions:
- Preserve runtime acknowledgment/completion when terminal binding arrives later.
- Serialize retries and revalidate after terminal-status awaits.
- Reject overflowing follow-ups before mutating Review state.
- Snapshot role/read-only defaults per attempt; stale stop confirmation cannot stop a newer task.
- Exclude active attempts from reordering while allowing pending tasks to move beside them.
- Treat project contention as a temporary wait; uncertain prior attempts block that bot across projects.
- Keep pending work visible beside a current task and preserve unfinished dependencies in the editor.
- Display full reported handovers on expansion; no hidden reasoning or tool payloads enter the handover.

Ruling: retain the existing runtime adapter's verified-close requirement rather than automatically closing a live OMP conversation. The Board explicitly reports this wait. This limitation is documented in the release notes.

Verification: 84/84 Node unit tests, 19/19 integrated Ranch browser tests, Windows native terminal-argument and color checks passed. After the final Desk queue-label fix, the five setup/Desk browser tests passed again. Matching Bot Ranch widget and companion 0.9.0 packaged successfully; existing icueEvents packaging warning remains. No live installation or provider calls performed.
