# Build, install, and verify

Run commands from the repository root in PowerShell. No personal checkout path is required.

## Prerequisites

- Windows 10/11 with PowerShell 5.1+.
- Node.js 20+ and npm. `npm ci` installs exact committed dependency versions; no global widget CLI is needed.
- .NET 9 SDK for Audio Deck and its tests. Builds use the committed NuGet lock file, win-x64, self-contained publishing, and runtime version recorded in the project file. First restore needs network access.
- iCUE and a compatible XENEON display for import and hardware verification.

Bun, Oh My Pi, Git Bash and model credentials are runtime requirements for Bot Ranch terminal management. They are **not** needed to build Bot Ranch. Configure/login to OMP separately in your terminal. See the [companion guide](../../sources/omp-bot-companion/README.md).

## Build from a fresh checkout

```powershell
npm ci
npm run build
```

The build stages only explicitly listed source files in a unique temporary directory, validates each widget, packages it using the installed iCUE CLI, and creates complete companion ZIPs. Audio Deck source is staged before locked restore/publish so incidental local configuration cannot enter the application. Bot Ranch includes its setup page and current widget UI. Temporary staging is removed after success or failure; historical artifacts remain untouched.

| Command | Result |
| --- | --- |
| `npm run build` | All four widgets and both companions |
| `npm run build:doodle` | Doodle Pad widget |
| `npm run build:audio` | Audio Deck widget and Windows companion ZIP |
| `npm run build:desk` | Ranch Desk widget only |
| `npm run build:ranch` | Bot Ranch + Ranch Desk widgets and companion ZIP |
| `npm run validate:all` | Validate all staged widgets |
| `npm run build:companion` | Audio Deck companion ZIP only |
| `npm run build:ranch-companion` | Bot Ranch companion ZIP only |

Existing `package`, `package:audio`, `package:omp`, `validate`, `validate:audio`, and `validate:omp` aliases remain. Packaging aliases produce widgets only.

```text
artifacts/releases/doodle-pad/doodle-pad-<version>.icuewidget
artifacts/releases/audio-deck/audio-deck-<version>.icuewidget
artifacts/releases/audio-deck/audio-deck-companion-<version>.zip
artifacts/releases/ranch-desk/ranch-desk-<version>.icuewidget
artifacts/releases/bot-ranch/bot-ranch-<version>.icuewidget
artifacts/releases/bot-ranch/bot-ranch-companion-<version>.zip
```

Versions come from widget manifests; companion release names match. Rebuilding a version replaces those generated files. Source inputs and staged file contents are reproducible; archive timestamps and SDK differences mean byte-identical archives are not promised. Record Node/npm/.NET versions when distributing releases. Build never uploads releases, upgrades runtimes, logs in, or registers startup tasks.

## Install and run

1. In iCUE's widget section, use the plus/import action to select a generated `.icuewidget`, then add it to a layout. Verify the version and settings on the device.
2. Audio Deck: extract its entire companion ZIP into a writable folder and run `Launch.cmd` (or `bash launch.sh` from Git Bash). Follow its README for pairing. The self-contained executable does not require a separately installed .NET runtime.
3. Bot Ranch: extract the entire companion ZIP and run `Open Bot Ranch Setup.cmd`. Configure resident project folders, run readiness checks, and pair the widget through setup. Use /login and /model inside an OMP resident terminal when needed. Keep `setup` and `ui` beside the scripts. `Launch-Companion.cmd` opens a diagnostic console.

Runtime data belongs outside the checkout, normally under `%LOCALAPPDATA%`. Bot Ranch stores keys, resident configuration, terminal records and conversation history under `%LOCALAPPDATA%\OmpBot`. Do not share these with releases or reports. Launchers respect existing Windows script policy.

## Verification

```powershell
npx playwright install chromium
npm test
```

Use `npm run test:unit`, `npm run test:browser`, `npm run test:audio`, `npm run test:ranch-native`, or `npm run test:build` for narrower checks. The packaging test verifies bundled UI, repeatable staged contents and exclusion of injected credentials/history. Native Ranch tests cover terminal argument quoting and setup color choices. Build validates widgets and checks native compilation. Live diagnostic tools under `tools/check-*.cjs` may require running companions or installed runtimes and are separate from the default suite.

Manually verify iCUE import, touch/settings persistence, Audio Deck playback/mixer control, and Bot Ranch login, terminal launch, resume, close, focus and actual OMP heartbeat on your computer. Browser or mocked tests cannot certify these interactions. See [testing and troubleshooting](testing-and-troubleshooting.md).

## Repository and release hygiene

Commit source, tools, tests, docs, root configuration and dependency lock files. Generated `artifacts`, dependencies, test outputs, credentials and conversation histories are ignored. Before first push, inspect `git status --short` and `git diff --cached`; ignore patterns do not remove files already tracked in another repository. Add new runtime files to the explicit release inputs in `tools/build.cjs` and rerun packaging tests and the relevant build.

The repository includes the NAudio notice and publishes .NET runtime notices with Audio Deck. External documentation references are listed in [sources](../reference/sources.md). Existing design plans record historical intent; source and this guide define the current build path.

## Large ranch + Medium desk

Import Bot Ranch 0.6.0 and Ranch Desk 0.1.0, choose Large for the ranch and Medium for the desk, and pair both with the same companion key. The 0.6.0 companion synchronizes resident selection; selecting does not open a terminal. The desk has an explicit Open terminal button. Older companions support local Desk selection but must be upgraded for shared selection. Extract the entire updated companion ZIP; close the previous companion process before opening the new setup launcher. User OMP terminals can remain open through a companion upgrade.
