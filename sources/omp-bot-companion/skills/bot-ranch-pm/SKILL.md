---
name: bot-ranch-pm
description: Manage botRanch tickets, dependencies, bot assignments, queues and progress through its local companion API. Use when asked to plan, organize or coordinate work on a botRanch Board.
---

# botRanch PM

Use the installed CLI to manage the same Board the user sees. The companion owns task state. Files under bot home/tasks and handovers are exports, not an alternate database. Bot home is the shared coordination base; each ticket's projectFolder is its execution workspace and may differ from home.

## Connect and discover

AI Sync in the desktop sidebar shows the installed CLI, access mode and this skill. Managed bot instructions also provide the absolute bundled CLI module and skill paths. Use that module with Node, or the stable installed launcher:

```powershell
$ranchCli = Join-Path $env:LOCALAPPDATA 'Programs\botRanch\botRanch-cli.cmd'
& $ranchCli status --json
& $ranchCli catalog --json
& $ranchCli access --json
& $ranchCli board --json
```

`skill` prints these instructions without a live companion. `skill --json` includes the local skill path. `history --json` reads organizational receipts. When running from source, replace the launcher with `node "<absolute companion folder>\ranch-cli.mjs"`. Use the paths supplied by this installation; do not guess a dedicated client folder. The CLI handles authentication. Never copy keys into prompts, skills, task instructions or proposal files. If offline, report it and direct the user to botRanch / Connection & recovery; do not kill a port owner or edit live state to recover.

Read the live catalog for supported schemas, enums, required fields and limitations. Read the live Board before writing; use returned task/profile IDs and revisions. The snapshot includes tasks, safe bot status and roles, recent updates, pickup state and home. Public updates are progress reports, not proof of completion or model access.

## Work within the delegation

- **Inspect:** read and preview only. **Organize:** apply pending-ticket edits. **Operate:** explicitly release/start/hold, request bells and use supported lifecycle actions.
- A user's instruction to manage a project or clean up its Board authorizes routine organizational changes within that scope. Inspect your preview yourself and apply it; do not ask for another approval for every routine edit. Ask only for missing decisions that materially change scope.
- Release/start requires the user's instruction to run the work, either for that ticket or as part of an existing delegation. Access mode is a capability limit, not evidence of user intent. Do not change access mode or bypass the AI API through broader admin routes.
- Preserve `humanReview`. Never clear it just to complete a task. AI acceptance cannot replace a human review; direct the user to Review in the app when needed.

## Plan, create and assign

Use one concrete outcome per ticket, an existing absolute project folder, clear instructions, and observable acceptance criteria. Choose families to show related work, `dependsOn` for true prerequisites, and sticky preferences for continuity. Do not use family color or queue order as a substitute for a dependency.

Choose an active bot with a suitable role and capacity; consider its read-only policy, pickup setting, current work, and task model/reasoning requirements. A role's model preference does not prove provider access. Pipe-only tickets require the `pipe` or `pipeline` role, irrespective of visual design. Assign to a specific bot when requested; otherwise the shared queue lets eligible bots pick up released work. Bank/offline bots cannot be assumed ready. Use Factory/Bots for unsupported bot creation, role editing or terminal lifecycle actions rather than fabricating API commands.

Organizational changes are batches: `task.create`, `task.update`, `task.assign`, `task.order`, and `family.setting`. Build a JSON file with `changeSetId`, the latest `expectedTaskRevision`, and `operations`; existing-task operations also use that task's `expectedRevision`. A minimal create operation is:

```json
{"type":"task.create","title":"Inspect import failures","projectFolder":"D:\\work\\example","instructions":"Reproduce the failure and identify its cause.","acceptanceCriteria":"Reproduction steps and evidence identify the failing boundary.","humanReview":false}
```

```powershell
& $ranchCli preview --file "D:\work\proposals\plan.json" --actor project-manager
& $ranchCli apply --id plan-unique-id
& $ranchCli board --json
```

Inspect before/after and conflicts before applying. The CLI apply uses the preview's saved Board revision. New tickets are held drafts, never implicitly released. To create a dependency chain, first create/apply upstream drafts, obtain their real IDs from the receipt or fresh Board, then create downstream drafts with those IDs in `dependsOn`. There are no temporary-ID or forward-reference aliases. When editing several fields on a ticket, combine them in one `task.update`; use the catalog's batch revision rules for other operations.

On conflict, re-read and re-plan; do not replace the old revision with the new one without checking changed data. Keep the same changeSetId for retries of an identical apply. Changed proposals need a new ID. If the companion restarts before apply, preview again. Receipts make organizational applies idempotent; partial batch application is not allowed.

## Run and follow through

After authorized release, use current revisions with `release TASK_ID --revision N`; `start TASK_ID PROFILE_ID --revision N` requests explicit dispatch. `ring` asks eligible residents to check work when idle; it neither opens bank bots nor interrupts active work. Pickup, dependency, workspace, model and runtime checks remain authoritative.

Use `operate --file action.json` for the catalog's structured actions. Examples:

```json
{"action":"hold","taskId":"actual-task-id","expectedRevision":12}
```

```json
{"action":"follow-up","taskId":"actual-parent-id","expectedRevision":15,"note":"Address the uncovered retry case and provide regression evidence."}
```

Hold prevents future pickup; it is not an interruption. Follow-ups are released automatically and depend on their parent being Done, so creating one requires delegation to run that work. An API accept requires `humanReview=false`, records agent acceptance, and cannot approve human-review tickets. Archive retains history and does not satisfy an unfinished prerequisite. No generic deletion, shell, permission-change or runtime-restart action is exposed.

Operate calls do not have change-set receipts. After a timeout, read current state before retrying; never blindly repeat a start or follow-up. Return task IDs and actual observed outcomes, not just the commands sent.

For monitoring, inspect `waitingReason`, dependencies, assignment, pickup state, bot status and recent updates. Report whether work is held, blocked, running, awaiting human review, or done. Do not infer completion from silence, a sleeping bot, or an external job's timeout. If asked to monitor continuously, use a bounded cadence (typically 30-60 seconds) and a stated stopping condition; avoid tight loops or repetitive model turns. Escalate unresolved attempts rather than retrying work that may still be running.

Close with a short account of what changed, task IDs, what is running or blocked, and the next human decision if one is needed. Re-read the Board so the report agrees with the app.
