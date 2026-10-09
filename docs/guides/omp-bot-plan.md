# OMP Bot design and implementation record

User approved the terminal-companion design and activity states on 2026-10-08. Keep all prompts, answers and approvals in the existing terminal. Widget is read-only status.

## Design

Medium XENEON EDGE widget. One large original SVG robot with different animated props for Ready, Reading, Researching, Writing, Running, Thinking, Needs you, Done, Error, and Offline. Session selector, project name, short activity label and elapsed time. Reduced motion supported. Palette: midnight purple #29263c, lavender #b8a9ed, silver #e6e3f0, blue #82cddd, amber #f1c278. Segoe UI; robot is the dominant visual, status is always readable text.

OMP extension -> authenticated local Node bridge at 127.0.0.1:43822 -> iCUE widget. Extension uses current documented lifecycle, execution and approval events, ignores child-session instances, and sends bounded sanitized snapshots (no prompts, file contents, command arguments or model reasoning). Multiple terminal sessions retain separate identities. Heartbeats expire after 12 seconds. User inputs remain in terminal.

Tool classification: read -> Reading; grep/glob/find/web search/browse/fetch -> Researching; edit/write/apply_patch -> Writing; bash/python/exec -> Running; ask -> Needs you. Unknown tool -> Working. Overlapping tools remain active until their matching ID ends; approval/ask wins. Between tools -> Thinking. Only terminal agent_end (not willContinue) can produce Done; error/abort and queued/background work are handled separately.

## Tasks

1. State engine and extension: test classification, overlapping tools, question/approval handling, terminal vs continuation, error/abort, session switch and subagent isolation. Verify real published OMP event contracts.
2. Node bridge: authenticated snapshot PUT and state GET only, bounded bodies, schema validation, sequence rejection, heartbeat expiry, loopback-only listener. Test real HTTP boundary.
3. SVG/CSS widget: pairing, session selection, state-specific animations, elapsed clock, no stale working animation after disconnect. Test states/layout and actual local-file connection.
4. Launcher and release: Node 20+ and OMP prerequisites; Windows .cmd and Bash launchers. Keep working directory when opening OMP with the extension. Package widget and bridge/extension separately. Full regression run, screenshots, independent review.

## Sources

- https://github.com/can1357/oh-my-pi/blob/main/docs/extensions.md
- https://github.com/can1357/oh-my-pi/blob/main/docs/extension-loading.md
- https://github.com/can1357/oh-my-pi/blob/main/packages/coding-agent/src/extensibility/shared-events.ts
- https://github.com/can1357/oh-my-pi/blob/main/packages/coding-agent/src/extensibility/extensions/types.ts

Current npm release observed: 18.8.6. Native OMP command not installed on PATH; Bun is available. Do not run a paid model prompt solely to test status. iCUE host import/loopback still requires manual verification because native UI control is unavailable.

## Ledger

Pre-flight: bridge accepts version 1 snapshot {id,sequence,project,state,label,startedAt,finishedAt,activeCount}; state engine owns timestamps, bridge owns lastSeen. Widget cannot send commands to OMP. No Git repository exists; implementation stays in project folders.

Implementation complete as a preview: source, widget package, bridge/extension ZIP and launchers created. 13 Node + 26 browser tests pass, alongside companion checks. CLI validates/packages. Original reading and writing art was visually reviewed.

Review corrections: subscribed to auto_compaction_end and auto_retry_end. Idle maintenance now restores the prior settled state; failed/canceled retries stop displaying Work is continuing. Confirmed red/green regression and reran full suite. Session changes retain the terminal ID and monotonic sequence.

Ruling: keep two explicit launch stages (companion, then OMP) so multiple terminal windows share a server with an obvious console-based stop control. OMP prompts/approvals remain untouched.

Ruling: no OMP command is on PATH and installed Bun 1.3.9 cannot parse current OMP. Use temporary Bun 1.4.2 and published OMP 18.8.6 for a no-model-call smoke check; leave global configuration unchanged. Actual loading, ready, heartbeat and acknowledged session switching passed. Document installation/runtime prerequisites.

Ruling: ship labeled preview while native iCUE UI access is unavailable. Local-file browser integration passed; iCUE import/loopback and live model-driven activity require device checks. All tool-state end-to-end checks used synthetic events, explicitly labeled in the build notes.
