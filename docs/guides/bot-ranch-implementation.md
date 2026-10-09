# Bot Ranch Implementation Plan

Execution: inline, following the user's instruction to build now. No Git repository is present; preserve earlier release artifacts.

Goal: four distinct pixel bots display OMP activity and request focus of explicitly linked Git Bash windows.
Spec: [Bot Ranch design](bot-ranch-design.md).

## Work units

- [ ] Add browser regressions for four residents, stable colors, overflow, activity, selection/focus, pause and layout. Confirm failures against the single-bot widget.
- [ ] Replace the scene with original code-native pixel sprites, a ranch landscape, four persistent slots and Manage bots. Keep existing pairing, status transport and reduced-motion behavior. Tests exercise five sessions, reordered snapshots, disconnect and reload.
- [ ] Add authenticated POST /focus using a session ID only. Store verified process binding metadata privately, reject stale/unknown sessions and serialize requests. Tests cover unauthorized requests, malformed data, unsupported sessions and process metadata projection.
- [ ] Add a Windows Git Bash launcher with a unique per-launch binding file containing PID and creation time. The extension forwards this metadata with snapshots. A fixed PowerShell helper validates mintty.exe identity and creation time before restoring/focusing the window, and confirms foreground identity afterward. Existing sessions without binding return unavailable.
- [ ] Verify source, run workspace tests, inspect four-bot screenshots, validate/package Bot Ranch 0.2.0 and its complete companion. Document iCUE permissions, launcher instructions and the distinction between automated checks and actual terminal-focus verification.

## Interfaces

Snapshots retain version 1 and may add `terminal: {pid: positive integer, started: string}`. These fields are retained privately and excluded from GET /state. State adds `capabilities: {focus: true}` and per-session `canFocus`. POST /focus accepts exactly `{id: string}`, requires the existing bearer key, and returns `{result: 'focused'|'unavailable'|'closed'|'attention'}`. It never accepts a command or window handle.

UI slot storage: `omp-bot.residents`, a four-element array of session IDs or null. New active sessions fill free slots; existing offline entries remain until the server removes them. Choosing a fifth session replaces only the chosen slot. A bot button carries its own session ID and freezes position while pressed.

## Review focus

Test reordered/fifth sessions to prevent color churn; absent capabilities for older companions; stale identities and simultaneous focus requests; tiny/reduced-motion layouts; loss of bridge connectivity while residents remain visible. Actual Windows foreground restrictions require manual confirmation and must not be hidden by a successful HTTP response.

## Execution record

Implemented all five work units inline. No Git commits were possible because the workspace has no repository. Source and earlier release artifacts were preserved.

Ruling: four fixed color lanes with short idle walks keep moving bots separately tappable in Medium; reduced previews retain 44px bot targets.
Ruling: terminal focus requires an explicitly managed mintty launch, avoiding guessed window titles. Existing OMP instances continue status-only until relaunched.
Ruling: resident exclusions persist separately from slot assignments, so removing a bot cannot immediately auto-fill that same bot.
Ruling: retain existing PowerShell policy, surface launch errors and document restrictions. No security-policy override ships.

Review corrections and final tests are recorded in artifacts/bot-ranch/README.md. Native foreground activation and iCUE touch/import remain manual verification, not advertised as proven.
