# Doodle Pad design

Date: 2026-10-08. Status: implementation authorized by the user's "okay make it". Version 1.0.0 is built and browser-tested; actual iCUE import, touch, clipboard, and download verification remain pending. See [build results](../../artifacts/doodle-pad/BUILD.md).

## Intended result

A medium XENEON EDGE widget for casual finger drawing, with familiar colors, simple brushes, Windows image copy/paste, and image saving. The user confirmed that copy/paste means exchanging images with the Windows clipboard.

Working assumption: horizontal EDGE orientation. Corsair's [builder reference](https://github.com/Corsair-Labs/icue-widget-builder/blob/main/skills/icue-widget-builder/SKILL.md) lists Medium as 840 x 696 horizontally and 696 x 840 vertically. Design for 840 x 696 first, with responsive reflow at 696 x 840 and reduced iCUE preview sizes.

## Approaches

1. **Packaged canvas widget, with capability tests first — recommended.** Minimal installation, direct iCUE integration, and an offline drawing engine. Check clipboard and PNG export in the real host before investing in polish.
2. **Widget plus a local Windows companion.** Can supply explicit clipboard and file operations if the embedded host blocks them, but adds another process, installation, authentication, and communication behavior to support. Its connection to iCUE must also be tested.
3. **Web dashboard embedded in iCUE.** Useful for browser development, but embedding does not itself solve host clipboard or download restrictions. Not the recommended delivery route.

Begin with approach 1. If required clipboard or save behavior fails inside iCUE, report that evidence and resolve the companion requirement before calling the widget complete. Disabled export controls are not an acceptable substitute for the requested features.

## Interface

- Large white drawing surface with a compact dark toolbar and no decorative animation.
- Twelve visible swatches: black, gray, white, brown, red, orange, yellow, green, cyan, blue, purple, pink. Selected color has an outline and accessible label.
- A Custom Color button opens a touch-friendly picker over the drawing area: hue wheel, saturation and brightness controls, and an opacity slider from 0% (transparent) to 100% (opaque). Show a live color preview over a checkerboard, numeric percentages, and a hex color field. Done applies the selection; Cancel restores the previous color and opacity. Drawing is suspended while the picker is open.
- Selecting a preset swatch changes color while preserving the chosen opacity. Keep the current custom color available as a separate swatch and restore it with the draft.
- Eyedropper (pipette): tap its button, then tap the canvas to sample the visible color from strokes or pasted images, composited over the white page. Sampling makes no drawing mark, updates the current custom color, preserves the active drawing tool's opacity, and returns to the previous drawing tool. Tapping the eyedropper button again cancels sampling. Show a clear active-state indicator.
- Pen: rounded strokes at the selected opacity, initially 100%. Marker: wider strokes at the selected opacity, initially 40%. Remember opacity per drawing tool; the picker edits the active tool's opacity. Eraser removes drawing pixels at full strength and reveals the white page, independently of color opacity.
- Three stroke sizes per tool, presented as tap targets with sample dots.
- Undo and redo; clear with confirmation. Clear is also undoable.
- Copy, Paste, and Save PNG as clearly labeled actions. Toolbar reflows instead of shrinking controls below a usable touch size.
- Brief status feedback for successful copy, unavailable clipboard data, export errors, and draft persistence failures.

Pasted images are fitted proportionally and centered on the page as one undoable operation. Existing content remains underneath; subsequent strokes can be drawn over the image. Selection tools, layers, moving/resizing pasted images, text, and advanced effects are outside the first version.

Copy and export produce the whole drawing with a white background, excluding the toolbar. Save uses a timestamped PNG filename. Automatic draft recovery is separate from saving a PNG file.

## Implementation structure

Create a self-contained widget under `sources/doodle-pad/`: manifest, HTML, local styles/scripts, icon, and user instructions. Place generated `.icuewidget` packages under `artifacts/doodle-pad/`. Keep the canvas engine, history/persistence, and host clipboard/export operations separate. No remote assets or service dependencies for drawing.

Use pointer input for touch and mouse. Capture the active pointer for continuous strokes, handle cancellation, and ignore additional simultaneous pointers. Prevent browser panning on the drawing surface. Convert input coordinates to stable document coordinates; resizing the display must preserve the drawing.

Maintain a bounded undo history and persist the current draft after completed edits, with debouncing. Use a widget-instance-specific storage key. Handle quota/corrupt-storage errors without destroying the active drawing. A new edit after undo clears the redo branch. Preserve transparency internally; flatten onto white only for copy/export.

Represent custom colors as hue, saturation, brightness, and alpha. Preserve hue when saturation or brightness reaches zero so restoring either control is predictable. Preview picker changes without changing existing artwork. Composite each pen/marker stroke at its chosen opacity once, avoiding dark dots from overlapping segments within one stroke; separate strokes may build up color. Persist the custom color and tool opacity settings with the draft.

## Clipboard and save uncertainty

The [Clipboard API](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard_API) is gated by browser security and user interaction. Qt's [clipboard settings](https://doc.qt.io/qt-6.9/qwebenginesettings.html) are controlled by the embedding application. Qt's [download handling](https://doc.qt.io/qt-6.9/qwebenginedownloadrequest.html) also requires host participation. These references do not prove how iCUE configures those features.

Probe PNG clipboard writing, image reading/paste events, and file export inside iCUE. Trigger operations only from explicit user actions. Handle unsupported formats and permission rejection without losing the drawing. Do not claim that a file was saved merely because a download was requested.

## Acceptance tests

1. CLI validation and packaging succeed, followed by import into iCUE.
2. Finger strokes, dots, pen, marker, eraser, and each size/color work on the physical screen.
3. Undo/redo cover strokes, paste, and clear; cancellation never leaves a stuck drawing state.
4. Resizing and page switching preserve the document without unexpected distortion.
5. Two instances keep independent drafts; restarting iCUE restores the last persisted draft.
6. Copy produces an image that pastes into a Windows image editor.
7. Copy an image in Windows and paste it into the pad, preserving its aspect ratio.
8. Save produces a valid PNG on disk matching the drawing; inspect the exported file.
9. Unsupported clipboard data, denied permissions, and storage failure show useful feedback without data loss.
10. UI remains usable at medium horizontal and vertical sizes and in a reduced preview.
11. The hue wheel, saturation, brightness, opacity, and hex field remain synchronized. Check grayscale, black, white, and opacity endpoints; Cancel changes neither the selected settings nor the artwork.
12. Partially transparent strokes composite correctly, including over pasted images; a single continuous stroke has no segment-overlap darkening. Presets preserve opacity, the eraser remains effective at 0% drawing opacity, and custom settings survive draft recovery.
13. Eyedropper sampling matches the visible canvas color on strokes, pasted images, and blank white areas, including after resizing. Sampling adds no stroke or history entry, preserves drawing opacity, and restores the previous tool; cancellation leaves the selected color unchanged.

Automate deterministic history, coordinate conversion, image-fit, and browser input/export checks where feasible. Keep browser results distinct from iCUE/hardware results. Ship the package with installation steps and the actual validation results.
