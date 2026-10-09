# Ranch Desk

A Medium companion widget for Bot Ranch. Select one of up to four colored residents to read its current state and latest plain-text conversation excerpt, then use **Open terminal** when needed. Selection syncs through the companion with Bot Ranch; selecting a resident never focuses a window.

Import the built widget into iCUE and enter the same 64-character pairing key used by Bot Ranch. Allow `127.0.0.1` in iCUE Widget Access. The companion also hosts the desk at `/desk/`. The key is saved separately as `ranch-desk.key` in local storage. A hosted `#pair=` transfer is consumed and removed from the address bar.

Designed for 840 × 696, 696 × 840, and 420 × 348. Long excerpts scroll inside the paper. Disconnection hides excerpts and disables terminal focus. Older companions without shared selection keep selection local and display an update hint. This desk has no command entry or execution surface.

## Resident details and appearance

Desk 0.2.0 with companion 0.6.0 shows current folder, provider/model, and estimated context tokens/capacity from the OMP extension. At 40% or higher, a Dumbzone warning appears as a user-requested reminder; it does not measure model quality. No model request is made. Unsupported data is marked unavailable. Offline residents show only their configured folder, not stale model/context usage. Relaunch older resident terminals to load the new extension. Metadata stays in memory.

**Look** offers Moss, Sunset and Moonlight palettes plus Meadow/Courtyard decorative scenery. Each widget remembers its own appearance; select matching options on the ranch and desk. Bot taps select this desk without opening a ranch bubble.
