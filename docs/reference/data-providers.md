# Data providers

Checked: 2026-10-08. API names are case-sensitive. A manifest dependency and a runtime object have different names.

## Sensors

Dependency: `widgetbuilder.sensorsdataprovider:Sensors:1.0`.
Runtime: `window.plugins.Sensorsdataprovider`.

The provider can enumerate IDs with `getAllSensorIds(requestId)` and retrieve readings, units, names, and connectivity. Methods return results through `asyncResponse(requestId, value)`; correlate each response with its request. `getSensorValue` returns a string, so parse and validate it before calculations. See [Sensors Data Provider](https://docs.elgato.com/icue/widgets/references/plugins/sensors-data-provider/).

Project recommendations: let the user choose a sensor, preserve its units, and represent missing readings as unavailable rather than zero. Track requests centrally and discard responses for a previously selected sensor. Do not interpret a temperature provider as permission or capability to change cooling settings.

## Media

Dependency: `widgetbuilder.mediadataprovider:Media:1.0`.
Runtime: `window.plugins.Mediadataprovider`.

Track information includes song name and artist. Playback methods include `triggerPlayPause()`, `triggerNextTrack()`, and `triggerPreviousTrack()`. The documented Promise wrapper needs local wrapper files bundled with the widget; references into iCUE's installation directory are unsuitable for third-party packages. See [Media Data Provider](https://docs.elgato.com/icue/widgets/references/plugins/media-data-provider/).

Project recommendations: test with the actual player, show an empty state when metadata is absent, and avoid treating an issued command as proof that playback changed.

## External links

Dependency: `widgetbuilder.linkprovider:Url:1.0`.
Runtime: `window.plugins.Linkprovider`.

Use `open(link)` to open the system browser. Ordinary JavaScript navigation can open inside the widget's web view instead. See [Link Provider](https://docs.elgato.com/icue/widgets/references/plugins/link-provider/).

Project recommendation: make external navigation an explicit user action and validate configured URLs before handing them to the provider.

## Hardware actions

Dependency: `widgetbuilder.deviceactionprovider:DeviceAction:1.0`.
Runtime: `window.plugins.Deviceactionprovider`.

The provider receives dial/key actions for the hosting device. Initialize with `initDevice(device.deviceId)` and subscribe to `dialTriggered(actionType, dialIndex)`. These events are emitted on real hardware, not in preview. This does not establish that EDGE has a dial or that this API supplies touchscreen coordinates. See [Device Action Data Provider](https://docs.elgato.com/icue/widgets/references/plugins/device-action-provider/).

For touchscreen interaction, use the [touch guide](../interactions/touch-and-controls.md).
