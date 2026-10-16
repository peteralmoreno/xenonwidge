# botRanch API surfaces (0.20.5)

The companion is the authoritative writer for the Board. Prefer the installed CLI and live `catalog --json`; the bundled `agent-catalog.json` contains exact AI request schemas. The CLI discovers the local endpoint and authenticates without exposing credentials. Default local service: `http://127.0.0.1:43822`.

## Agent / Project Manager API

These routes require the private setup credential, handled by the installed CLI, plus the configured AI Sync access mode. Use the [PM workflow guide](bot-ranch-ai-sync.md); broader app routes are not a fallback when agent access is denied.

| Method / route | CLI | Purpose / access |
| --- | --- | --- |
| GET `/admin/ai/catalog` | `catalog --json` | Exact operation schemas; Inspect |
| GET `/admin/ai/skill` | `skill --json` | PM skill; CLI also reads it offline |
| GET `/admin/ai/snapshot` | `board --json` | Tasks, safe profiles, updates, pickup state; Inspect |
| GET `/admin/ai/access` | `access --json` | Current capability mode |
| GET `/admin/ai/history` | `history --json` | Change receipts; Inspect |
| POST `/admin/ai/preview` | `preview --file proposal.json --actor pm` | Validate and stage a change set; Inspect |
| POST `/admin/ai/apply` | `apply --id CHANGESET_ID` | Atomic pending-task changes; Organize |
| POST `/admin/ai/operate` | `operate --file action.json` | Explicit lifecycle operations; Operate |
| POST `/admin/ai/context` | `context --file request.json` | Bounded task inputs and context fingerprint; Inspect |
| POST `/admin/ai/family` | `family --id FAMILY_ID` | Family continuity and eligibility; Inspect |

Create/update supports `workStation` (`auto`, `reading`, `researching`, `writing`, `workshop`) alongside instructions, acceptance criteria, human review, provider/effort preferences and dependencies. Follow-ups inherit it. Active/unresolved tasks cannot be reorganized. `ring` and `wake` both wake sleeping bots only. `start` is an explicit dispatch; `release` only makes a pending task eligible for pickup. Use current revisions and read state after a timeout; operate actions have no change-set receipt.

HTTP errors: 400 invalid request, 401 rejected authentication, 403 insufficient AI Sync mode, 409 revision conflict. Re-read and reconcile on conflict. Access modes are application controls, not an OS sandbox. The actor label is caller-supplied, not verified identity.

## App / Ranch controls

These support the desktop and widget UI. They are separate from the restricted AI operation catalog. `/control/*` accepts the companion connection key (legacy management keys remain compatible). `/admin/*` uses the private setup credential. Do not put either credential in a task, prompt or shared URL.

| POST route | JSON body | Effect |
| --- | --- | --- |
| `/control/profiles/wake` | `{}` | Wake sleeping connected bots; skips working/offline bots; one sleeping Pipeline check |
| `/control/profiles/check-work` | `{}` | Request checks from available idle bots; respects global pause and per-bot automatic pickup |
| `/control/profile/check-work` | `{"id":"BOT_ID"}` | Explicit one-bot check when idle; may override automatic pickup for that check; does not interrupt work |
| `/control/project-manager` | `{"id":"ACTIVE_PM_ID"}` | Open/focus that PM terminal; sends no model message |
| `/control/pickup` | `{"paused":true}` | Pause new automatic pickups; current work continues |
| `/control/ui/attention` | `{}` | Ask the desktop to open its attention view |

GET `/control/state` supplies app state; GET `/control/tasks` supplies task state. The full Board uses authenticated `/admin/task*`, `/admin/profile*` and `/admin/action` routes with normal revision/eligibility checks. They are app integration details; agents should use the catalog. Opening a menu does not submit a command. A 200 response can mean pending, skipped or requested, not started/completed work.

## Runtime and activity

`/runtime/*` is for managed extensions, using private per-launch credentials and validated task/session ownership. It is not a PM task-management interface. Keep the internal `thinking` state for compatibility; users see **Working**. The assigned task station is included in task snapshots and resident state, and does not change model, permissions or execution folder.

`ranch_status` posts a public milestone/blocker (maximum 240 characters, two lines). Automatic pickup/completion/help/idle log entries use existing runtime events without model calls. Neither a status post nor an expired Pipeline wait completes a task. See [Pipeline contract and updates](bot-ranch-pipeline.md).
