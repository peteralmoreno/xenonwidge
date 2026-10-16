# XENEON widgets

Four touch widgets for Corsair iCUE / XENEON EDGE, with editable source and reproducible release commands.

## Downloads

[Download the latest botRanch release](https://github.com/peteralmoreno/xenonwidge/releases/latest) · [All releases](https://github.com/peteralmoreno/xenonwidge/releases)

Open **Assets** on the release page:

- **`bot-ranch-companion-<version>.zip`** — Windows desktop panel, Ranch app and local companion. Extract the whole ZIP, run **Install botRanch.cmd**, then open **botRanch** from Start.
- **`bot-ranch-<version>.icuewidget`** — optional matching widget for iCUE / XENEON EDGE.
- **`SHA256SUMS.txt`** — checksums for the downloads.

When updating, choose **Quit desktop app** from the existing botRanch tray menu before reopening. The × button only hides the dock. Finish active work before the companion needs to update. The panel shows the running App and Companion versions.

The desktop ZIP includes its UI runtime. Node.js is still required; managed bots also need Git Bash, Bun, OMP and provider access. See the [installation guide](docs/guides/bot-ranch-install.md). Downloads require access to this repository while it is private. GitHub's automatic **Source code** archives are for development, not the ready-to-run app.

## Projects

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

Bot Ranch source 0.18.1 integrates field-tested terminal handoffs and Windows compatibility, pipeline-only task eligibility, 32 bot colors and PM/Pipeline designs. The desktop rail has a clearer red accent and a resizable task panel. Companion recovery, sticky family pickup, and the local AI Sync API remain available with Board, Bot Bank and Factory. Full Board, Settings, Connection & recovery, and AI Sync open as separate windows. Open **botRanch** from Start after installing the matching companion ZIP. Read the [desktop dock and iCUE navigation guide](docs/guides/bot-ranch-desktop.md) and the [AI Sync guide](docs/guides/bot-ranch-ai-sync.md). The Windows package includes the desktop runtime; React, Motion and Lucide are bundled.

Use native OMP `/loop` for repeated reasoning or repair work; use the Pipeline monitor for scheduled API status checks without model calls. See [when to use /loop, examples and token behavior](docs/guides/bot-ranch-loop.md). Bot Ranch 0.13.0 includes Pipeline monitoring and a standalone native-loop command helper; managed loop execution remains unavailable. See [Pipeline setup and short status updates](docs/guides/bot-ranch-pipeline.md).
