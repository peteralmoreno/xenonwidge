# XENEON widgets

Four touch widgets for Corsair iCUE / XENEON EDGE, with editable source and reproducible release commands.

| Project | Widget source | Companion |
| --- | --- | --- |
| Doodle Pad | [Drawing tools, colors, clipboard and PNG export](sources/doodle-pad/README.md) | None |
| Audio Deck | [Media controls and application volume mixer](sources/audio-deck/README.md) | [Windows .NET companion](sources/audio-deck-companion/README.md) |
| Ranch Desk | [Conversation desk beside the Large ranch](sources/ranch-desk/README.md) | Uses the Bot Ranch companion |
| Bot Ranch | [Four animated Oh My Pi residents](sources/omp-bot/README.md) | [Local setup, terminal management and session status](sources/omp-bot-companion/README.md) |

On Windows, install Node.js 20+ with npm and the .NET 9 SDK, then run from your checkout:

```powershell
npm ci
npm run build
```

Packages are written to `artifacts/releases/`: one `.icuewidget` per project and companion ZIPs for Audio Deck and Bot Ranch. Versions come from widget manifests. Build Bot Ranch and its supporting Ranch Desk together with `npm run build:ranch` (no .NET, Bun, OMP, or login required to build it).

See the [build, install and verification guide](docs/guides/build-and-import.md) for prerequisites, output paths, companion setup, tests, and remaining device checks. Browser tests need `npx playwright install chromium` once. Run `npm test` for unit, browser and Audio Deck companion tests.

Source lives under `sources/`, automation under `tools/`, and [reference/design notes](docs/README.md) under `docs/`. Generated releases, dependencies, test output, local credentials and conversation data are ignored by Git. Historical local artifacts are preserved; clean checkouts build every current release from source.

Import and touch behavior on physical XENEON hardware still require manual verification. Bot Ranch's real model login, terminal launch/resume/focus, and OMP extension behavior must also be checked with your local runtime. Automated tests do not establish these results.
