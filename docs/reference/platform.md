# Platform and compatibility

Checked: 2026-10-08.

## Development routes

| Route | Appropriate use | Boundary |
| --- | --- | --- |
| Packaged iCUE widget | A custom display with iCUE settings and documented data providers | Runs inside the widget framework; delivered as an `.icuewidget` file |
| Web URL / iFrame widget | Displaying an existing web dashboard or embedded content | Treat this as web content; do not assume packaged-widget APIs are injected |
| Separate desktop application using the RGB SDK | A future feature that controls supported device lighting | Requires its own SDK integration; not the display-widget framework |

The official [widget introduction](https://www.corsair.com/us/en/explorer/diy-builder/accessories/xeneon-edge-widgets-explained/) describes packaged and web-content widgets. The [RGB SDK](https://corsairofficial.github.io/cue-sdk/) targets lighting control through a running iCUE installation. It does not establish a general fan-control or LCD-upload API.

Project recommendation: start with a packaged widget when native sensor access or configurable iCUE settings are required. Use an embed when the useful content already exists as a website.

## Version baseline

The current [Getting Started guide](https://docs.elgato.com/icue/widgets/) targets iCUE 5.47 or later. Older Corsair guidance and the [builder repository](https://github.com/Corsair-Labs/icue-widget-builder) still mention 5.44. Use the current technical documentation as the project baseline and record the exact installed version during testing. This is a minimum baseline, not a claim about the latest available release.

## Hardware scope

XENEON EDGE has a 2560 x 720 panel at 60 Hz. Corsair's current quickstart lists Windows 11. USB-C supplies power and data; single-cable video additionally requires a compatible DP Alt Mode connection. An HDMI video connection still needs USB for power and touch data. See the [hardware quickstart](https://www.corsair.com/uk/en/explorer/gamer/monitors/corsair-xeneon-edge/).

Do not equate the full panel resolution with a widget's usable viewport. Corsair's [custom-widget guide](https://www.corsair.com/us/cs/explorer/diy-builder/accessories/how-to-create-a-custom-widget-for-the-xeneon-edge/) gives horizontal slot examples of 840 x 344 (Small) and 2536 x 696 (Extra Large). Measure the actual viewport for every layout we support.

The broader XENEON monitor family and iCUE NEXUS are different targets. These notes do not establish that an EDGE widget will run on either.
