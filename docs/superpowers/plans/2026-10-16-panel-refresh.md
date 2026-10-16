# Desktop panel refresh

User request: brighten the vertical taskbar with a red highlight, remove duplicate robot navigation, let the expanded panel stretch for readable tasks, and improve PM/Pipeline sprites.

Design decisions: retain the established pixel ranch and compact desktop rail. Use slate charcoal (#303039), pale text (#f4f4f5), muted text (#b9b9c5), and coral red (#ef5359) for the rail edge and active navigation. Red is an identity/selection accent, not a connection alarm. Keep connection green/amber with its existing recovery label. Replace the redundant robot brand button with a panel expand/collapse icon; Board, Bots, Factory and Updates keep distinct icons and names. Preserve Segoe UI and increase task copy to 14px with readable line spacing.

The expanded window gains a visible outer-corner resize handle, pointer and arrow-key support, saved width/short-mode height, screen bounds clamping, and unchanged compact rail dimensions. Long mode stays full-height. PM becomes a tidy coordinator with a headset and clipboard; Pipeline becomes a rounded tank with a clear valve, gauge and routed connections. Both stay legible at small pixel sizes and use the chosen bot color.

- [x] Implement and test persisted resize geometry, IPC validation and native window changes.
- [x] Update rail styling/navigation and verify keyboard/pointer resize in the rendered UI.
- [x] Redraw PM/Pipeline SVG details and inspect working/idle examples.
- [x] Run combined regression checks and capture previews from the actual source.

Verified in the full suite and packaged hidden Electron smoke. Actual source previews: `artifacts/omp-bot/desktop-panel-wide.png` and `artifacts/omp-bot/design-refresh.png`.
