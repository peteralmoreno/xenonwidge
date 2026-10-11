# XENEON widgets

Four touch widgets for Corsair iCUE / XENEON EDGE, with editable source and reproducible release commands.

| Project | Widget source | Companion |
| --- | --- | --- |
| Doodle Pad | [Drawing tools, colors, clipboard and PNG export](sources/doodle-pad/README.md) | None |
| Audio Deck | [Media controls and application volume mixer](sources/audio-deck/README.md) | [Windows .NET companion](sources/audio-deck-companion/README.md) |
| Ranch Desk | [Legacy companion widget retained for existing installs](sources/ranch-desk/README.md) | Uses the Bot Ranch companion |
| Bot Ranch | [Large ranch with integrated task and bot management](sources/omp-bot/README.md) | [Local setup, bot bank, durable tasks and terminal status](sources/omp-bot-companion/README.md) |

On Windows, install Node.js 20+ with npm and the .NET 9 SDK, then run from your checkout:

```powershell
npm ci
npm run build
```

Packages are written to `artifacts/releases/`: one `.icuewidget` per project and companion ZIPs for Audio Deck and Bot Ranch. Versions come from widget manifests. `npm run build:ranch` builds the integrated Large Bot Ranch plus the legacy Desk compatibility package and companion (no .NET, Bun, OMP, or login required to build them).

See the [build, install and verification guide](docs/guides/build-and-import.md) for prerequisites, output paths, companion setup, tests, and remaining device checks. Browser tests need `npx playwright install chromium` once. Run `npm test` for unit, browser and Audio Deck companion tests.

Source lives under `sources/`, automation under `tools/`, and [reference/design notes](docs/README.md) under `docs/`. Generated releases, dependencies, test output, local credentials and conversation data are ignored by Git; clean checkouts build every current release from source.

Import, Large-display fit, and touch behavior on physical XENEON hardware still require manual verification. Bot Ranch uses the installed OMP extension API for durable task dispatch, acknowledgment, review, per-attempt model/effort selection, and enforced read-only tool calls. Runtime behavior is covered with injected tests; no paid model prompts were sent. Provider acceptance and physical XENEON behavior still require manual verification. The widget can dispatch tasks and review completed attempts.
