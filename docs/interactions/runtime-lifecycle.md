# Runtime lifecycle and state

Checked: 2026-10-08.

## Host initialization

iCUE injects host globals and provider objects. Register `icueEvents.onICUEInitialized` and `icueEvents.onDataUpdated`; also handle an already-true `iCUE_initialized` flag. Each provider has its own initialization callback/flag. See the [runtime specification](https://docs.elgato.com/icue/widgets/specification/).

Project recommendations:

1. Render a useful initial state before live data arrives.
2. Make initialization idempotent so the callback and ready-flag path cannot register duplicate handlers.
3. Attach provider response handlers before requesting data.
4. Give pending requests timeouts and ignore obsolete responses.
5. Keep rendering separate from data retrieval and user actions.
6. Clean up owned timers/listeners when appropriate; do not invent undocumented iCUE shutdown events.

A normal browser lacks the injected host. Guard absent globals and keep mock data visibly distinguishable from device readings.

## Runtime context

The [iCUE global object](https://docs.elgato.com/icue/widgets/references/icue-global-object/) exposes `isPreview`, `fpsLimit`, `iCUELanguage`, and `defaultTemperatureUnit()`. Its documented default frame limit is 30; panel refresh rate alone does not determine widget rendering speed. Project recommendation: use the reported limit to budget animation work.

The [device object](https://docs.elgato.com/icue/widgets/references/device-object/) exposes `device.deviceId` for APIs tied to the hosting hardware. It is not a sensor identifier.

## Persistence

The official [storage guide](https://docs.elgato.com/icue/widgets/references/local-storage/) uses the injected `uniqueId` as the local-storage key for a widget-specific JSON object. This identity is different from the package's manifest ID and the hosting device ID.

Project recommendations: preserve unrelated properties when updating stored state; catch storage and JSON errors; include a state schema version; and provide defaults when data is absent. Test two instances and a restart. Do not store secrets in widget source or browser storage. Prefer iCUE controls for configuration the user should edit in iCUE, and local storage for internal state such as a counter or cached result.
