# Official sources and maintenance

Reviewed: 2026-10-08. Links below are official Corsair/Elgato documentation or repositories. Local notes are summaries and project recommendations, not a vendored SDK.

| Source | Use |
| --- | --- |
| [Getting Started](https://docs.elgato.com/icue/widgets/) | CLI and import workflow |
| [Specification](https://docs.elgato.com/icue/widgets/specification/) | Manifest and runtime contract |
| [Controls](https://docs.elgato.com/icue/widgets/references/controls/) | Settings panel definitions |
| [Global object](https://docs.elgato.com/icue/widgets/references/icue-global-object/) | Preview state, language, frame limit, temperature preference |
| [Device object](https://docs.elgato.com/icue/widgets/references/device-object/) | Hosting-device identity |
| [Local storage](https://docs.elgato.com/icue/widgets/references/local-storage/) | Per-widget persistence |
| [Builder repository](https://github.com/Corsair-Labs/icue-widget-builder) | Official workflow resources and examples |
| [EDGE hardware quickstart](https://www.corsair.com/uk/en/explorer/gamer/monitors/corsair-xeneon-edge/) | Cabling, calibration, and device setup |
| [Built-in widget guide](https://www.corsair.com/uk/en/explorer/gamer/monitors/things-you-can-do-in-icue-with-the-xeneon-edge/) | Existing iCUE widget capabilities |
| [RGB SDK](https://corsairofficial.github.io/cue-sdk/) | Separate lighting integration |

Provider-specific sources are linked in [data providers](data-providers.md).

## Known documentation inconsistencies

- The current technical docs require iCUE 5.47; older introductory material says 5.44. Our baseline follows the technical docs.
- The specification marks `min_app_version` required, but the Getting Started manifest omits it. Include it and use CLI validation to check the installed tool's expectations.
- The specification's property-group example contains invalid JSON punctuation. Treat examples as guidance, then validate the actual JSON.

## Updating these notes

When revisiting an API, check its official page, record the review date, and identify changed behavior. Keep documentation claims separate from results actually observed on hardware. If sources disagree, record the disagreement and the exact iCUE/CLI versions used to resolve it.

External source code has not been copied or installed as part of this documentation work. Review its license before incorporating it into distributed widgets.
