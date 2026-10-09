# Doodle Pad implementation plan

**Goal:** Deliver the requested medium iCUE drawing widget and its installable package.
**Execution:** Implement in this session, following the user's instruction to make it.
**Spec:** [Doodle Pad design](doodle-pad-design.md).
**Architecture:** Offline HTML canvas with a fixed document, separate stroke overlay, bounded raster history, instance-scoped persistence, and a host adapter for clipboard and PNG export. Build tools stay outside widget sources.
**Stack:** HTML/CSS/JavaScript, Node test runner, Playwright for browser tests, official icuewidget CLI for packaging.

## Constraints and review focus

- Medium 840 x 696; reflow at 696 x 840 and reduced previews.
- Twelve swatches, HSV wheel/sliders, alpha, pen/marker/eraser, three sizes, eyedropper, undo/redo, clear, Windows clipboard images, PNG export.
- No remote dependencies at runtime; preserve drawing on resize and errors.
- Watch for segment alpha buildup, pointer cancellation, redo invalidation, corrupt drafts, and denied host permissions.
- Host clipboard and file behavior must be tested separately from Chromium browser behavior.

## Tasks

- [x] Core model: `sources/doodle-pad/scripts/core.js` provides HSV/RGB conversion, proportional image fit, bounded history, and document coordinate mapping. `tests/core.test.cjs` pins red/gray color conversions, bounds, undo branching, and image fit before implementation. Run `node --test tests/core.test.cjs` red then green.
- [x] Canvas and interface: `index.html`, `styles/widget.css`, `scripts/drawing.js`, `scripts/picker.js`, and `scripts/app.js` implement the paint box. `tests/widget.spec.cjs` verifies real pointer drawing, alpha compositing, erasing, history, picker cancel/apply, eyedropper, resize, and persistence. Run Playwright red then green. White paper and slate-blue controls; Segoe UI for touch labels, rounded rectangular buttons, color swatches as the visual focus.
- [x] Host operations (browser-verified; iCUE verification pending): `scripts/host.js` implements user-triggered clipboard image read/write, paste events, file image import, PNG save and helpful errors. Test PNG pixels/dimensions, clipboard roundtrip, unsupported data, and denied access. Probe actual iCUE after packaging; do not disguise a host limitation as completed export support.
- [x] Delivery (local package; iCUE import pending): `manifest.json`, `resources/icon.svg`, local CLI scripts, and user instructions. Validate and package into `artifacts/doodle-pad/`, inspect package contents, capture screenshots, and run the complete tests. Import through iCUE if UI access permits. Record actual hardware/host results and any remaining limitations.
- [x] Fresh code review and fix important findings with regression tests; deliver the package and concise import instructions.

## Progress and decisions

- 2026-10-08: Source directory is not a Git repository. Work in the requested directories; no branch/worktree or commits apply.
- 2026-10-08: iCUE 5.52.93 is installed and running. Node/npm are present; widget CLI will be a project-local development dependency.
- 2026-10-08: User's "okay make it" authorizes implementation of the accumulated design; proceed without another design approval cycle.

- 2026-10-08: 4 core and 16 browser tests passed. Final package validated and archive integrity checked. Two draft-safety findings and color-picker cancellation fixed with regression tests. Single-point touch strokes fixed after a failing touch test.
- 2026-10-08: Native app automation failed twice with an unavailable pipe. Hardware testing remains pending; no unsupported host capability is claimed. Browser-only capability tests and the package are delivered for import.

