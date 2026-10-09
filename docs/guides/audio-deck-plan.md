# Audio Deck implementation plan

Spec: [Audio Deck design](audio-deck-design.md). User authorized implementation on 2026-10-08.

## Decisions

- Medium 840 x 696, tabs and persistent master controls. Segoe UI Variable, navy #172936, slate #284352, pale blue #dcecf2, cyan #79d8e8, silver #b3c3cc. Large artwork and a horizontal transport evoke a compact stereo.
- One Windows companion supplies media and mixer state. .NET 9 Windows target, NAudio WASAPI and Windows media sessions. Self-contained Windows x64 release.
- Widget connects to 127.0.0.1:43821 with a per-user random pairing key. No startup registration or volume changes on launch. Companion stays a separate source project and release.
- No git repository is present; implement in the existing project. Actual iCUE import/loopback remains a manual device check because native UI access is unavailable.

## Tasks / ledger

- [ ] Companion: typed state and command protocol; authenticated loopback HTTP; enumerate master endpoint and sessions, stable endpoint/session identities, explicit media session selection, playback, artwork. Validate malformed, unauthorized, missing-target commands before touching Windows state. Run integration checks against real Windows read state.
- [ ] Widget: translated XML-compatible head and manifest; pairing, offline state, tabs, player selection, playback, master and session sliders. Poll without replacing active sliders; freeze order while editing. Commands carry the target identity displayed when editing began.
- [ ] Tests: browser cases for pairing, media command targeting, volume and mute, disappearing session, offline state, responsive layout, import metadata. Backend integration for unauthorized, invalid and vanished targets, startup read state and no-op volume round trip.
- [ ] Release: full tests, CLI validate/package, self-contained companion publish, screenshot review, final fresh-context review and fixes, build and install documentation.

Pre-flight: widget consumes GET /state and POST /command JSON, all authenticated with Bearer pairing key. State fields: master {id,name,volume,muted}, sessions [{id,name,volume,muted}], players [{id,name,title,artist,playing,artwork,canToggle,canNext,canPrevious}], mediaError. Commands: {kind:'volume'|'mute'|'playPause'|'next'|'previous',target:string,value?:number,muted?:boolean}. Reject unknown target instead of using current/default replacement.

Review focus: pairing and browser origins; disappearing targets while dragging; output changes; media timeouts; stale polls after commands.

## Completion ledger

- Companion implemented and self-contained release built; authenticated live Windows API checks passed with four sessions. No active media player was present for playback verification.
- Widget implemented with medium tabs, persistent master, pairing and bounded polling. Six Audio Deck browser cases pass; previews inspected.
- Independent review: fixed movement of active slider caused by removing preceding rows (red regression y=341 to y=249; now passes). Isolated and bounded media work with an exclusive gate retained by abandoned work; companion timeout/recovery checks pass.
- Full workspace tests: 6 Node, 23 browser, companion validation/concurrency checks. CLI validates and packages, with the expected no-icueEvents warning.
- Ruling: actual iCUE import proof cannot be automated because native UI access is unavailable. Ship an explicitly labeled preview with working local-file/Windows integration and manual device checks; do not claim iCUE operation is proven.
- Ruling: insecure website-origin loopback test was blocked by Chromium; local-file test passed without disabling browser security. Preserve that distinction in release notes.
