# Bot Ranch install on a new Windows PC

This guide installs the current Bot Ranch widget and central companion from a fresh Windows PC. The current source manifest is **0.12.0**. Use the widget package and companion ZIP with the same version; do not mix packages from different releases.

For a prebuilt release, start at [Install the release](#install-the-release). To build the packages from this repository, follow the complete guide.

## What is installed

| Component | Required for | Installation location or data |
| --- | --- | --- |
| iCUE 5.47+ and a XENEON EDGE | Widget import and hardware use | iCUE manages the imported widget |
| Node.js 20+ with npm | Building releases and running the companion | Node installation; companion under `%LOCALAPPDATA%\Programs\botRanch` |
| Git for Windows with Git Bash | Managed Bot Ranch terminals | Git installation; used by the terminal launcher |
| Bun 1.3.14+ | Managed Bot Ranch terminals | Bun installation, normally under the user profile |
| Compatible Oh My Pi (OMP) | Managed Bot Ranch terminals | OMP installation and provider login |

.NET 9 is **not** required for a Bot Ranch-only build. It is required only when building or testing Audio Deck. Bun, Git Bash, OMP, and provider credentials are runtime requirements for managed terminals; they are not required to package the Bot Ranch widget or companion.

## 1. Prepare the new PC

1. Install Windows updates and sign in to the Windows account that will run Bot Ranch.
2. Install iCUE 5.47 or newer, connect the XENEON EDGE, and complete its normal device setup. A charging-only USB connection does not provide touch.
3. Install Node.js 20 or newer with npm.
4. Install Git for Windows and keep Git Bash in the installation. The companion uses Git Bash to launch managed terminals.
5. Install Bun 1.3.14 or newer and a compatible Oh My Pi installation using their normal installation instructions. Sign in to the provider used by OMP in the terminal where Bot Ranch will run.
6. Close and reopen PowerShell and Git Bash after installing tools so their updated PATH values are loaded.

Verify the tools before continuing:

```powershell
node --version       # 20 or newer
npm --version
git --version
bash --version
bun --version        # 1.3.14 or newer; managed terminals only
omp --version        # managed terminals only
```

`omp --version` must work without an error before a bot can launch a managed terminal. Diagnostics in the companion also checks Windows, Node, Bun, OMP, Git Bash, the bundled helper files, script policy, and writable local storage.

## 2. Obtain the project and build Bot Ranch

Obtain a fresh checkout from the project repository, then open PowerShell at the checkout root. Do not run these commands from `sources/omp-bot`.

```powershell
Set-Location 'C:\path\to\xenonwidge'
npm ci
npm run build:ranch
```

`npm run build:ranch` validates and packages the integrated Large Bot Ranch, the legacy Ranch Desk compatibility widget, and the Bot Ranch companion. It does not install services, startup tasks, model credentials, or security settings.

Confirm the matching Bot Ranch outputs exist:

```powershell
$version = '0.12.0'
Test-Path "artifacts\releases\bot-ranch\bot-ranch-$version.icuewidget"
Test-Path "artifacts\releases\bot-ranch\bot-ranch-companion-$version.zip"
```

Both commands must return `True`. The generated files are disposable; rebuild them when the source changes.

## 3. Install the central companion

1. Extract the **entire** matching `bot-ranch-companion-0.12.0.zip` to a writable temporary folder. Do not run the installer from inside the ZIP and do not remove files from the extracted package.
2. Run `Install botRanch.cmd` once.
3. Approve the normal Windows script prompt if one appears. The installer copies the release to `%LOCALAPPDATA%\Programs\botRanch` and creates a **botRanch** Start menu shortcut.
4. Open **botRanch** from the Start menu. The stable launcher starts or reuses the companion and opens the Board.

The companion stores settings, task records, terminal records, and history outside the checkout, normally under `%LOCALAPPDATA%\OmpBot`. Do not copy this folder into a release archive or share its keys.

If the shortcut was not created, run the launcher directly from `%LOCALAPPDATA%\Programs\botRanch\Open botRanch.cmd`. A shortcut failure does not mean the package failed to install.

## 4. Configure the Bot Ranch home and bots

In the Board, open **Settings**:

1. In **Home & folders**, choose a writable Bot home/base project outside `node_modules` and generated release folders. A dedicated folder such as `%USERPROFILE%\botRanch-home` is suitable for a new PC.
2. Save the home. The companion initializes `bots`, `roles`, `tasks`, `sessions`, and `handovers`, and writes a `botRanch.md` guide without deleting existing files.
3. In **Roles**, keep the default role or create one. A role can include model preferences and an optional Markdown/text instructions file.
4. In **Bots**, add a profile. Give it an absolute project folder, role, color, model preference, context policy, and read-only setting. The project folder must exist and be writable when the bot is expected to modify files.
5. In **Connection**, copy the single connection key. Treat it as a local credential; do not put it in source control, screenshots, release archives, or task text.
6. Use **Diagnostics** to confirm all runtime checks are green. A green readiness check does not prove provider access or send a model prompt.

The active ranch supports up to six profiles. Additional saved profiles remain in Bot Bank.

## 5. Import and pair the widget in iCUE

1. In iCUE, open the widget section and import `artifacts\releases\bot-ranch\bot-ranch-0.12.0.icuewidget`.
2. Place the widget in a **Large** slot. The integrated Tasks view is designed for the Large layout; the separate Ranch Desk widget is not required.
3. In iCUE, allow `127.0.0.1:43822` under **Settings > Software Settings > Widget Access**.
4. Open the imported widget's **Connect** dialog and paste the connection key from the companion's **Settings > Connection** page.
5. Confirm the widget reports the companion state and that selecting a bot shows its details. A physical display still needs manual touch and layout verification.

## 6. First managed-terminal check

Only perform this step after OMP is installed and authenticated:

1. In the Board, verify the bot profile's project folder and role.
2. Create a harmless test task with explicit acceptance criteria.
3. Assign the task to the bot. Assignment alone does not start work.
4. Start it explicitly, or release it only if global automatic pickup is enabled.
5. Confirm the terminal opens, the companion acknowledges the attempt, and the task reaches its expected state. Successful completion enters Review unless the task's acceptance policy allows automatic acceptance.

Do not use a paid provider request merely to test installation. The companion's readiness checks validate local prerequisites, not provider acceptance.

## Install the release

If someone supplied the matching widget and companion packages, a repository checkout is not needed for the target PC:

1. Install Node.js 20+ and iCUE 5.47+ as described above. Git Bash, Bun, and OMP are also required if this PC will run managed terminals.
2. Import the matching `.icuewidget` into iCUE and choose Large.
3. Extract the matching companion ZIP and run `Install botRanch.cmd` once.
4. Open **botRanch** from Start, configure the Bot home and profiles, then pair the widget with the Connection key.
5. Run the first managed-terminal check only after `omp --version` and provider login succeed.

## Updating an existing install

1. Finish or stop active work before replacing the companion. Active work blocks replacement.
2. Build or obtain the new matching widget and companion packages.
3. Run the new `Install botRanch.cmd`; the stable launcher remains the same and saved settings remain separate from installed versions.
4. Import the new widget into iCUE and pair it with the existing or newly shown Connection key.
5. Restart existing bot terminals once after an upgrade, then use **Bot queues > Check for work** for the next idle check.

## Troubleshooting

- **`node` is not recognized:** close and reopen the terminal after installing Node.js; verify `node --version`.
- **The installer pauses or exits:** run it from the fully extracted package with Node.js 20+ available on PATH. Keep the installer window open until it reports the install path.
- **The Board opens but a bot cannot start:** use **Settings > Diagnostics**. Check Bun 1.3.14+, `omp --version`, Git Bash, script policy, writable local storage, the absolute project folder, and provider login.
- **The widget cannot connect:** confirm the companion is running, iCUE allows `127.0.0.1:43822`, and the widget uses the current Connection key. Never copy a key from a different PC unless that is intentional.
- **The widget is missing or too small:** re-import the `.icuewidget` and place it in a Large slot. Ranch Desk is a compatibility package, not a prerequisite for integrated Bot Ranch.

For build details, package paths, and verification boundaries, see [Build, install, and verify](build-and-import.md). For runtime behavior, see the [Bot Ranch README](../../sources/omp-bot/README.md) and [central companion README](../../sources/omp-bot-companion/README.md).
