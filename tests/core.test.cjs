const { test } = require('node:test');
const assert = require('node:assert/strict');
const core = require('../sources/doodle-pad/scripts/core.js');

test('HSV extremes and hex conversion preserve color', () => {
  assert.equal(core.hsvToHex(0, 100, 100), '#ff0000');
  assert.equal(core.hsvToHex(120, 100, 100), '#00ff00');
  assert.equal(core.hsvToHex(240, 100, 100), '#0000ff');
  assert.equal(core.hsvToHex(220, 0, 50), '#808080');
  assert.deepEqual(core.hexToHsv('#808080', 200), { h: 200, s: 0, v: 128 / 255 * 100 });
  assert.equal(core.hexToHsv('nonsense'), null);
});
test('image fit preserves aspect ratio and centers portrait content', () => {
  assert.deepEqual(core.fitImage(100, 200, 1200, 800), { x: 400, y: 0, width: 400, height: 800 });
});
test('coordinates follow rendered canvas bounds after resize', () => {
  assert.deepEqual(core.toDocument(250, 150, { left: 100, top: 50, width: 300, height: 200 }, 1200, 800), { x: 600, y: 400 });
});
test('history bounds memory and discards redo after a new edit', () => {
  const h = new core.History(3);
  h.push('blank'); h.push('a'); h.push('b'); h.push('c');
  assert.equal(h.undo(), 'b');
  assert.equal(h.undo(), 'a');
  assert.equal(h.undo(), null);
  assert.equal(h.redo(), 'b');
  h.push('replacement');
  assert.equal(h.redo(), null);
  assert.equal(h.undo(), 'b');
});
