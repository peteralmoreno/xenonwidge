# Project documentation

Research checked: **2026-10-08**. These are concise project notes, with links to official sources rather than copies of vendor documentation. Recommendations and proposed workflows are labeled separately from documented API behavior.

## Reference information

- [Platform and compatibility](reference/platform.md): development routes, versions, and scope.
- [Widget anatomy](reference/widget-anatomy.md): files, metadata, settings, and rendering.
- [Data providers](reference/data-providers.md): sensors, media, links, and device actions.
- [Official sources](reference/sources.md): authoritative documentation and known inconsistencies.

## Practical guides

- [Setup](guides/setup.md): connect the device and prepare development tools.
- [Build and import](guides/build-and-import.md): reproduce all current releases from source, test, package, and install.
- [Bot Ranch build on a new PC](guides/bot-ranch-build.md): install build prerequisites, create the widget and companion packages, and verify their versioned outputs.
- [Bot Ranch on a new PC](guides/bot-ranch-install.md): prerequisites, source build, companion installation, pairing, and first-run checks.
- [Testing and troubleshooting](guides/testing-and-troubleshooting.md): checks and diagnosis.

## Interacting with the widget and iCUE

- [Runtime lifecycle](interactions/runtime-lifecycle.md): initialization, updates, and persistence.
- [Touch and controls](interactions/touch-and-controls.md): touch behavior and settings design.
- [External services](interactions/external-services.md): network data and possible companion applications.

## Before the first widget

Record the exact device model, installed iCUE version, desired information/actions, and preferred widget size. Choose the development route using the platform reference. Hardware behavior and installation steps remain unverified on this computer.

## Doodle Pad

- [Use and install](../sources/doodle-pad/README.md).
- [Design](guides/doodle-pad-design.md) and [implementation record](guides/doodle-pad-plan.md).
- [Build and verify](guides/build-and-import.md), including pending device checks.

## Audio Deck

- [Project](../sources/audio-deck/README.md).
- [Combined player and mixer design](guides/audio-deck-design.md), including API research and integration checks.
- [Windows companion](../sources/audio-deck-companion/README.md).

## Bot Ranch

- [Install on a new PC](guides/bot-ranch-install.md).
- [Install and use](../sources/omp-bot/README.md).
- [Central companion](../sources/omp-bot-companion/README.md).
- [Build current releases](guides/build-and-import.md).
