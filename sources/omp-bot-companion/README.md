# Bot Ranch Central Companion 0.4.0

Start with Open Bot Ranch Setup.cmd, or bash open-setup.sh. One local Node process serves the setup page, manages four saved residents and supplies widget status. The launcher reuses a healthy companion and reports an occupied port/older companion instead of starting a second service. Launch-Companion.cmd remains available for a visible diagnostic console.

Setup includes nicknames, absolute project folders, twelve distinct color choices, Launch / Resume, New session, Show terminal, Close, readiness checks, masked pairing-key reveal/copy and idle-sleep delay. Launch / Resume focuses an already-open resident instead of duplicating it. New session closes the existing terminal only after confirmation and keeps old history. A blocked normal close aborts replacement. Per-resident operations are serialized.

Requires Windows, Node 20+, compatible Bun/OMP and Git for Windows. Check setup tests versions, folder/storage access, bundled files and actual helper execution. It does not verify model credentials or send a model prompt. Managed terminals must emit an extension heartbeat to show connected.

Data: %LOCALAPPDATA%\OmpBot\ranch.json; sessions/<resident-id> for isolated conversation history; terminals/ for process identity/binding records. PID and creation time guard window operations. Unresolved launch timeouts remain blocked until reconciled; the server never silently spawns a duplicate or force-kills a process. Unmanaged older OMP terminals remain status-only unless linked by earlier launchers.

The admin credential in admin-key.txt is separate from pairing-key.txt. Open setup passes the admin credential in a fragment, clears it immediately and stores it for that browser tab. Administrative endpoints require that credential and reject foreign browser origins. Widget credentials cannot configure, launch or close residents or reveal keys. Neither credential is served in public UI assets or status. Keep the complete ui and setup folders with all companion scripts.

No arbitrary command API is exposed. Project paths are passed as data. A bounded excerpt of the latest visible user/assistant message is included in authenticated widget snapshots for the peek bubble. Hidden reasoning and tool output are excluded; excerpts stay in memory and are never written to ranch.json. Existing Windows script policy is respected. No services, startup tasks, runtime upgrades or security-setting changes are installed.

Transport: loopback 127.0.0.1:43822; authenticated /state, /snapshot, /focus; separate authenticated /admin routes; bounded request bodies and status retention. OMP_BOT_PORT and OMP_BOT_KEY_FILE isolate tests. The widget uses the default port.

The old Start-OMP and Start-Bot-Ranch launch scripts remain for compatibility; use central setup for saved residents. Runtime source: https://github.com/can1357/oh-my-pi . See the widget README for verification limits and setup details.

Resident windows use a permanent Bot Ranch - nickname title, a matching background tint and cursor. Existing terminals must be closed and reopened after work finishes to load the new extension/title. One tap on a widget bot peeks; a second tap within 450 ms focuses its window.

Build from the repository root with npm ci and npm run build:ranch. Releases are generated under artifacts/releases/bot-ranch. See ../../docs/guides/build-and-import.md.
