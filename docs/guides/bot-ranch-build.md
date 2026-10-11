# Build Bot Ranch on a new Windows PC

This guide builds the current Bot Ranch widget and its central companion from a fresh checkout. It is for the **build** step; use the [Bot Ranch install guide](bot-ranch-install.md) to install the generated packages, configure the companion, and pair the widget with iCUE.

## What the build needs

The build runs on Windows because the release tooling uses PowerShell. Install:

- Windows 10 or 11 with PowerShell.
- Node.js 20 or newer, including npm.
- Git for Windows, if the source is being cloned on this PC.

A Bot Ranch-only build does **not** require .NET, Bun, Git Bash, Oh My Pi, provider credentials, iCUE, or a XENEON display. Those are needed later for other projects or runtime use. The build does not log in, install services, register startup tasks, or change security settings.

Check the build prerequisites in a new PowerShell window:

```powershell
node --version       # 20 or newer
npm --version
git --version
```

## Get the source

Clone the repository, or copy an existing checkout to the new PC. Then run PowerShell from the repository root; do not run the build from `sources/omp-bot`.

```powershell
git clone <repository-url> C:\source\xenonwidge
Set-Location C:\source\xenonwidge
```

If the repository was copied instead of cloned, only the `Set-Location` command is needed.

## Install exact dependencies and build

`npm ci` uses the committed `package-lock.json`, including the local iCUE widget packaging CLI. `npm run build:ranch` validates and packages the integrated Bot Ranch widget, the legacy Ranch Desk compatibility widget, and the Bot Ranch companion ZIP.

```powershell
Set-Location C:\source\xenonwidge
npm ci
npm run build:ranch
```

The build stages an explicit list of source files in a temporary directory, validates the widget, creates the companion archive, copies the release files to `artifacts\releases`, and removes its temporary staging directory.

## Confirm the generated packages

The release version comes from `sources\omp-bot\manifest.json`. Read it and verify the matching Bot Ranch files:

```powershell
$version = (Get-Content 'sources\omp-bot\manifest.json' -Raw | ConvertFrom-Json).version
$widget = "artifacts\releases\bot-ranch\bot-ranch-$version.icuewidget"
$companion = "artifacts\releases\bot-ranch\bot-ranch-companion-$version.zip"

$version
Test-Path $widget
Test-Path $companion
```

Both `Test-Path` commands must return `True`. The build also creates the compatibility widget here:

```text
artifacts\releases\ranch-desk\ranch-desk-<version>.icuewidget
```

Generated releases are disposable. Re-run `npm run build:ranch` after source changes; do not commit release output, `node_modules`, or local runtime data.

## Hand the build to a new PC user

Provide the matching files from `artifacts\releases\bot-ranch`:

- `bot-ranch-<version>.icuewidget`
- `bot-ranch-companion-<version>.zip`

Keep the widget and companion versions identical. The recipient can install them without the source checkout by following [Bot Ranch install on a new Windows PC](bot-ranch-install.md). That guide covers extracting the companion, running `Install botRanch.cmd`, configuring `%LOCALAPPDATA%\OmpBot`, importing the widget into iCUE, and pairing the connection key.

Do not copy or distribute `%LOCALAPPDATA%\OmpBot` as part of a release. It can contain connection keys, profiles, task records, terminal records, and conversation history.

## Optional build checks

Run the focused packaging test after changing release inputs or build logic:

```powershell
npm run test:build
```

For the full repository verification, install Playwright's browser once and run the full suite:

```powershell
npx playwright install chromium
npm test
```

These checks do not replace manual verification of iCUE import, physical display layout, touch behavior, OMP authentication, or live provider access.

## Troubleshooting

- **`node` or `npm` is not recognized:** close and reopen PowerShell after installing Node.js, then rerun the version checks.
- **Build fails outside Windows:** use Windows PowerShell; `tools/build.cjs` rejects non-Windows release builds.
- **`npm ci` fails:** confirm the checkout contains `package-lock.json` and that the PC can reach npm during the first install.
- **Expected package is missing:** read the version from `sources\omp-bot\manifest.json`; do not assume an old release number. Re-run `npm run build:ranch` from the repository root.
- **Companion does not run on the target PC:** this is a runtime installation issue, not a widget build issue. Install Node.js 20+ and follow the companion diagnostics in the install guide; managed terminals additionally require Git Bash, Bun, OMP, and provider authentication.
