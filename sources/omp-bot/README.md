# Bot Ranch 0.17.1

Bot Ranch is a Large overhead ranch widget with an integrated Tasks view and bot details. It connects to one local companion that keeps resident profiles, project tasks, preferences, and existing terminal-session records. The widget's management workflow is designed for the Large layout; physical display fit still needs device validation.

## Start

1. For a new Windows PC, follow the [Bot Ranch install guide](../../docs/guides/bot-ranch-install.md), which covers prerequisites, building or installing the matching release, the companion, OMP, Bot home, and iCUE pairing.
2. Build with `npm ci`, then `npm run build:ranch` from the repository root when building from source.
3. Extract the companion ZIP and run `Install botRanch.cmd` once. Thereafter open **botRanch** from the Start menu for the floating desktop dock. Its sidebar includes Board, Bots and Factory; **Full Board** and **Settings** open separate companion windows. See the [desktop guide](../../docs/guides/bot-ranch-desktop.md), including iCUE page-navigation shortcuts.
4. Add bot profiles with project folders, colors, role, model preference, context policy, pickup setting, and read-only request. The active ranch shows up to six profiles; saved Bot Bank profiles retain their identity and settings.
5. Import Bot Ranch into iCUE, choose Large, and pair it with the single Connection key from Setup. In iCUE, allow `127.0.0.1:43822` under Settings > Software Settings > Widget Access.
6. Open Settings > Connection. Paste the single connection key into the widget's Connect dialog for activity and management controls.

## Use

- Ranch shows terminal activity, attention, selected-bot details, observed model/context metadata when available, and the latest supported visible excerpt. Selecting a bot does not focus its terminal; double-tap or use the explicit terminal action.
- Tasks stores project-targeted local work with instructions, acceptance criteria, assignment, model-family preferences, requested reasoning effort, and automatic-pickup release. Assignment does not start work. Release starts only when global pickup is enabled and an active eligible bot is available.
- Start creates a durable attempt and launches through the OMP extension. The task stays To do until OMP acknowledges agent start; success goes to Done unless Human review is enabled, while failures and lost terminals remain Blocked. Runtime model and effort are checked before the task prompt, and read-only mode enforces workspace-scoped filesystem reads only.
- Available and Rest update the bot's pickup preference for future work; they do not stop current terminal activity. Cleanup is a manual OMP action: run `/ranch-clean` inside the selected bot terminal to open a fresh session. Neither action deletes conversation history or project files.
- Task archive preserves the task record. Saves use revisions; conflicting edits show an error and require reload. The companion persists accepted state in `%LOCALAPPDATA%\OmpBot\ranch.json`.
- Bot Bank profiles can be admitted or retired from the widget. Retirement during active or unresolved terminal activity waits for a safe `ready` or `done` observation and keeps the profile and history.

## Ranch behavior

All eleven public terminal states remain distinct. Work activities use the active map's station routes; waiting/error use the attention bell, ready/done roam and sleep, and offline uses charging docks. Meadow and Courtyard coordinates are shared by movement and station artwork. The walking pace is multiplied by 1.15 while relative color speeds and idle timing stay the same. Quiet, Pause, reduced motion, selection, and touch holds continue to preserve status visibility.

Colors set a resident's relative walking pace. These are baseline pixels per second before the 1.15 movement multiplier.

| Color | Baseline px/s | Max idle destinations/minute |
| --- | ---: | ---: |
| Coral | 32 | 6 |
| Cyan | 28 | 5 |
| Gold | 30 | 4 |
| Violet | 24 | 4 |
| Rose | 27 | 5 |
| Orange | 36 | 7 |
| Lime | 34 | 6 |
| Emerald | 25 | 4 |
| Blue | 29 | 5 |
| Indigo | 23 | 3 |
| Silver | 26 | 4 |
| Red | 35 | 6 |

## Runtime and privacy

Windows, Node 20+, Git for Windows/Git Bash, Bun 1.3.14+, and compatible Oh My Pi are required to run managed terminals. OMP and provider authentication are runtime requirements. Setup readiness checks do not verify provider login or send model prompts.

The connection key authorizes status, focus, and widget bot/task controls. Setup credentials and per-launch runtime credentials stay private and automatic; no arbitrary shell-command endpoint is exposed. Legacy management tokens remain supported for older widgets.

The OMP extension sends up to 400 characters of the latest visible user/assistant text for the details peek. Hidden reasoning and tool output are excluded. Excerpts remain in memory and are not saved in `ranch.json`. No conversation reset or workspace cleanup is implemented.

Ranch Desk remains in the release as a compatibility widget for existing installs and is not required for the integrated Ranch workflow.


## Playful ranch and work queues (0.12.0)

Ranch pokes and dragging only affect appearance/inspection. Drop a bot on the Desk to inspect it; use explicit controls to change work. The pinned Desk prioritizes Now, Next and Needs you, with expandable statistics. Personality changes presentation independently of work role.

The companion Board has Workflow and Bot queues views. Inbox holds unreleased drafts; Ready holds released work. Assign tasks to a bot or leave them in the shared pool. Drag to append/reorder, or use Move earlier/later. Assigned released work precedes shared work. A blocked assigned head remains visible and is not silently skipped. Dependencies explicitly wait for accepted Done; queue order alone does not create dependencies. Changes conflict if another view has already updated the queue.

Finish then rest disables future pickup without stopping current work. Stop current task requires confirmation and verified terminal closure; interrupted tasks need review/retry. Current attempts retain their launch settings. Completion enters Review, with the bot's reported handover preserved at home; acceptance moves it to Done.

Idle work checks: **Check for work** on the Desk or Board > Bot queues requests one check, even while automatic pickup is paused. It never releases held tasks. Busy agents, pending questions/approvals, queued messages and asynchronous jobs defer checking. Enabled automatic pickup uses the same idle check. The terminal window stays open: the launcher hands off to a fresh OMP process, resuming saved task context only when policy permits. Older terminals need one restart with this release; direct Start on an already-open terminal still requires closure, so use Check for work instead. Lost acknowledgments remain unresolved rather than retrying. Live provider execution and physical iCUE touch are not certified by browser/mock tests.
