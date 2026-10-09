# Widget anatomy

Checked: 2026-10-08. Source: [official widget specification](https://docs.elgato.com/icue/widgets/specification/).

## Package essentials

Include `index.html`, `manifest.json`, and an icon. Separate scripts, styles, and resources as needed. Manifest paths are relative to the manifest. The specification currently identifies Widget API 1.4.0, QtWebEngine 6.9.3, and Chromium 130.0.6723.192.

Required manifest fields listed by the current schema are:

`author`, `id`, `name`, `description`, `version`, `preview_icon`, `min_framework_version`, `min_app_version`, `os`, and `supported_devices`.

Use `dashboard_lcd` for EDGE and `windows` for the OS platform. `min_framework_version` is the widget API requirement; `min_app_version` is the iCUE application requirement. Declare only necessary providers in `required_plugins`. Touch click handling requires `interactive: true`; its default is false.

## Settings

iCUE controls are declared with `x-icue-property` meta tags and exposed as JavaScript globals. Group them using the `x-icue-groups` JSON block. See [control documentation](https://docs.elgato.com/icue/widgets/references/controls/) for individual attributes and value formats.

## Project recommendations

- Start from CLI-generated files, then validate after metadata changes.
- Keep assets inside the widget folder and use portable relative paths.
- Support actual container dimensions with responsive layout.
- Show explicit loading, empty, disconnected, and error states.
- Do not advertise support for untested device types.

The official examples and schema are not perfectly synchronized; see [source caveats](sources.md).
