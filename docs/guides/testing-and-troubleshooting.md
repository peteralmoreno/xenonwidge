# Testing and troubleshooting

Checked: 2026-10-08. The checks below are a proposed project workflow, not a record of completed hardware tests.

## Acceptance checks

| Area | Check | Expected result |
| --- | --- | --- |
| Packaging | Run CLI validation and packaging | Both exit successfully; save the resulting artifact path |
| Layout | Test each intended slot and orientation | Text, units, and controls fit without clipping |
| Input | Tap each action once, then rapidly | One action per intended activation; no duplicate handlers |
| Settings | Change each exposed option | Display updates without restarting the widget |
| Sensors | Change selection; test an unavailable source | Correct units and source; explicit unavailable state |
| Network | Disconnect, reconnect, and return an error | Clear stale/error state and bounded retries |
| Persistence | Restart iCUE and test two instances | Intended state survives; instances do not overwrite each other |
| Lifecycle | Switch pages and reload the widget | No accumulating timers or duplicated requests |
| Performance | Leave running alongside normal workloads | Stable resource usage and responsive touch |

Record observed results and failures rather than marking a row passed by inspection.

## Diagnose by layer

| Symptom | First check |
| --- | --- |
| No video | Windows display detection and the physical video connection |
| Video works, touch fails | USB data connection and touch calibration |
| Package rejected | CLI output, required files, metadata, and supported application version |
| Works in browser, fails in iCUE | Asset paths, host globals, provider readiness, and runtime errors |
| Widget renders but taps do nothing | Manifest interaction setting and DOM event bindings |
| Sensor is blank | Source selection, connectivity, request IDs, and response parsing |
| New package looks unchanged | Imported artifact/version and the selected widget instance |
| Multiple actions per tap | Duplicate startup, subscriptions, or overlapping event handlers |

For verified hardware connection requirements, use the [official quickstart](https://www.corsair.com/uk/en/explorer/gamer/monitors/corsair-xeneon-edge/). For package requirements, use the [specification](https://docs.elgato.com/icue/widgets/specification/).

## Useful issue report

Include exact reproduction steps, expected and actual behavior, environment versions, widget ID/version, slot dimensions, sanitized error output, and whether a built-in widget works. Reduce the failure to the smallest widget that still reproduces it.
