# Bot Ranch Central Companion 0.18.0

Run `Install botRanch.cmd` once. It installs under `%LOCALAPPDATA%\Programs\botRanch` and creates the **botRanch** Start menu shortcut. That shortcut opens the floating desktop dock and starts or reuses the companion. Use **Board** inside the sidebar. **Full Board**, **Settings**, **Connection & recovery**, and **AI Sync** open separate native windows. The installer keeps stable desktop and `botRanch-cli.cmd` launchers, both following the current release. Your selected bot home and existing settings remain separate. Active work blocks replacement.

The [desktop dock guide](../../docs/guides/bot-ranch-desktop.md) covers dragging, pinning, sticky families, recovery, AI Sync, live task/bot/update views, and iCUE page navigation. The [AI Sync guide](../../docs/guides/bot-ranch-ai-sync.md) documents the versioned local agent API and CLI. The Windows release includes its Electron runtime; you do not install React or Motion separately. Node.js remains required for the installer and OMP tooling. Closing or quitting the dock leaves the companion and bots running. `Open Bot Ranch Setup.cmd` remains a browser-only entry point.

Choose **Ranch display → A · iCUE widget** or **B · Desktop app** in the expanded dock or tray menu. B opens the complete Ranch in a resizable native window without iCUE, using the same live bots and Board. Your mode and window placement are remembered. The native Ranch menu links to Board/Settings; View offers zoom, fullscreen and pinning. Switching modes changes only the display.

## Setup and profiles

Setup stores nicknames, absolute project folders, colors, role/model/context defaults, read-only requests, pickup preferences, active membership, and launch settings. Six profiles can be active on the ranch; additional saved profiles stay in Bot Bank. Busy retirement is deferred until a fresh `ready`/`done` observation or a confirmed terminal close. It never force-kills a terminal.

Settings > Connection shows one key for widget activity and bot/task controls. Existing pairing keys continue working; the separate management-key field is removed. Private setup and per-launch runtime credentials are handled automatically. Legacy control tokens remain accepted for older widgets during migration.

## Local task data and OMP runtime adapter

Tasks store project folder, title, instructions, acceptance criteria, workflow label, stable profile association, automatic-pickup release, requested effort, eligible model families, revision, archive state, attempt references, and result/evidence fields. Updates are validated and written atomically to `%LOCALAPPDATA%\OmpBot\ranch.json`. Each task and profile has a revision; stale writes return a conflict. Archiving preserves history. Legacy 0.6 settings migrate defaults while preserving resident IDs, folders, runs, session-history paths, sleep settings, and keys. Schema 2 refuses a future schema rather than rewriting it.

Explicit Start and released automatic pickup use the OMP extension adapter. Each attempt is stored before launch, gets a private one-time claim, a project-checked workspace and an isolated session directory, and moves to Doing only after the extension acknowledges agent start. Successful completion is accepted automatically unless Human review is enabled for the task. Lost acknowledgments and terminals that close before a completion event become unresolved and block automatic retry. The widget offers an explicit retry only after the previous terminal is verified closed, preserving the failed attempt. Follow-up also creates a retained new attempt. A single active attempt owns a workspace. The task-dispatch token is removed from the OMP process environment as soon as the extension loads it.

At task start the extension reads OMP's authenticated model inventory, applies eligibility and saved preference without fallback, selects the model, and checks the selected model and reasoning level back through the runtime API. The runtime's model inventory indicates configured access; this does not establish that a provider will accept a later paid request. No live model prompt is sent by tests. When read-only is selected, the extension blocks tools other than workspace-contained file reads, search, find, and list; shell, write, MCP, unknown tools, URLs, and symlink escapes are denied. Runtime enforcement covers OMP tool calls; it does not sandbox the operating system or protect against an unrelated process running as the same Windows user.

Open **botRanch** from the Start menu for the sidebar Board, Bots, Factory and Updates. Short and long layouts are saved independently of Ranch display mode. The panel icon expands the panel; drag its outer bottom corner to resize. Factory creates in the existing Bank; Bots admits or puts away residents, opens sessions, and rings individual or town bells without interrupting busy work. **Full Board** opens the dedicated black/neon Board for advanced workflows. Create/edit tasks in the sidebar or full Board; drag bots onto tasks (or tasks onto bots) to assign. Start explicitly or release for enabled pickup. Widget Tasks occupies the right-hand Desk with the ranch still visible.

Setup's **Bot home / base project** is the default starting folder. Bots may start elsewhere, but every launch receives home and role instructions. Home contains `bots/<id>/profile.json`, `roles/<id>/role.json` and `agent.md`, `sessions/`, sanitized `tasks/` and completion `handovers/`. Human review remains optional per task. Private credentials and bindings remain in companion state. Changing home copies profiles/roles without deleting the old home; importing saved bots adds unseen profiles to the bank.

Roles own model preferences and loading instructions. Edit them in Setup or choose an absolute Markdown/text instructions file (64 KB maximum). Profiles can select extra instructions. Missing files block launch; changes apply on the next launch. Six bots can be active with 32 colors and Classic, Pipeline or Product Manager designs.

**Per task** isolates tasks and keeps context for reviewed follow-up. **Per session** retains context across tasks in the same project. Project switches (including returning to an earlier one), role instructions/model changes and cleanup start fresh. Legacy policies remain readable. Close a terminal before Clean; active/unresolved tasks block it. History/files remain. Retire and close a bot, then use **Delete bot** to remove its reusable profile while retaining task history.

## Authentication and transport

Loopback `127.0.0.1:43822`; authenticated `/state`, `/snapshot`, `/selection`, and `/focus`; authenticated `/admin` setup routes; and separately authenticated `/control` widget-management routes. The management token is not included in snapshots or public UI files. Request bodies are bounded. No arbitrary shell command is accepted.

The OMP extension sends a sanitized excerpt (up to 400 characters) of the latest visible user/assistant text. Hidden reasoning and tool output are excluded. Excerpts stay in memory and are never written to `ranch.json`. Existing Windows script policy is respected. No services, startup tasks, runtime upgrades, or security-setting changes are installed.

Old `Start-OMP` and `Start-Bot-Ranch` launch scripts remain for compatibility; use central setup for saved profiles. Ranch Desk remains hosted and packaged for existing installs, but the integrated Large Ranch is the everyday widget workflow.

Build with `npm run build:ranch` from the repository root. Releases are under `artifacts/releases/bot-ranch`. See the [build guide](../../docs/guides/build-and-import.md) and the [widget README](../omp-bot/README.md).


## Playful ranch and work queues (0.12.0)

Ranch pokes and dragging only affect appearance/inspection. Drop a bot on the Desk to inspect it; use explicit controls to change work. The pinned Desk prioritizes Now, Next and Needs you, with expandable statistics. Personality changes presentation independently of work role.

The companion Board has Workflow and Bot queues views. Inbox holds unreleased drafts; Ready holds released work. Assign tasks to a bot or leave them in the shared pool. Drag to append/reorder, or use Move earlier/later. Assigned released work precedes shared work. A blocked assigned head remains visible and is not silently skipped. Dependencies explicitly wait for accepted Done; queue order alone does not create dependencies. Changes conflict if another view has already updated the queue.

Finish then rest disables future pickup without stopping current work. Stop current task requires confirmation and verified terminal closure; interrupted tasks need review/retry. Current attempts retain their launch settings. Completion enters Review, with the bot's reported handover preserved at home; acceptance moves it to Done.

Idle work checks: **Check for work** on the Desk or Board > Bot queues requests one check, even while automatic pickup is paused. It never releases held tasks. Busy agents, pending questions/approvals, queued messages and asynchronous jobs defer checking. Enabled automatic pickup uses the same idle check. The terminal window stays open: the launcher hands off to a fresh OMP process, resuming saved task context only when policy permits. Older terminals need one restart with this release; direct Start on an already-open terminal still requires closure, so use Check for work instead. Lost acknowledgments remain unresolved rather than retrying. Live provider execution and physical iCUE touch are not certified by browser/mock tests.

## Settings and home folders

Settings is organized into Home & folders, Bots, Roles, Connection, and Diagnostics. Saving a home initializes `bots`, `roles`, `tasks`, `sessions`, and `handovers`, plus a `botRanch.md` guide. Existing files and a customized guide are preserved. Archived task records stay in `tasks`; archive is a state, not a separate directory.


## 0.12.0 Board flow

Successful authenticated task completions are accepted automatically unless **Human review** is enabled on that task. Existing tasks already in Review migrate with Human review enabled; partial updates from older clients preserve the saved policy. Failed and unresolved attempts stay blocked. Task details show whether acceptance was automatic or human.

Follow-up creates a separate released task that inherits the project, family, bot assignment, model/effort request and review policy. The new task depends on parent acceptance and retains its own attempt history while the parent's history stays intact.

Task families use a fixed palette and remain visually consistent across Workflow and Bot queues. Compact cards open an accessible full details dialog. Thinking uses the workshop animation, Desk exposes **Poke / Check for tasks**, and the transient Done presentation expires after three minutes. These presentation changes do not modify task execution or pickup safety.

## Optional OMP /loop helper

`/loop` asks Oh My Pi to repeat work, optionally until a verification command succeeds. Use it for iterative fixes and checklist work; each pass may consume model tokens. Use Pipeline API monitoring for passive waiting. Read the [mode guide and examples](../../docs/guides/bot-ranch-loop.md) before using native loops; the Ranch task completion adapter is not yet verified for them. The Board provides a bounded command helper for a separate OMP terminal. Managed-loop execution remains unavailable because native command delivery and final-loop completion cannot be verified through the installed extension API.

## Pipeline and public status updates (0.13.0)

Select Classic or Pipeline appearance independently of role. Pipeline API tasks submit once and monitor a saved external job without model calls, defaulting to sleep after one hour with five-minute checks. The widget Desk shows short bot status posts or an All updates feed; deliberate shaking requests a safe wake/work check. See [configuration, API contract, sleep/resume and status posts](../../docs/guides/bot-ranch-pipeline.md). Native managed /loop execution remains unavailable; the Board includes a bounded standalone command helper.
