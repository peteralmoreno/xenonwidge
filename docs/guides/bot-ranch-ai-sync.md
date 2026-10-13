# botRanch AI Sync

AI Sync gives a local agent a versioned interface to the same Board shown in botRanch. The companion remains the authoritative task writer. Portable files under the bot home are exports; agents should use the CLI or authenticated companion API to make changes.

Open **AI Sync** from the desktop sidebar to see the bot home, installed CLI invocation, catalog, access mode, preview, and recent change history. The default mode is **Inspect**. The mode is checked by the companion for every AI route, so disabling Apply in the window is not the permission boundary.

## Access modes

- **Inspect** reads the snapshot and history and previews a change set. It cannot apply it.
- **Organize** can create held drafts and edit pending task titles, instructions, acceptance criteria, requested reasoning, model eligibility, human review, family, dependencies, assignment, queue order, and sticky settings. New tasks remain `todo` and unreleased. Organizing does not start work or run an LLM.
- **Operate** adds explicit release, start, and idle work-check requests through the manager's existing validation. A start still uses normal workspace, profile, model, runtime, and active-work checks.

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

## Suggested sweep prompt

> Clarify task titles, flag missing acceptance criteria, suggest families and dependencies, preserve each task's meaning, and keep new drafts held. Return a proposed change set for preview. Do not release or start work unless explicitly asked.

The companion does not call a model during preview or apply. Your chosen agent creates the proposed operations; AI Sync validates and stages them, then the companion commits the complete accepted batch and audit receipt together.
