# Bot Ranch 0.6.0

An overhead pixel ranch for up to four named Oh My Pi terminals, with twelve resident colors. Medium and Large layouts support landscape and portrait.

## Start

1. Build with npm ci, then npm run build:ranch from the repository root. See ../../docs/guides/build-and-import.md for prerequisites and all-project builds.
2. In the generated companion folder, double-click Open Bot Ranch Setup.cmd. This starts/reuses the central local companion and opens authenticated setup.
3. Add residents: nickname, existing project folder and color. Check setup, then Launch / Resume. New session starts a fresh conversation while preserving earlier history. Close requests normal closure and may require confirmation.
4. Import the generated bot-ranch-0.6.0.icuewidget in iCUE. Choose Medium or Large. Use Show key / Copy in setup to pair. Allow 127.0.0.1:43822 under Settings > Software Settings > Widget Access.

## Use

- One tap selects the resident on Ranch Desk without a popup. Two quick taps bring its terminal forward. Ranch Desk also has an explicit Open terminal button.
- Idle connected bots roam the entire ranch, then sleep after the configured delay. Reading, research and writing use distinct stations; running commands use the workshop. Questions and errors gather near the attention bell. Disconnected bots return to corner charging docks.
- Question/error/completion alerts are larger. Bot colors and positions are independent: changing color keeps its resident slot.
- Terminal windows use Bot Ranch - nickname, a matching dark background tint, and a colored cursor. Windows controls the native title-bar color. Name/color edits apply next launch.
- Model-login checks are hidden. Use /login and /model inside OMP if needed.

## Upgrade

Existing settings, pairing credentials, folders and history are kept in %LOCALAPPDATA%/OmpBot. Old terminals can continue reporting status. To load current folder, model and context metadata, finish current work, close the resident and Launch / Resume from the updated companion. A widget-only update cannot update an already-running OMP extension.

## Conversation previews

The extension sends up to 400 characters of the latest visible user or assistant message through the authenticated local companion. The snippet is held in memory, displayed as plain text, and cleared on an empty new session or disconnect. Hidden reasoning and tool output are excluded. Snippets are not saved in ranch.json. Anyone who can see the display can read the desk excerpt.

## Requirements

Windows, Node 20+, Git for Windows/Git Bash, and a compatible Oh My Pi installation (tested with OMP 18.8.6 / Bun 1.4.2). OMP and provider authentication are runtime requirements, not prerequisites for building the widget. Native window focus may be refused by Windows; the UI reports that result. The companion never force-kills user terminals.

## Cozy ranch and supporting desk

Use Large for the ranch and the remaining Medium slot for [Ranch Desk](../ranch-desk/README.md). Pair both with the same key. Tapping a resident shares selection with the desk through companion 0.6.0. Quiet mode slows roaming and stops decorative animation without hiding alerts; Pause and reduced-motion still provide static poses. Names include small activity labels and finished work gets a short celebration. npm run build:ranch builds both widgets and the companion.

## Appearance and roaming

Use **Look** on either widget for Moss, Sunset or Moonlight colors and Meadow or Courtyard scenery. Preferences persist separately in each widget; choose matching options on both. Courtyard rearranges the work stations. Ranch labels are two pixels larger.

Color gives each bot a stable walking pace, independent of screen size. All residents still roam the entire field. Quiet mode reduces speed further. Maximum idle destination changes per minute are shown below; bots finish their current walk before choosing another destination, so long walks reduce the actual rate.

| Color | Pixels/second | Max destination changes/minute |
| --- | ---: | ---: |
| Coral | 32 | 6 |
| Cyan | 28 | 5 |
| Gold | 30 | 4 |
| Violet | 24 | 4 |
| Rose | 27 | 5 |
| Orange | 36 | 7 |
| Lime | 34 | 6 |
| Emerald | 25 | 4 |
| Blue | 29 | 5 |
| Indigo | 23 | 3 |
| Silver | 26 | 4 |
| Red | 35 | 6 |
