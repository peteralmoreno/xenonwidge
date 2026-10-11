# Companion Board and Bot Library implementation plan

Goal: make the companion the authoring/control station, with widget tasks confined to the Desk; persist reusable bots and role instructions in a configurable home folder.

Spec: `specs/bot-ranch-master.md`, as amended by the user's 2026-10-10 instructions in this conversation.

## Product contract

- Companion: dedicated Board page for task creation/editing, assignment and drag/drop, review, pickup, rest and clean actions. Setup remains profile/home/role configuration.
- Widget: ranch always visible; Tasks switches only the right-hand panel. No task creation/editor in the widget.
- Context: Per task isolates different tasks; Per session carries conversation across tasks until cleanup. User confirmed: changing project starts fresh. Role/instruction changes also start fresh.
- Home: configurable local root holding reusable bot profiles (including color/settings), role definitions and Markdown loading instructions. Existing credentials/process bindings stay private in companion state.
- Role/personality: one choice owns instructions and model preference. Optional Markdown instructions path; no independent preferred-model selector on a bot.
- Retired bots may be deleted only after verified closure and with no unresolved attempt. Deleting a profile preserves history and task evidence.
- Expand named palette from 12 to 16 colors, retaining existing indices.
- Home is the base project: default launch location and the durable task/handoff location. Every launch receives home instructions even when its execution folder is elsewhere.
- The Board is a dedicated desktop page: softly glowing neon sticky notes on a black background.

## Work and verification

- [x] Define and test portable home/role storage, role instructions and safe profile deletion.
- [x] Add explicit per-task/per-session history selection and safe clean behavior with tests.
- [x] Add authenticated companion Board endpoints and page, with task/bot drag and button equivalents.
- [x] Add Setup home/roles/instruction paths, deletion and colors; migrate existing defaults safely.
- [x] Confine widget Tasks to the Desk, remove authoring, retain assignment/start/review.
- [x] Verify backend and browser flows, package matching widget/companion, document limits.

## Constraints and rulings

- No live user terminal interruption, deployment, or paid provider calls during development.
- Instructions are text, never shell code. Missing/unreadable files block launch rather than silently omitting the role.
- Model credentials never enter the portable library.
- Home relocation copies profiles without deleting old data. Existing session paths remain valid.
- Clean may require verified closure/restart; it must not silently interrupt work. Running/unresolved attempts block it.
- Runtime capabilities and physical device behavior must be reported separately from synthetic tests.


Verification: 68 unit tests passed; 13 Ranch/companion Playwright tests passed; setup palette and native argument checks passed. Matching 0.8.0 widget and companion packaged. Screenshots: `artifacts/bot-ranch/companion-board-preview.png` and `ranch-tasks-desk.png`. Tests use temporary state and injected runtimes; no live terminals, paid provider calls or iCUE installation were changed.
