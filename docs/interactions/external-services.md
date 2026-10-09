# External services and desktop interaction

Checked: 2026-10-08. This page proposes architecture and validation steps; no external service or local companion has been implemented.

## Choose the smallest integration

| Need | Starting approach |
| --- | --- |
| Sensor readings available in iCUE | Sensors provider |
| Media playback actions | Media provider |
| Open a web page in the system browser | Link provider |
| Display an existing dashboard | Evaluate Web URL / iFrame |
| Weather or another remote data feed | Evaluate the service's API and authentication requirements |
| A desktop action absent from documented providers | Investigate a narrowly scoped companion application |

The first three routes are documented in [data providers](../reference/data-providers.md). Corsair describes built-in web embedding in its [widget guide](https://www.corsair.com/uk/en/explorer/gamer/monitors/things-you-can-do-in-icue-with-the-xeneon-edge/).

## Remote data workflow

Before implementation, identify the actual service and verify its current documentation: allowed origins, authentication, rate limits, response schema, and caching rules. Browser-preview success alone is insufficient; test requests inside iCUE too.

Project recommendations: apply a request timeout, prevent overlapping refreshes, retry with backoff, and display when data was last updated. Keep the last valid result visibly marked stale during an outage. Render remote text as text rather than injecting it as HTML.

## If a companion application is needed

A widget page is not assumed to have arbitrary process-launch, filesystem, or shell access. First prove a specific documented integration exists for the desired action.

If we later build a local helper, expose named actions with validated arguments rather than an arbitrary command endpoint. Bind local-only services to loopback, authenticate requests, and restrict accepted origins. These are design recommendations, not evidence that a particular loopback transport is supported by iCUE. Test connectivity and host restrictions before adopting the design.

Keep API credentials outside distributable widget files. Document how the user starts/stops the companion and how the widget behaves when it is unavailable.
