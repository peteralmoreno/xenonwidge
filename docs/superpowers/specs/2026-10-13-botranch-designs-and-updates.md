# Bot designs, short updates, and wake gestures

Status: implemented and verified for Bot Ranch 0.13.0. Managed native OMP loops are capability-gated and unavailable; the Board ships a bounded standalone command helper.

## Intended experience

Bots remain playful representations of real agents. Users can change a bot's appearance, read a short progress update on its Desk, watch a shared update feed when inspecting no bot, and deliberately shake a held bot to request a safe wake/work check.

## Bot appearance

Add a Design picker with preview to the saved profile editor: Classic and Pipeline. Confirmed by the user: Pipeline includes both a visual design and a role. Its appearance is a pixel robot made of pipes, elbow joints, a small valve and a gauge face. Design is independent of role, provider, model, personality, family and color; changing it cannot restart a session. Save `design` in the bot home profile, default missing/unknown legacy designs to Classic, and use the selected design consistently on the ranch and Desk portrait. Existing colors and activity props remain available. Implement as native SVG, matching the existing sprite system.

## Pipeline role: external API jobs

User clarification: Pipeline triggers an external job through an API, checks its progress until completion or a waiting deadline, then sleeps by default. The user can resume monitoring later. It is not a role for independently executing a chain of local coding tasks.

Provide a pre-created Pipeline role and a generic external-job adapter contract: start a job, normalize its job ID/status/result, and query status by job ID. Configure endpoints and credentials locally; do not hard-code a provider or place secrets in tasks, status posts, profiles intended for sharing, or Git. The role and pipes-and-valves appearance remain independent selectors. Preserve user-edited role instructions on upgrades.

The user selects a waiting budget: 10 minutes, 20 minutes, 40 minutes, 1 hour or 2 hours; default 1 hour. Separately select a check interval of 1, 5, 10 or 30 minutes; default 5 minutes. These control elapsed monitoring time and request frequency, not model token budgets. Start once, persist the external job ID, deadline and interval, then poll using ordinary HTTP requests on a timer. Honor Retry-After and back off on transient errors. Prevent overlapping requests. Stop scheduling at the deadline even if the next check would occur later; do not issue catch-up bursts after sleep or restart. If startup times out ambiguously, reconcile using an idempotency key/provider lookup when supported; never blindly submit a duplicate job.

At the deadline, automatically enter monitoring-sleep state and suspend polling. This supersedes the earlier automatic Needs you prompt. Show a quiet status: ?Monitoring asleep; last checked [time]? with Resume monitoring and Stop tracking actions. No automatic model call or blocking question is generated. The external job may continue running; sleeping does not cancel it, fail it, accept it or mark it Done. Preserve its active/unresolved identity so it cannot be submitted twice. A manual resume checks current status once immediately (respecting provider Retry-After), then if still pending offers/uses a fresh monitoring budget from the same five durations (default one hour). Continue monitoring the same job ID. Provider cancellation is separate and available only when supported and explicitly requested.

Persist job identity, last normalized status, waiting deadline, selected check interval and monitoring-sleep state across companion restarts. Terminal external success can complete the Ranch attempt, subject to the existing per-task Human review policy. External failure is failure; lost connectivity and deadline expiry are not success. Pipeline status posts are generated from normalized API events (started, progress changed, waiting extended, completed, failed), avoiding repetitive feed noise. Never invent progress percentages or ETA.

Token behavior: deterministic polling and elapsed waiting consume no language-model tokens. Use a model only for a specifically needed setup, interpretation, or result-summary step; do not send every poll response back through the model. HTTP/provider charges, request quotas, external-job compute costs and local resource use are separate from model tokens. The companion must remain running to poll; after sleep/restart reconcile with the persisted job and deadline. Do not use OMP /loop as the polling engine.

The companion monitor owns a separate external-job attempt beyond any model turn; an intermediate agent_end must not mark the task Done. The companion owns the durable monitor, and the generic adapter must be exercised against a local fake API (start, progress, completion, failure, rate limit, ambiguous start, restart and deadline extension). No live external job should start during these tests.

## Short progress posts

Expose a small authenticated runtime status tool for deliberate public progress summaries. Instruct bots to post when starting a task, after meaningful milestones, when blocked, and at completion. Each post is plain text, at most 240 characters and two lines; no raw reasoning, credentials or terminal transcript. Do not manufacture updates from a busy animation. Existing activity telemetry and completion evidence remain separate.

Example: “Found the config mismatch. Updating the loader, then checking both startup paths.”

Bind posts to the real profile, launch and active attempt on the server; reject stale/foreign identities and out-of-order duplicates. Use server receipt time for ordering. Store a bounded local feed (latest 200 posts) beneath the selected bot home, with latest-post references in public state. Rate-limit routine posts to one per 15 seconds per bot, allowing a distinct blocked/completion event. Render text safely; retain existing credentials and runtime capability separation. Reporting failures must not fail task execution. The status tool must not imply a task is accepted or complete.

## Desk and shared feed

Selected bot: show its latest post, age, and associated task prominently; details can show recent posts. Distinguish “no update yet” and disconnected status from a current report.

No selected bot: display Ranch feed in the Desk area. Add an explicit All updates control to clear inspection; polling must not automatically reselect the first resident afterward. Cards show bot name/avatar, task, time and text. Keep newest posts visible while at the live edge; preserve scroll position and show a new-post count while reading older entries. Cap rendered entries, support keyboard navigation, and honor reduced motion. Retain an easy return to the selected bot.

## Shake to wake

Only a deliberate held-bot gesture triggers wake: at least three horizontal direction reversals within 900ms, each with at least 24px excursion. Normal taps, dragging to the Desk, repositioning, scrolling, pointer cancellation and short jitter must not wake the runtime. Trigger once per gesture with a 10-second per-bot cooldown and suppress a following accidental click/drop action. Provide the same action through the Desk button for keyboard/touch accessibility.

Wake sends an authenticated control event requesting acknowledgement and an eligible-work check. An idle connected runtime acknowledges immediately with a small system feed entry and asks the existing scheduler for work. Busy bots acknowledge/queue at a safe boundary; do not steer or interrupt a running turn, answer a question, dismiss approvals, enable pickup on resting bots, or reset context. Do not launch a closed bot from shaking it. Report closed/disconnected state clearly.

Prefer a runtime control message over an extra model prompt: it reliably checks the actual queue and adds no idle model call. If a conversational nudge is later desired, make it a separate explicit option with deduplication and idle-only delivery.

## Oh My Pi /loop findings

Inspected installed `@oh-my-pi/pi-coding-agent` version 18.8.6, especially `src/modes/loop-limit.ts`, `loop-condition.ts`, and `interactive-mode.ts:handleLoopCommand`.

- `/loop` repeats a prompt and accepts a count or duration limit.
- `--until` / `--while` gates subsequent iterations on a shell command's exit status, not printed output. The first iteration runs before the condition is checked.
- Invoking `/loop` while enabled disables it. Interrupt suspends the active loop.
- Official reference: https://github.com/can1357/oh-my-pi/pull/10858

Recommended use is an optional bounded per-task repeat mode, e.g. repair until a named verification command succeeds. Keep the existing scheduler responsible for selecting tasks, project locks, dependencies, context and pickup. Do not use an unbounded model loop to poll an empty queue.

User requested an optional native OMP loop mode. Add an off-by-default task option, Repeat with Oh My Pi /loop, requiring a maximum iteration count or duration and optionally an Until/While verification command. Show the usage and token-cost hint from `docs/guides/bot-ranch-loop.md` inline and link that guide from READMEs. OMP owns repetition; Ranch owns task identity, permissions, dependencies and final acceptance. Keep API monitoring independent. Before enabling it, verify supported extension command delivery and terminal-loop events; ensure intermediate `agent_end` events cannot complete the Ranch attempt, limits do not imply success, aborts remain failures/blocked, and a terminal successful condition is recorded as evidence. No loop was started and no live model calls were made during this investigation.

## Implementation sequence and proof

1. Profile design persistence, both sprite variants, preview and migration tests; seed the external-job Pipeline role without overwriting existing instructions. Implement the generic durable job monitor and test all deadline and interval presets, default one-hour monitoring sleep, manual resume, restart, failed requests and duplicate-start prevention with a local fake API. Verify independent role/design selection.
2. Authenticated progress-post path, bounded feed persistence and runtime tool; test stale launch/attempt rejection, length limits, deduplication, throttling, restart and safe text rendering.
3. Selected latest post and deselected shared feed; test polling, scroll preservation, empty/offline states and accessibility.
4. Gesture detector and safe wake acknowledgement using current work-check lifecycle; deterministic tests for shake/jitter/drag/cancel/cooldown and busy/question/rest/closed states.
5. Native /loop capability integration and task controls; verify supported command delivery, intermediate/final completion, budget exhaustion, context mode, abort and unavailable-runtime handling. Never treat budget exhaustion alone as successful completion.
6. Browser screenshots at Large/XL, relevant Node/browser tests, release build and review. Do not replace a busy installed companion or interrupt live terminals.

No automatic recurring model prompts, new scheduler or change to task acceptance policy is included.

## Delivery decisions

- Native OMP loops are unavailable for managed tasks in the inspected runtime. The Board instead provides a bounded, copy-only command helper for a separate OMP terminal; it never dispatches a slash command as model prose.
- An ambiguous submission can link an operator-verified existing job ID through authenticated, revision-checked GET reconciliation. The original attempt and idempotency key remain; no new submission occurs. A confirmed failed job can explicitly prepare a held new attempt, preserving its prior external record.
- Pipeline stop/resume controls work on both the Board and widget. Stop tracking never claims provider cancellation.
- Both usage guides are bundled with the companion and linked from its README.

## Verification (2026-10-13)

- Full `npm test`: 149 Node tests, native setup/terminal checks, 69 browser tests, and Audio Deck companion checks passed.
- `npm run build:ranch`: Bot Ranch 0.13.0 widget and companion ZIP built successfully; legacy Desk compatibility package retained.
- Large (1688 x 696) and XL (2547 x 676) screenshots inspected for Pipeline Desk and shared feed. Touch assignment, feed timestamps, scrolling, confirmation/cancellation, and recovery controls exercised in browser tests.
- Independent code review findings for uncertain submission recovery and confirmed-failure retry were fixed and rechecked.
- Final companion ZIP matches the current source and its 63-file allowlist, includes both usage guides, and excludes private runtime files. Changed-file credential-pattern scan found no matches.
- No live provider/model calls, companion installation, running-bot restart, commit or push were performed. Physical XENEON touch behavior and real provider adapter behavior remain manual integration checks.
