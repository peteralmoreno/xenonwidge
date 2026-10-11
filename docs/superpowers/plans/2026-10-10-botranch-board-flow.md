# botRanch Board Flow Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task-by-task. Track completed steps below. User explicitly requested a Luna implementer; do not substitute a model or spawn further implementers.

**Goal:** Make everyday tasks flow without mandatory review, make related work recognizable, and make bot activity and safe work checking clear.

**Architecture:** Keep RanchManager authoritative for task transitions, acceptance and dependencies. Board UI consumes persisted task metadata; widget animation remains presentation only. Extend existing methods and dialogs rather than creating a second scheduler.

**Tech Stack:** Node ES modules, vanilla HTML/CSS/JS, Node test runner, Playwright, Windows companion.

**Spec:** `specs/bot-ranch-master.md`, specifically the final planned amendments.

## Global constraints

- Preserve existing uncommitted work and user data. Do not reset, commit, deploy, restart the live companion or close bot terminals. User is testing live bots.
- One visible connection key; retain private runtime/admin authentication and the 0.11.1 CORS fix.
- Ordinary ranch taps/drags remain playful. Only the explicit Desk action requests work.
- No changes to approval permissions, context policy, model eligibility or interruption safeguards.
- Archive/Hide/Delete UI and visual dependency-arrow editor are separate pending scope, not part of this implementation.
- Use a 0.12.0 release for this combined change. Build artifacts, but leave installation to the parent after review.

## Review focus

1. Legacy Review tasks must not be silently accepted during migration or editing.
2. A runtime completion must be authenticated and successful before auto-acceptance; unresolved/error attempts remain blocked.
3. Family changes and task edits must preserve revision checks, assignment, history and dependencies.
4. A completion timer must not erase a newer activity, question or error.
5. Polling must not reset an open details dialog, lose typed follow-up text or turn a drag into a click.

## Task 1: Review policy and automatic follow-ups

Files: `sources/omp-bot-companion/manager.mjs`, `bot-library.mjs`, `setup/board.js`, `setup/board.html`; tests in `tests/ranch-runtime-policy.test.cjs`, `tests/ranch-queues.test.cjs` and new focused review-policy tests if needed.

Interface: task `humanReview:boolean` defaults false for new tasks; migration sets missing values true for existing Review tasks and false otherwise. Preserve explicit values on partial updates. Persist acceptance provenance using existing evidence/review fields; use `acceptedBy:'automatic'|'human'` if no existing equivalent. Retain the acceptance evidence shape that dependency eligibility currently checks.

- [x] Add failing tests for successful completion without review -> Done/accepted; with review -> Review; dependency release only after acceptance; unsuccessful/unresolved attempts never accepted.
- [x] Add migration/edit tests: existing Review survives reload and editing; missing fields in older clients preserve policy. Disallow switching off humanReview on an already-Review task rather than silently accepting it.
- [x] Implement policy in `recordTaskRuntimeEvent` at verified successful completion. Keep handover wording accurate for both paths.
- [x] Add Human review checkbox to task editor, default off, with clear short explanation. Expose acceptance provenance in details.
- [x] Follow-up creates a NEW task, preserving the parent's history. Inherit project, family, assigned bot, model/effort and review policy. Set `releasedForPickup:true`, append to assigned/shared queue, link `parentTaskId` and depend on parent acceptance. Preserve the parent's Review/Done decision; never fake parent acceptance. Allow creating follow-ups from Done as well as Review.
- [x] Use existing review endpoint/action; enforce revisions, reject empty follow-up instructions, persist once before scheduling pickup. Test release, lineage, dependency gating, assignment and stale submissions.
- [x] Run targeted Node tests and adjust older tests that intentionally expected mandatory review to set `humanReview:true`.

## Task 2: Families and compact, accessible card details

Files: `manager.mjs`, `bot-library.mjs`, `setup/board.html`, `setup/board.js`, `setup/board.css`; tests `tests/ranch-board.spec.cjs`.

Interface: optional task `family:{name:string,color:string}|null`, name trimmed 1–40 characters, color one of `mint,cyan,lavender,rose,amber,lime`. Validate server-side; reject unknown values, retain old values when omitted. UI suggests existing named families and allows naming a new one. Same family name uses a consistent chosen palette color; avoid arbitrary CSS values. No family is a neutral light card. Bot queue headers show family badges derived from current/queued tasks, retaining the bot's own color. No new scheduler eligibility restrictions.

- [x] Add persistence/validation tests and browser test proving one card keeps its color when moving between workflow columns and into a bot queue.
- [x] Replace status-driven card backgrounds with family palette variables; keep colored column headings and text status indicators. All light card surfaces use dark ink, including current-task headings.
- [x] Cap card height at 220px. Title uses at most two lines, preview at most two lines; keep bot, family, review/wait indicators visible. Full results and long paths belong in details. Keep essential compact assignment/queue controls where useful; do not hide focusable controls with overflow clipping.
- [x] Add an accessible details dialog with full title, instructions, criteria, project, family, bot, dependencies, completion summary/history, acceptance provenance and contextual actions. Use textContent for user/model content. Keyboard Enter/Space opens details; Escape closes and restores focus. Inner controls and drag completion must not open it accidentally.
- [x] Preserve dialog state across refresh; show a changed-task notice and use revision conflicts rather than overwriting edits. Refresh read-only task data without clearing draft follow-up text.
- [x] Browser checks cover long content, <=220px cards, keyboard behavior, drag, visible family label and mobile dialog sizing. Existing browser screenshots generated under `artifacts/bot-ranch`.

## Task 3: Working animation, Desk poke and transient Done

Files: `sources/omp-bot/world.js`, `app.js`, `index.html`, `widget.css`; tests `tests/ranch-world.test.cjs`, `tests/ranch-peek.spec.cjs`, `tests/ranch-setup.spec.cjs`.

- [x] Route thinking to workshop in BOTH maps and include thinking in the working/hammer animation selector. Keep Thinking text in status/details. Preserve existing quiet/reduced-motion/paused behavior.
- [x] Reuse existing `desk-check-work` button and `/control/profile/check-work`; label it `Poke / Check for tasks`. Surface pending/no-eligible-work result and disable when no managed profile is selected. Busy requests remain deferred and do not interrupt or enable pickup for resting bots.
- [x] Add a pure presentation helper for expired Done using `finishedAt` and a 180000ms threshold. Keep actual session/task state unchanged. Missing timestamps use a stable first-observed completion timestamp. After expiration present ready; history/details remain accessible.
- [x] Deterministic clock tests cover threshold and stable timestamp; expiration applies to bubble text and animation mode.

## Task 4: Integration and handoff

- [x] Self-review against all three feature tasks and the five Review focus items. Record interpretation decisions below.
- [x] Run `npm test` and `npm run build:ranch`. No live provider/model calls.
- [x] Update manifest to 0.12.0 and relevant README/spec release notes, marking implemented requirements and remaining pending work.
- [x] Report files changed, actual test counts/results, screenshots, release paths, limitations and migration behavior to parent. No install/restart performed.

## Scope and execution ruling

The user explicitly authorized planning followed by Luna implementation; no additional approval gate is needed. One Luna worker owns the coupled task-model and UI changes sequentially. Parent reviews the final diff before any live installation.

## Implementation rulings and verification

- Follow-up creates a separate released child with a dependency on parent acceptance. It keeps the parent's status, instructions, attempts and existing acceptance unchanged, while appending child-creation evidence and incrementing the parent revision so stale submissions cannot duplicate children. A child from Review remains gated until human acceptance; a child from Done is eligible. This preserves lineage/history and avoids fabricated acceptance; if the intended UX was to run Review follow-ups immediately, they will wait for the explicit acceptance.
- Existing tasks without `humanReview` migrate to `true` only when status is Review; other older tasks default to `false`. Existing Done tasks lacking provenance are labeled human for compatibility. No task is auto-accepted during migration.
- `npm test`: Node 113/113, native companion validation and bounded-media checks passed, Playwright 54/54.
- `npm run build:ranch`: Bot Ranch 0.12.0 widget and companion archive built; Ranch Desk 0.2.0 also packaged. CLI emitted its existing warning that widget index/scripts do not reference `icueEvents`.
- Self-review: automatic acceptance only runs on authenticated successful `agent_end`; error/unresolved attempts remain blocked. Family names/colors are server-validated and family policy does not affect eligibility. Done expiry is view-only and uses a stable per-profile first observation if timestamp is missing. Details drafts survive polling; task revisions guard writes. All existing provider, workspace, stop/retry and polling safeguards remain in place.
