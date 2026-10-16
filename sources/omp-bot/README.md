# Bot Ranch 0.20.2

Bot Ranch is an observational ranch with playful bot movement, status, tweets and an integrated viewing desk. The desktop sidebar owns Board, Bots and Factory management. Both use one local companion and support six residents.

## Start

1. For a new Windows PC, follow the [Bot Ranch install guide](../../docs/guides/bot-ranch-install.md), which covers prerequisites, building or installing the matching release, the companion, OMP, Bot home, and iCUE pairing.
2. Build with `npm ci`, then `npm run build:ranch` from the repository root when building from source.
3. Extract the companion ZIP and run `Install botRanch.cmd` once. Thereafter open **botRanch** from the Start menu for the floating desktop dock. Its sidebar includes Board, Bots and Factory; **Full Board** and **Settings** open separate companion windows. See the [desktop guide](../../docs/guides/bot-ranch-desktop.md), including iCUE page-navigation shortcuts.
4. Add bot profiles with project folders, colors, role, personality, pickup setting, and read-only request. The active ranch shows up to six profiles; saved Bot Bank profiles retain their identity and settings.
5. Import Bot Ranch into iCUE, choose Large, and pair it with the single Connection key from Setup. In iCUE, allow `127.0.0.1:43822` under Settings > Software Settings > Widget Access.
6. Open Settings > Connection. Paste the single connection key into the widget's Connect dialog for activity and management controls.

## Use

- Ranch shows terminal activity, attention, selected-bot details, observed model/context metadata when available, and the latest supported visible excerpt. Selecting a bot does not focus its terminal; double-tap or use the explicit terminal action.
- Tasks stores project-targeted local work with instructions, acceptance criteria, assignment, model-family preferences, requested reasoning effort, and automatic-pickup release. Assignment does not start work. Release starts only when global pickup is enabled and an active eligible bot is available.
- Start creates a durable attempt and launches through the OMP extension. The task stays To do until OMP acknowledges agent start; success goes to Done unless Human review is enabled, while failures and lost terminals remain Blocked. Runtime model and effort are checked before the task prompt, and read-only mode enforces workspace-scoped filesystem reads only.
- Available and Rest update the bot's pickup preference for future work; they do not stop current terminal activity. Cleanup is a manual OMP action: run `/ranch-clean` inside the selected bot terminal to open a fresh session. Neither action deletes conversation history or project files.
- Task archive preserves the task record. Saves use revisions; conflicting edits show an error and require reload. The companion persists accepted state in `%LOCALAPPDATA%\OmpBot\ranch.json`.
- Bot Bank profiles can be admitted or retired from the sidebar. Retirement during active or unresolved terminal activity waits for a safe `ready` or `done` observation and keeps the profile and history.

## Ranch behavior

Motion has Lively, Calm and Still modes; reduced-motion preferences remain respected. It affects display animation only. Bots walk about 50% faster than the previous release. Calm, Curious, Cheerful, Focused and Sociable personalities guide idle wandering; color is cosmetic. Thinking uses a working animation while retaining its truthful status.

Choose Meadow, Courtyard, Glasshouse, Rooftop or Depot maps, with additional idle points of interest. The palette includes Crimson (burgundy, charcoal and ivory), Arctic and Orchid. Feed portraits show the head and chest; updates briefly appear as speech bubbles.

Click the Attention Bell to wake sleeping residents. Working bots continue and charging/offline bots stay off. A sleeping Pipeline gets one status check without a new job or renewed waiting budget. Needs you opens the sidebar attention lane. The Ranch itself no longer embeds task editing, profile editing or context-policy controls.

## Reliable work and continuity

Each task receives a fresh conversation with bounded, project-scoped family and dependency handovers. Related work prefers an eligible bot familiar with that family, with bounded fallback and fairness. The Project Manager can inspect exact inputs, publish/reset handovers, attach explicit source references and change family preference through AI Sync. A family color never overrides dependency, assignment or eligibility checks.

Task delivery is reserved, received, claimed and started. Lost responses replay the same reservation to the original source session; ambiguous attempts remain owned and blocked rather than launching twice. The sidebar shows delivery stage and last-report diagnostics. Updated managed interactive sessions can publish `ranch_status` without an assigned Board task; existing sessions need a safe reopen after installing.

## Runtime and privacy

Windows, Node 20+, Git for Windows/Git Bash, Bun 1.3.14+, and compatible Oh My Pi are required to run managed terminals. OMP and provider authentication are runtime requirements. Setup readiness checks do not verify provider login or send model prompts.

The connection key authorizes status, focus, and widget bot/task controls. Setup credentials and per-launch runtime credentials stay private and automatic; no arbitrary shell-command endpoint is exposed. Legacy management tokens remain supported for older widgets.

The OMP extension sends up to 400 characters of the latest visible user/assistant text for the details peek. Hidden reasoning and tool output are excluded. Excerpts remain in memory and are not saved in `ranch.json`. Conversation history is retained; context cleanup does not delete project files.

Ranch Desk remains in the release as a compatibility widget for existing installs and is not required for the integrated Ranch workflow.


## Playful ranch and work queues (0.12.0)

Ranch pokes and dragging only affect appearance/inspection. Drop a bot on the Desk to inspect it; use explicit controls to change work. The pinned Desk prioritizes Now, Next and Needs you, with expandable statistics. Personality changes presentation independently of work role.

The companion Board has Workflow and Bot queues views. Inbox holds unreleased drafts; Ready holds released work. Assign tasks to a bot or leave them in the shared pool. Drag to append/reorder, or use Move earlier/later. Assigned released work precedes shared work. A blocked assigned head remains visible and is not silently skipped. Dependencies explicitly wait for accepted Done; queue order alone does not create dependencies. Changes conflict if another view has already updated the queue.

Finish then rest disables future pickup without stopping current work. Stop current task requires confirmation and verified terminal closure; interrupted tasks need review/retry. Current attempts retain their launch settings. Completion enters Done unless Human review is enabled; review preserves the reported handover until acceptance.

Idle work checks: the individual Ring bell in the sidebar requests a check when safe; automatic pickup uses the same idle gate. Busy agents, questions, queued messages and asynchronous jobs defer checking. The universal Attention Bell targets sleeping residents only and preserves global pickup and per-bot pickup preferences. Terminals hand off to a fresh task process with scoped reports. Updated extensions require a safe reopen of existing sessions. Lost responses retry the same reservation; ambiguous execution remains unresolved for inspection. Live provider execution and physical iCUE touch are not certified by browser/mock tests.

The Ranch feed uses compact posts with bot names and timestamps. Fresh bot progress updates also appear in short speech bubbles for eight seconds; newer posts replace the same bot's bubble. Bubbles follow the bot, stay inside the Ranch, and leave touch/drag gestures available. Saved history stays in the feed without replaying when the widget opens.
