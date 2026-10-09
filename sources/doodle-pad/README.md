# Doodle Pad

A medium XENEON EDGE drawing widget: 12 colors, custom HSV color wheel and opacity, pen/marker/eraser, three brush sizes, eyedropper, undo/redo, clipboard images, image import, and PNG export.

## Install

1. Use iCUE 5.47 or later with XENEON EDGE.
2. In the iCUE widget list, click the import/add button and select `doodle-pad-1.1.0.icuewidget` from `artifacts/releases/doodle-pad/` in this project.
3. Place Doodle Pad in a **Medium** slot (840 x 696 horizontal, or 696 x 840 vertical).
4. Try a short stroke, Undo, Copy, Paste, and Save PNG on your device.

The package passed the official CLI validator and browser tests. **Import, physical finger input, and clipboard/download permissions inside iCUE have not been verified.** The native app-control connection was unavailable during development. Browser results do not prove that iCUE permits these host operations.

## Draw

- Choose White, Black, or Cream in the Paper row. The choice is saved with your draft and preserves existing marks and drawing history. Older drafts start on white. Choose light ink for black paper. The eyedropper samples the visible color over the paper; erasing reveals it.

- Pick Pen, Marker, or Eraser, then a dot size and color. Drag one finger or the mouse across the page. Tap for a dot.
- Pen starts at 100% opacity; Marker at 40%. Each remembers its opacity. Eraser always erases at full strength.
- Color wheel opens hue, saturation, brightness, opacity, and hex controls. Use color applies the choice; Cancel discards edits. Choosing a color while erasing returns to Pen only when you apply it.
- Pick is the eyedropper. Tap a visible color on the page, including an imported image, to select it. Tap Pick again to cancel. It preserves brush opacity.
- Undo/Redo keep up to 11 changes in this session. Clear asks first and can be undone.
- Draft recovery stores the latest committed page and settings per widget instance. History is not restored after reopening. A browser preview has its own draft. Draft storage is a convenience, not a backup; export images you want to keep.

## Images

Copy writes the whole page as a PNG image to the Windows clipboard. Paste reads an image from it. Ctrl+V is also supported when the page has focus. Open image accepts PNG, JPEG, and WebP, up to 20 MB and 32 megapixels. Imported images fit proportionally, centered, and can be undone.

Save PNG requests a timestamped 1200 x 800 PNG download. Check that the file actually appeared in your downloads: iCUE controls whether the request is accepted. Copy and export include the selected paper background, with transparent brush strokes blended over it, and excludes the toolbar.

Clipboard APIs may be denied by the host. The widget reports this without discarding your drawing. Try Ctrl+V or Open image for paste issues. If iCUE blocks file export too, retain the draft and report the behavior; a host integration or companion will be needed for that environment. The widget does not claim an unconfirmed download was saved.

Keyboard: Ctrl+Z Undo; Ctrl+Shift+Z or Ctrl+Y Redo; Ctrl+S Save PNG.

## Development

From the project root:

```powershell
npm.cmd ci
npx.cmd playwright install chromium
npm.cmd test
npm.cmd run validate
npm.cmd run package
npm.cmd run preview
```

Preview: `http://127.0.0.1:4173`. Stop it with Ctrl+C before running tests (the suite starts its own server on that port). All runtime files are bundled locally; drawing requires no network service.


