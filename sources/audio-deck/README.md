# Audio Deck

New project: a combined XENEON EDGE music player and volume mixer.

Status: 0.1.0 preview built. Browser and Windows companion checks pass; actual iCUE import and loopback access still require a device check.

## Install

1. Double-click `Launch.cmd` (or run `bash launch.sh` from Git Bash on Windows) after extracting `artifacts/releases/audio-deck/audio-deck-companion-0.1.0.zip`. Keep its window open. Windows x64, Windows 10 2004 or newer; the .NET runtime is bundled.
2. Import `artifacts/releases/audio-deck/audio-deck-0.1.0.icuewidget` into iCUE and choose Medium.
3. Open `%LOCALAPPDATA%\AudioDeck\pairing-key.txt`, copy its contents, and paste into the widget's Connect panel. The key stays on this PC; treat it as a local control credential.
4. Open a music app that publishes Windows media controls. Select it in Player. Mixer lists audio sessions on the Windows default multimedia output.

Closing the companion stops control. Nothing is installed as a service or added to startup. Start the executable again when needed. Only one companion can use port 43821 at a time.

## Controls and limits

- Player: artwork when provided, title/artist, previous, play/pause and next; disabled commands reflect the player's capabilities.
- Mixer: each Windows session has its own volume and mute. Multiple sessions from one app can have separate rows. Browsers do not always expose separate tabs to Windows.
- Master volume stays visible in both tabs. Mute preserves the volume level. Slider changes apply when released.
- Changing the Windows default output refreshes the mixer. An old drag never targets the replacement output.
- Unsupported media apps show no player. Exclusive-mode audio may bypass session volume. Only the default output is mixed in this release.
- If Connect fails, verify the companion is running and use its current pairing key. If those work in a browser but fail in iCUE, the host may restrict loopback access; this release's iCUE transport is not yet verified.

## Development

Run `npm run validate:audio`, `npm run package:audio`, and `npm run build:companion` at the workspace root. `npm test` covers both widgets and companion validation. With the companion running, run `npm run check:companion` and `node tools/check-audio-widget-live.cjs` for Windows integration checks. These checks preserve current audio levels; live playback still needs a playing app.

See the [design and API findings](../../docs/guides/audio-deck-design.md). Run `npm run build:audio` to generate the widget and companion ZIP under `artifacts/releases/audio-deck/`. See the [build guide](../../docs/guides/build-and-import.md).
