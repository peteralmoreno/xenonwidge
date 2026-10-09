# Bot Ranch: overhead ranch and companion setup

Updated design, 2026-10-08. Incorporates the user's request for an overhead ranch, long-idle sleep, block-hammering work, saved named instances and a separate new-session option.

## Ranch

Keep Medium size, four residents and four distinct stable colors. Replace the side-view scene with an overhead grassy enclosure, paths, resting spots and four block workstations. Give robots directional pixel sprites and keep every bot separately tappable.

Connected, idle residents wander with pauses. After two minutes without agent activity they go to a resting spot and sleep; make this delay configurable in setup. Heartbeats do not reset the idle timer. A new agent turn wakes the bot immediately. Done gets a brief celebration, then wandering and eventual sleep. Sleeping is still connected; closed/offline bots have a separate dimmed/disconnected appearance.

On work, robots travel to their assigned block pile and hammer. Retain reading/researching/writing/running/thinking labels and small status badges so the new shared work animation does not erase useful information. Questions/approvals stop hammering and show a persistent question bubble; they never sleep while waiting for the user. Errors similarly remain visible. Task completion interrupts the work animation promptly even if the bot has not reached the workstation. Decorative travel never delays real status updates.

Avoid overlapping hit areas and prevent paths through workstation/rest obstacles. Pause/reduced motion uses stationary poses at the appropriate destination. Tapping still selects the resident and requests its linked terminal window.

## Companion setup page

Provide a local browser page opened by an Open Bot Ranch Setup launcher. It is the place to configure and manage up to four saved residents. Each saved resident has a stable ID, nickname, color, absolute project folder and its own OMP session directory. Nicknames and colors survive closing and reopening a terminal.

Each resident card shows configured folder, terminal/connection status, last activity, and these separate actions:

- **Launch / Resume:** start the saved instance, continuing its latest conversation when available. A running instance is focused rather than duplicated.
- **New session:** start a clean conversation in that resident's folder; preserve old session files. If a terminal is already open, confirm replacement and close it before creating the new session. If it is working, explicitly warn that its current work will be interrupted.
- **Show terminal:** focus the current linked window.
- **Close:** request normal closure of that resident's managed terminal. Confirm if work or a question is active. Report success only after the process exits; do not silently escalate to force-killing it.
- **Edit:** change nickname, folder or color. Folder changes apply on the next launch, never silently move an active OMP process.

Reopen resumes; New session is explicitly separate. New session does not delete history or project files. Prior history remains accessible through OMP's session picker. The user's latest request resolves the earlier reopen question by providing both actions.

Use one session directory per saved resident, even when two residents work in the same project. Pass that explicit session directory to OMP so resume cannot accidentally choose another bot's conversation. Distinguish saved resident identity, current process identity and current OMP conversation identity.

## Pairing and readiness

The setup page offers a masked pairing key with explicit Show and Copy controls and the iCUE package location. Keep the key off public routes and out of logs/URLs. Explain iCUE Settings > Software Settings > Widget Access, with a visible connection status based on a widget handshake; do not claim a native iCUE permission check that the companion cannot perform.

Run a readiness check before launch: Node runtime, compatible Bun and OMP command, Git Bash/mintty, bundled extension/helper/UI files, writable local configuration/session storage, existing accessible project folder, companion port ownership, and managed-terminal binding capability. Show specific failures with repair instructions. Check OMP version/startup without sending a paid model prompt. Model login/readiness may require a terminal check; do not present a version probe as proof of account authentication.

After launch distinguish starting, terminal open, extension connected and failed. Require an extension heartbeat within a bounded startup period and show a retry action on failure. Serialize actions per resident and prevent double launches. Persist definitions atomically under the existing per-user Bot Ranch data directory. Reconcile verified live process bindings after companion restart.

## Control boundary

The setup page has a separate local management credential from the widget pairing key. The setup launcher bootstraps the browser through a private fragment which is immediately removed; authenticated management routes handle configuration, key reveal, folder validation and lifecycle actions. The publicly loadable page itself exposes no secrets. Widget credentials remain sufficient only for status and focusing known sessions, not arbitrary terminal launch/close.

Management accepts saved resident IDs and validated fields, never raw shell commands. Project paths and nicknames are data, passed as argument-array/environment values. All services remain loopback-only. Verify PID plus process creation time and ownership before window actions. Respect Windows policy and surface failures without changing security settings.

## Acceptance

- Four persistent nicknamed residents survive setup reload, companion restart and terminal reopen with unchanged colors.
- Connected idle wandering, timed sleep, work travel/hammering, question/error, done and offline transitions are separately verified with a controlled clock.
- Two residents using the same folder have independent resumable histories. New session preserves previous files and cannot accidentally resume the previous conversation.
- Busy Close/New session require explicit confirmation; double clicks cannot launch duplicate processes; failed graceful closure does not trigger a replacement.
- Readiness checks correctly distinguish missing dependencies, invalid folders, unauthenticated OMP, occupied port and absent extension heartbeat.
- Public/widget-only requests cannot reveal keys, alter profiles, launch or close terminals. Management credentials never appear in state responses or logs.
- Browser layout and touch-target tests, server lifecycle/authentication tests, script checks and real local launch/session smoke checks precede packaging. Physical iCUE touch/focus verification is reported separately.

## Upstream session reference

OMP documents explicit session directories, continue and new-session behavior in its CLI/session references. Verify behavior against installed OMP 18.8.6 before shipping lifecycle controls:

- https://github.com/can1357/oh-my-pi/blob/main/docs/cli-reference.md
- https://github.com/can1357/oh-my-pi/blob/main/docs/session-operations-export-share-fork-resume.md
