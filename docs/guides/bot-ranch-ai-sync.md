# botRanch AI Sync

AI Sync gives a local agent a versioned interface to the same Board shown in botRanch. The companion remains the authoritative task writer. Portable files under the bot home are exports; agents should use the CLI or authenticated companion API to make changes.

Open **AI Sync** from the desktop sidebar to see the bot home, installed CLI invocation, catalog, access mode, preview, and recent change history. The default mode is **Inspect**. The mode is checked by the companion for every AI route, so disabling Apply in the window is not the permission boundary.

## Let a PM coordinate the Board

1. In **Factory**, create or edit a bot and choose the **Project Manager** role. PM design is optional and independent of the role. Existing custom role instructions are preserved.
2. Open **AI Sync** and choose **Organize** for ticket/queue management, or **Operate** when the PM is also delegated to run work. Specify the project, desired outcome and scope to the PM; access mode alone is not a work instruction.
3. Use **Copy instructions** for an external agent, or **Copy PM skill** for the complete workflow. Managed bot launches automatically include the installed skill and CLI paths. Existing sessions receive these instructions on their next safe launch.

The bundled `skills/bot-ranch-pm/SKILL.md` is a portable agent skill. It can be read directly by any agent, or copied as a directory into that agent's supported skill location. No model/provider is hardcoded. `botRanch-cli.cmd skill` prints it even when the companion is offline; `skill --json` returns its installed path and text. The app does not silently modify unrelated agents' global configuration.

A useful delegation is: **"Manage the Board for this project. Break the work into clear tickets, connect dependencies, assign suitable bots, and keep me informed of blockers. You may apply routine organizational edits. Hold new work until I ask you to run it; preserve tasks marked Human review."** To delegate execution too, say so explicitly. The PM can inspect previews and apply routine changes under that existing delegation without asking again for every ticket.

### What the agent can do

| Workflow | Supported interface |
| --- | --- |
| Inspect tasks, bot status/capabilities, roles, pickup state and updates | `board --json` / snapshot |
| Discover exact schemas, types, enums and restrictions | `catalog --json` |
| Read permissions and organizational receipts | `access --json`, `history --json` |
| Create/edit held tickets, assign bots, reorder queues, set families/sticky rules and dependencies | Preview/apply change sets |
| Release/start work, wake sleeping residents | `release`, `start`, `ring` in Operate mode |
| Hold pending work, accept non-human-review results, create released follow-ups, archive history | Structured `operate --file action.json` in Operate mode |
| Create/edit bots or roles, change membership, open/close terminals, delete records, or change access | Use the relevant app controls; these are not exposed by the AI operation catalog |

All successful changes use the same manager and storage as the sidebar, Ranch Desk and full Board. PM reports are not a second task store. The snapshot includes only the bot/role metadata needed for management, not runtime tokens, binding files or raw conversations. Saved model preferences do not prove a provider will accept a request.

## Access modes

- **Inspect** reads the snapshot and history and previews a change set. It cannot apply it.
- **Organize** can create held drafts and edit pending task titles, instructions, acceptance criteria, task station, requested reasoning, model eligibility, human review, family, dependencies, assignment, queue order, and sticky settings. New tasks remain `todo` and unreleased. Organizing does not start work or run an LLM.
- **Operate** adds explicit release, start, hold, sleeping-bot wake requests and supported lifecycle actions through the manager's existing validation. A start still uses normal workspace, profile, model, runtime, and active-work checks. Holding a ticket is not an interruption. Human-review acceptance remains with the human.

These modes limit application operations. They are not an operating-system sandbox: a local process running as the same user may be able to read that user's private files. The actor value in a change set is a caller-supplied display label, not a verified identity.

## Local CLI

Use the stable installed launcher shown in AI Sync, typically:

```powershell
& "$env:LOCALAPPDATA\Programs\botRanch\botRanch-cli.cmd" status --json
& "$env:LOCALAPPDATA\Programs\botRanch\botRanch-cli.cmd" catalog --json
& "$env:LOCALAPPDATA\Programs\botRanch\botRanch-cli.cmd" board --json
```

The CLI reads the private setup credential itself. Do not pass or copy that key into prompts, task instructions, change files, or agent configuration. Read-only commands never start a missing companion; open botRanch or use **Connection & recovery** if the CLI reports that it is offline. CLI errors use a nonzero exit code.

Create a proposal file using a literal path. Paths with spaces are accepted when quoted by the caller:

```json
{
  "changeSetId": "cleanup-2026-10-13",
  "expectedTaskRevision": 12,
  "operations": [
    {
      "type": "task.update",
      "id": "task-id-from-board",
      "expectedRevision": 7,
      "changes": {
        "title": "Clarify the task outcome",
        "acceptanceCriteria": "Describe what a reviewer can verify."
      }
    },
    {
      "type": "task.create",
      "title": "Review the related module",
      "projectFolder": "D:\\work\\example project",
      "instructions": "Inspect the module and summarize its responsibilities."
    }
  ]
}
```

Preview and inspect the exact before/after state before applying:

```powershell
& "$env:LOCALAPPDATA\Programs\botRanch\botRanch-cli.cmd" preview --file "D:\work\agent proposals\cleanup.json" --actor cleanup-agent
& "$env:LOCALAPPDATA\Programs\botRanch\botRanch-cli.cmd" apply --id cleanup-2026-10-13
```

The expected Board revision rejects a stale preview. Invalid operations, active or unresolved tasks, unknown fields, dependency cycles, and stale revisions reject the entire batch. An un-applied preview is held in memory; if the companion restarts, preview the same proposal again before applying it. Applying the same change-set ID again returns its original receipt without applying twice. Keep the ID stable for retries and use a new ID for a changed proposal. The private state keeps the latest 100 audit entries and retains apply receipts indefinitely so an old retry cannot apply twice.

Explicit operate commands are:

```powershell
& "$env:LOCALAPPDATA\Programs\botRanch\botRanch-cli.cmd" release TASK_ID --revision 7
& "$env:LOCALAPPDATA\Programs\botRanch\botRanch-cli.cmd" start TASK_ID PROFILE_ID --revision 7
& "$env:LOCALAPPDATA\Programs\botRanch\botRanch-cli.cmd" ring
```

The companion rechecks the supplied revision and current runtime state. `release`, `start`, and `ring` require Operate mode. There are no catalog actions for deletion, shell commands, arbitrary file access, secret reading, permission changes, or companion restart.

For a lifecycle action, save the exact object described in `catalog.operateActions` and run:

```powershell
& "$env:LOCALAPPDATA\Programs\botRanch\botRanch-cli.cmd" operate --file "D:\work\proposals\action.json"
```

For example, `{"action":"hold","taskId":"actual-id","expectedRevision":12}` holds pending work. A follow-up supplies `action`, `taskId`, `expectedRevision` and `note`; it is released automatically and waits on its parent, so the PM needs authorization to run follow-up work. Accept refuses any task marked Human review and records agent acceptance, not human approval. Archive retains history and does not finish prerequisites. Operate actions have no change-set receipt: after a timeout, re-read the Board before deciding whether to retry.

## Dependencies and monitoring

Create upstream drafts first, apply, and obtain their real IDs from the receipt or a fresh Board snapshot. Then create downstream drafts with those IDs in `dependsOn`. The catalog does not support temporary IDs or forward references. Use returned revisions for every new proposal; on conflict, re-read and reconcile rather than blindly replacing the revision number.

The PM should use `waitingReason`, task attempts, bot status, pickup state and recent updates to explain why work is waiting. Family color is a visual relationship; only dependencies gate pickup. Idle/sleeping bots and expired external-job monitoring are not evidence that work finished. Continuous monitoring should have a bounded interval and stopping condition, not a tight polling loop. Reports should name affected task IDs, actual changes, current blockers and the next decision required.

## Suggested sweep prompt

> Clarify task titles, flag missing acceptance criteria, suggest families and dependencies, preserve each task's meaning, and keep new drafts held. Return a proposed change set for preview. Do not release or start work unless explicitly asked.

The companion does not call a model during preview or apply. Your chosen agent creates the proposed operations; AI Sync validates and stages them, then the companion commits the complete accepted batch and audit receipt together.

## Automatic continuity and delivery diagnostics

Each task starts a fresh conversation. The companion supplies bounded handover reports from the same project/family and dependencies. Family identity is stable across recoloring; retain the returned `family.id` when renaming or recoloring. Cross-project sources require explicit `allowCrossProject:true`; reports are untrusted data, not instructions. Published handovers retain source revisions and review status. Do not treat an unreviewed report as human acceptance.

Use `family --id FAMILY_ID --json` to inspect history and `context --file request.json --json` with `{"taskId":"TASK_ID","expectedTaskRevision":12,"profileId":"BOT_ID"}` to inspect assembled inputs. With a profile, context inspection returns a `contextRevision`; include it in the structured `start` action to reject changed inputs before dispatch.

Organize-mode atomic operations include `family.preferBot`, `family.clearPreference`, `family.publishHandover`, `family.resetHandover` and `task.attachContext`. Read the catalog for their exact schemas. Family operations use the family's `expectedRevision`; references require `{taskId,sourceRevision,allowCrossProject}`. Task attachment uses its task revision. Changing family preference never bypasses release, explicit assignment, dependencies, eligibility or fairness. Clearing/resetting a handover retains its audit history.

In Operate mode, `wake` asks sleeping bots to check in, excluding working and offline bots. For a sleeping Pipeline it performs one status check without starting a job or extending its waiting budget.

Use task `attempts[].delivery.phase` and bot `delivery` to distinguish reserved, received, claimed, started and unresolved work. Delivery retries remain attached to the same reservation and source session. Unresolved ownership needs inspection, not blind redispatch. Bot `reporting` exposes support and last accepted report; updated interactive managed sessions can use `ranch_status` even outside a Board task. Public status updates are not completion evidence.

## Task stations, public updates and troubleshooting

The current `task.create` and `task.update` schemas accept `workStation`: `auto`, `reading`, `researching`, `writing`, or `workshop`. Example pending-ticket changes: `{"workStation":"researching"}`. It sets visual task placement, stays fixed through tool changes, and is inherited by follow-ups. Auto spreads bots across stations; no model call guesses the topic. Active tasks remain protected from editing.

The feed reports meaningful lifecycle events automatically. Use task instructions to name intermediate communication checkpoints; `ranch_status` reports actual outcomes or blockers, without tool-by-tool narration. Checkpoints continue unless instructions explicitly require approval. Ordinary work finishing is distinct from a verified task completion.

`ring` and `wake` both target sleeping connected bots. Neither forces an awake bot to pick up work or overrides global/per-bot automatic pickup. A released ticket can wait because the bot has `autoPickup:false`, a dependency is unfinished, or another attempt owns its project workspace. Inspect `waitingReason`, `autoPickup`, `pickupPaused`, delivery and attempts. In Operate mode, an authorized `start TASK_ID PROFILE_ID --revision N` explicitly requests dispatch without enabling automatic pickup; all normal checks still apply.

A successful request is not evidence that the bot started. Per-bot Check work is an app management control and can request a one-time check with automatic pickup off; it is not an AI catalog action. Report its pending/result state truthfully. Open authenticated Full Board from the app, rather than collecting admin fragments for a bare browser URL.

Inspect allows preview only. Ask the user to choose Organize/Operate in AI Sync when the delegation needs those operations. Do not route around an Inspect restriction through UI automation or broader management endpoints. Correct PowerShell invocation uses `&` before the quoted `.cmd` path; shell failures occur before Ranch receives a request.

See the [API surface reference](bot-ranch-api.md) for the distinction between AI, app management, and runtime interfaces.
