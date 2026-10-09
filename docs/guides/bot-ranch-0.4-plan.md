# Bot Ranch 0.4 implementation plan

User-requested scope: expand bot colors, increase alerts, name/color terminal windows, hide the model-login reminder, show conversation peeks on one tap and focus on double tap, dock disconnected bots, and make the workspace ready for source-based builds.

## Design

- Keep four residents; separate resident slot identity from the choice of twelve colors. Preserve existing saved profiles and stable slots.
- Single activation shows a bounded, plain-text user/assistant conversation excerpt in a dismissible bubble. A second activation within 450 ms focuses the same terminal. Keyboard users also have an explicit Open terminal action.
- Snippets travel only through authenticated local snapshots/state and are held in memory. No thinking content, tool output or transcript persistence. Older extensions show status and a restart hint.
- Offline robots move to corner charging docks. Idle roaming and personal work destinations remain supported. Alerts grow without shrinking touch targets.
- Terminal launch retains verified PID binding and --nodaemon, adds a safe nickname title and matching visual color cue. Model-login reminder is hidden.
- Build all widget/companion artifacts from source with documented prerequisites and commands. Ignore generated files and private runtime data; do not delete previous releases or publish a repository.

## Implementation and verification

1. Backend: inspect installed OMP extension events, add bounded preview extraction and HTTP tests.
2. Terminal/setup: twelve color choices, safe terminal styling/title, remove login reminder; validate launch arguments.
3. Widget/manager: stable slot migration, preview bubble, double activation, alert scale and corner docks; update unit/browser regressions.
4. Repository: source-driven build scripts, dependency lock usage, ignore rules, portable README/build instructions.
5. Run unit/browser/.NET checks and artifact builds. Inspect screenshot and packaged content. Upgrade the central companion without closing user OMP terminals; document that existing terminals must reopen to load new extension/title behavior.
