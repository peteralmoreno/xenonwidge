# XENEON widgets

Four touch widgets for Corsair iCUE / XENEON EDGE, with editable source and reproducible release commands.

| Project | Widget source | Companion |
| --- | --- | --- |
| Doodle Pad | [Drawing tools, colors, clipboard and PNG export](sources/doodle-pad/README.md) | None |
| Audio Deck | [Media controls and application volume mixer](sources/audio-deck/README.md) | [Windows .NET companion](sources/audio-deck-companion/README.md) |
| Ranch Desk | [Legacy companion widget retained for existing installs](sources/ranch-desk/README.md) | Uses the Bot Ranch companion |
| Bot Ranch | [Large ranch with integrated task and bot management](sources/omp-bot/README.md) | [Local setup, bot bank, durable tasks and terminal status](sources/omp-bot-companion/README.md) |

On Windows, install Node.js 22.12+ with npm and the .NET 9 SDK, then run from your checkout:

```powershell
npm ci
npm run build
```

Packages are written to `artifacts/releases/`: one `.icuewidget` per project and companion ZIPs for Audio Deck and Bot Ranch. Versions come from widget manifests. `npm run build:ranch` builds the integrated Large Bot Ranch plus the legacy Desk compatibility package and companion (no .NET, Bun, OMP, or login required to build them).

See the [new-PC Bot Ranch install guide](docs/guides/bot-ranch-install.md) for prerequisites, fresh-checkout build steps, companion installation, OMP runtime setup, iCUE pairing, and verification. The [build, install and verification guide](docs/guides/build-and-import.md) covers all projects. Browser tests need `npx playwright install chromium` once. Run `npm test` for unit, browser and Audio Deck companion tests.

Source lives under `sources/`, automation under `tools/`, and [reference/design notes](docs/README.md) under `docs/`. Generated releases, dependencies, test output, local credentials and conversation data are ignored by Git; clean checkouts build every current release from source.

Import, Large-display fit, and touch behavior on physical XENEON hardware still require manual verification. Bot Ranch uses the installed OMP extension API for durable task dispatch, acknowledgment, review, per-attempt model/effort selection, and enforced read-only tool calls. Runtime behavior is covered with injected tests; no paid model prompts were sent. Provider acceptance and physical XENEON behavior still require manual verification. The widget can dispatch tasks and review completed attempts.

## Bot Ranch automation modes

Choose **Ranch display → A · iCUE widget / B · Desktop app** in the dock or tray. B runs the full Ranch in a resizable window without iCUE, backed by the same companion and task board. Grass remains interactive; only menu margins are excluded from pointer targets.

Bot Ranch 0.17.1 adds companion recovery, sticky family pickup, and a local AI Sync API, CLI and management window to the Board controls, Bot Bank and Factory. Full Board, Settings, Connection & recovery, and AI Sync open as separate windows. Open **botRanch** from Start after installing the matching companion ZIP. Read the [desktop dock and iCUE navigation guide](docs/guides/bot-ranch-desktop.md) and the [AI Sync guide](docs/guides/bot-ranch-ai-sync.md). The Windows package includes the desktop runtime; React, Motion and Lucide are bundled.

Use native OMP `/loop` for repeated reasoning or repair work; use the Pipeline monitor for scheduled API status checks without model calls. See [when to use /loop, examples and token behavior](docs/guides/bot-ranch-loop.md). Bot Ranch 0.13.0 includes Pipeline monitoring and a standalone native-loop command helper; managed loop execution remains unavailable. See [Pipeline setup and short status updates](docs/guides/bot-ranch-pipeline.md).
