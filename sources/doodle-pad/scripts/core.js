(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.DoodleCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
  function hsvToHex(h, s, v) {
    h = ((h % 360) + 360) % 360; s = clamp(s, 0, 100) / 100; v = clamp(v, 0, 100) / 100;
    const c = v * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = v - c;
    const rgb = h < 60 ? [c,x,0] : h < 120 ? [x,c,0] : h < 180 ? [0,c,x] : h < 240 ? [0,x,c] : h < 300 ? [x,0,c] : [c,0,x];
    return '#' + rgb.map(n => Math.round((n + m) * 255).toString(16).padStart(2, '0')).join('');
  }
  function hexToHsv(hex, previousHue = 0) {
    if (!/^#[0-9a-f]{6}$/i.test(hex)) return null;
    const [r,g,b] = [1,3,5].map(i => parseInt(hex.slice(i, i+2), 16) / 255);
    const max = Math.max(r,g,b), min = Math.min(r,g,b), d = max-min;
    let h = previousHue;
    if (d) h = (60 * (max === r ? ((g-b)/d)%6 : max === g ? (b-r)/d+2 : (r-g)/d+4) + 360) % 360;
    return { h, s: max === 0 ? 0 : d / max * 100, v: max * 100 };
  }
  function fitImage(w, h, dw, dh) {
    const scale = Math.min(dw / w, dh / h);
    return { x: (dw-w*scale)/2, y: (dh-h*scale)/2, width: w*scale, height: h*scale };
  }
  function toDocument(x, y, rect, w, h) {
    return { x: clamp((x-rect.left)/rect.width*w, 0, w-1), y: clamp((y-rect.top)/rect.height*h, 0, h-1) };
  }
  class History {
    constructor(limit = 12) { this.limit = limit; this.items = []; this.index = -1; }
    push(value) { this.items.splice(this.index+1); this.items.push(value); if(this.items.length > this.limit) this.items.shift(); this.index = this.items.length-1; }
    undo() { return this.index > 0 ? this.items[--this.index] : null; }
    redo() { return this.index < this.items.length-1 ? this.items[++this.index] : null; }
    get canUndo() { return this.index > 0; }
    get canRedo() { return this.index < this.items.length-1; }
  }
  return { clamp, hsvToHex, hexToHsv, fitImage, toDocument, History };
});
