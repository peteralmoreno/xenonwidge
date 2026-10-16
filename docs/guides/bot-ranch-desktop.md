# Bot Ranch desktop dock

The Windows desktop sidebar keeps the companion's real Board, bots, and updates within reach in a small floating window. It starts pinned above ordinary windows. It reads the same companion state as Board; tasks and progress are not a separate demo or a second task store.

After installing the companion release, open **botRanch** from the Start menu. For an extracted companion ZIP, run **Open botRanch.cmd**. The launcher starts or reconnects to the local companion and opens the dock. **Open Bot Ranch Setup.cmd** remains an explicit way to open the browser Board, with Settings available there. See the [installation guide](bot-ranch-install.md) for the companion and managed-terminal requirements.

## Everyday controls

**Ranch display** in the expanded dock and tray menu chooses the saved display mode:

- **A · iCUE widget** uses the Ranch widget you imported into iCUE. Switching to A closes the standalone Ranch window. It does not launch or configure iCUE.
- **B · Desktop app** opens the full Ranch and its Desk in a normal movable, resizable Windows window. iCUE and XENEON hardware are not required. The native View menu includes zoom, fullscreen and Always on top. Its Ranch menu opens Board/Settings or switches back to A.

The same companion, bot home, bots, tasks and updates back both modes. Switching modes, closing a window or quitting the desktop app does not interrupt bots or create another queue. Display mode and the Ranch window's normal position/size are saved. Opening botRanch again restores B when selected; **Open Ranch app** also opens it directly. An already-open iCUE widget can keep showing the same state while B is open.

- Drag the grip at the top to move the dock. With the grip focused, use arrow keys to move it; hold Shift for larger steps. The dock remembers its position and stays within a monitor's usable area.
- Select **Board**, **Bots**, **Factory**, or **Updates** to open the panel. Collapse it to return to the narrow rail.
- Use the pin button to turn **Always on top** on or off. This preference is remembered.
- Select a task to open its details inside the sidebar. **New task** opens the sidebar editor. **Full Board** opens the original larger Board in a separate window for advanced dependency and Pipeline setup.
- **Full Board** and **Settings** open separate native companion windows. The dock's pickup and bot work-check controls use the same companion actions as those pages.
- The rail's connection indicator opens **Connection & recovery**, which remains available while the companion is offline. It distinguishes startup, offline, unresponsive, port conflict, version mismatch and busy upgrade. Reconnect reuses a healthy companion or starts one only when the configured service is absent. Restart/quit when idle stays pending and cancelable; the companion's active-work guard remains final.
- The **AI Sync** button opens a separate local management window with the actual installed CLI path, versioned catalog, copyable instructions, access mode, change previews and audit history. Inspect is the default; organize applies held task edits; operate also allows explicit release/start/work-check actions. The modes restrict companion operations, not other files available to a local process running as the same user. See the [AI Sync guide](bot-ranch-ai-sync.md).

## Board, bots and Factory

Use **Short dock / Long sidebar** (the resize icon on the rail, or **Sidebar size** in the tray) to choose compact or full work-area height. This preference is saved independently of A/B Ranch display mode. Both retain the same controls; the tall sidebar shows more at once. Drag the dotted handle at the panel's outer bottom corner to change its width and, in Short mode, height. With the handle focused, left/right arrows change width and up/down change height; Shift makes larger changes. The size is saved separately from the compact rail and kept inside the monitor work area.

The panel icon expands/collapses the panel; the robot icon opens Bots. The lighter charcoal rail and crimson edge distinguish botRanch from dark application windows. The connection indicator remains green when connected and amber when offline; red is a navigation accent. Board cards keep their family colors through every status. Status tabs include Inbox, Ready, Working, Review, Done, Blocked and Archive. Open details to assign, release/hold, start an assigned task, accept a result or create an automatically released follow-up. Family continuity is automatic: new task conversations receive scoped handovers and prefer a familiar eligible bot. The PM can inspect or adjust that preference in AI Sync. A 30-second preferred-bot handoff yields immediately if the owner is unavailable, and after three same-family pickups older unrelated work gets a turn. Sticky preferences never replace explicit assignment or queue order, release, dependencies, workspace and model checks. Drag pending cards onto bot queue labels to assign them, or onto another pending card to reorder. The Queue selector and arrow controls offer keyboard alternatives. Dragging never marks work complete.

**Bots** separates **On ranch** from **Bank**. Bring saved bots in, put residents away, open/resume sessions and clean idle context. Putting a busy resident away waits for its current work. Returning to Bank does not close its terminal. Bank admission retains the six-slot and unique resident-color checks.

**Factory** creates a saved profile directly in your existing Bot Bank: name, role, design, color, starting folder, instructions path, context and behavior settings. It does not launch a terminal or consume model tokens. The starting folder defaults to bot home; the chosen role supplies model preference and loading instructions. Choose among 32 colors and Classic, Pipeline or Project Manager designs. The Pipeline design is a valve-and-gauge service robot; PM wears a headset and carries a clipboard. Design does not grant a role or permissions. **Factory > Edit bot** loads any saved resident or bank bot into the same form. Save changes to its name, role, design, color, folder, instructions, context and behavior without changing its Ranch membership. Drafts keep their original revision; if another view changes the profile, use **Reload saved profile** before retrying. Session settings apply on the next launch. Settings remains available for bot and role editing.

**Ring bell** asks a resident to check for work when idle. **Ring all** does the same for eligible residents and reports sent, already-pending and skipped counts. Closed sessions must be opened first. Neither action interrupts busy work or boots bank bots. Pipeline residents check their owned job through the existing monitor behavior.

The hide button hides the dock to the Windows notification area. Its tray menu offers **Show dock** or **Hide dock**, **Always on top**, **Ranch display**, **Open Desktop Ranch**, **Open Board**, **Settings**, **Reset dock position**, and **Quit desktop app**. Use **Reset dock position** if a changed monitor arrangement leaves it somewhere inconvenient. Opening botRanch again brings the existing dock forward.

**Quit desktop app closes the dock, Ranch window and tray app.** The companion keeps running, and quitting does not stop managed bot work. If the companion becomes unavailable, the dock shows its connection state; use Board or Settings to inspect the companion.

## XENEON EDGE navigation

The desktop app offers an alternative to iCUE's swipe handling. Bot Ranch keeps grass available for pointer events and future ranch interactions. Only the dead margins around menus are excluded from Ranch hit targets; buttons remain clickable through their edges, and the Desk still supports scrolling and bot drops. This cannot guarantee that iCUE passes margin gestures to its page switcher: the embedded web view can still consume swipes across the entire widget. Hardware page switching needs verification after import.

The installed iCUE 5.52.93 resources place widget interaction in a child view and page swiping in the outer dashboard. The [published widget specification](https://docs.elgato.com/icue/widgets/specification/) exposes a whole-widget `interactive` flag; the [documented JavaScript API](https://docs.elgato.com/icue/widgets/references/icue-global-object/) does not provide page-navigation commands. Swiping out of Ranch has not been verified as fixed on the hardware.

For a supported route between iCUE pages, open **iCUE → XENEON EDGE → Screen Setup** and assign keystrokes to **Previous Display Screen** and **Next Display Screen**. Press those configured shortcuts when you need to leave an interactive widget. These fields appear in CORSAIR's [official Screen Setup screenshot](https://d1q3zw97enxzq2.cloudfront.net/images/Screenshot_2026-08-03_095837.width-540.format-webp.webp); do not assume a default page shortcut. Bot Ranch does not synthesize these shortcuts or change the bindings.

The same panel's **Switch Display Mode** shortcut switches between iCUE widgets and the Windows desktop. CORSAIR documents setup and background operation in its [display-mode guide](https://www.corsair.com/us/en/explorer/diy-builder/accessories/how-to-switch-between-widgets-and-monitor-on-xeneon-edge/). This is separate from switching widget pages.

## Completion chime

Starting with 0.20.1, newly opened botRanch terminals use a quiet original 0.78-second two-note chime instead of the Windows default bell. This replaces terminal bell audio, including OMP completion and other terminal attention bells; it adds no duplicate completion notification. Existing notification timing, taskbar highlighting and terminal mute settings remain in effect. The sound is bundled locally and requires no network or model call. Already-open terminals keep their previous sound until safely reopened after work finishes. System-wide Windows sounds and unrelated terminals are unchanged.

The source asset is `sounds/completion.wav`, regenerated with `node tools/generate-ranch-chime.cjs`. The launcher uses Mintty's [per-window BellFile option](https://mintty.github.io/mintty.1.html).
