# Sidebar control center

The desktop sidebar becomes the everyday Board and bot-management surface. The existing full Board remains available as a pop-out for advanced dependencies and pipeline setup. Settings opens in its own window. All surfaces use the same companion state and revision checks.

## Experience

- Replace the lightning brand with a robot mark. Board, Bots, Factory and Updates are explicit destinations.
- Short mode preserves the compact dock and expanding panel. Long mode gives the rail and panel the monitor's usable height, preserving window bounds and saved preference. These are independent of iCUE/Desktop Ranch display mode.
- Board uses status lanes suited to a narrow panel, family-colored compact cards, local task details and creation. Assign or reorder pending tasks, release/hold, start an assigned task, accept review, and create released follow-ups. Never infer completion from dragging cards; runtime evidence owns work status.
- Bots separates residents from the existing Bot Bank. Admit, put away (after current work when busy), open/resume a session, show terminal, and ring an attention bell. Bank membership and terminal lifetime are separate; putting away must not kill a session.
- Factory creates a portable profile directly in the existing bank. Name, color, design, role, project, context policy, instructions and pickup/read-only preferences are saved there. No model call or terminal starts during creation.
- Ring all requests work checks for eligible residents. Skip bank bots, closed sessions, unsupported runtimes and pending requests; report counts. Busy conversations are not interrupted. No implicit session launches.
- Board and Settings pop-outs are ordinary sandboxed windows without the dock preload. Navigation and requests remain restricted to this companion. Do not expose credentials in the dock renderer.

## Implementation sequence

1. Cover bank-first creation, ring-all behavior, action validation and long-mode geometry with tests.
2. Extend the existing manager and authenticated action routes; preserve revision/concurrency guards.
3. Add isolated companion pop-outs and saved short/long window mode.
4. Build reusable sidebar Board, Bots and Factory panels; retain status polling, offline read-only behavior, reduced motion and keyboard alternatives to drag/drop.
5. Verify task lifecycle and management through isolated browser/native tests. Package a new version without modifying or restarting live bot work.

## Proof

Factory leaves a bot inactive and persisted, even with free Ranch slots. Ring all never launches or closes terminals, reaches busy supported residents safely and reports skips. Stale task/profile revisions reject mutations. Board detail edits survive polling. Long/short bounds fit small and negative-coordinate monitors. Pop-outs cannot invoke dock IPC or navigate off-origin. Layout and common workflows verified at short and long sizes.
