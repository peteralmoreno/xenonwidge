# Touch interaction and settings

Checked: 2026-10-08. Interaction design suggestions below are project recommendations.

## Touch behavior

Enable the manifest's `interactive` flag for a touch-driven widget. See [widget anatomy](../reference/widget-anatomy.md) and the [official specification](https://docs.elgato.com/icue/widgets/specification/).

- Use actual buttons for actions, with readable labels and generous spacing.
- Avoid hover-only information and tiny controls.
- Keep one primary action visually prominent.
- Give immediate pressed/busy feedback without claiming success before the underlying action completes.
- Avoid binding both touch and click handlers to the same action unless duplicate activation is explicitly prevented.
- Test page navigation gestures alongside widget controls on the real screen.
- Treat text entry as a separate hardware test; do not assume browser behavior matches iCUE.

Pick target sizes through physical testing at the intended viewing distance, rather than relying only on a desktop screenshot.

## Settings panel choices

The official [controls catalog](https://docs.elgato.com/icue/widgets/references/controls/) provides types including `color`, `slider`, `switch`, `textfield`, `combobox`, `sensors-combobox`, and `sensors-factory`.

| User choice | Suggested control |
| --- | --- |
| Foreground/background color | `color` |
| A numeric threshold | `slider` |
| Whether to show a secondary value | `switch` |
| Custom caption | `textfield` |
| A fixed display mode | `combobox` |
| A hardware sensor | `sensors-combobox` |

Read each control's specific documentation before implementing its attributes. Choose defaults that produce a useful view, validate values, and keep rarely changed configuration in iCUE rather than crowding the display.

## Action verification

For media actions or links, use the documented [providers](../reference/data-providers.md). Test empty/unavailable states, repeated taps, and recovery after reopening iCUE. Hardware dial events are a separate capability from touchscreen input.
