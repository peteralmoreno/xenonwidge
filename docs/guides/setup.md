# Development setup

These are prerequisites for a fresh development checkout. Hardware setup remains a manual step.

## Connect and identify the display

1. Confirm the model is XENEON EDGE.
2. Follow Corsair's cabling instructions for USB-C video or separate video plus USB data/power. A charging-only USB connection cannot provide touch.
3. Confirm Windows detects the display.
4. Open iCUE and complete the EDGE setup/calibration flow described in the [hardware quickstart](https://www.corsair.com/uk/en/explorer/gamer/monitors/corsair-xeneon-edge/).
5. Try an existing widget before debugging custom code.

## Prepare tools

Use iCUE 5.47 or newer for the documented framework. Install Node.js 20+ with npm and the .NET 9 SDK for Audio Deck, then install the locked local dependencies from this repository's root.

In PowerShell:

```powershell
node --version
npm --version
npm ci
npx --no-install icuewidget --version
dotnet --version
```

No global widget CLI is required. `npm ci` replaces local `node_modules` from the committed lock file. Bun/OMP and Git Bash are required only to run Bot Ranch's managed terminals, not to build its releases. See the build guide for installation and verification commands.

## Record the test environment

Keep these details with each widget's test notes:

- Device model and firmware version.
- Windows and iCUE versions.
- Node.js and widget CLI versions.
- Cable arrangement, orientation, Windows scaling, and widget layout/slot.
- Whether a result came from a browser, iCUE preview, or the physical screen.

Continue with [build and import](build-and-import.md).
