(function () {
  'use strict';
  const { History, fitImage, toDocument } = DoodleCore;
  class Drawing {
    constructor(canvas, overlay, onChange) {
      this.canvas = canvas; this.overlay = overlay; this.ctx = canvas.getContext('2d', { willReadFrequently:true });
      this.ink = overlay.getContext('2d'); this.history = new History(12); this.onChange = onChange;
      this.width = canvas.width; this.height = canvas.height; this.active = null;
      this.paperColor = '#ffffff';
      this.history.push(this.ctx.getImageData(0,0,this.width,this.height));
    }
    position(e) { return toDocument(e.clientX,e.clientY,this.canvas.getBoundingClientRect(),this.width,this.height); }
    begin(point, settings) {
      this.active = { points:[point], ...settings };
      this.paintStroke();
    }
    move(point) {
      if (!this.active) return;
      const last = this.active.points[this.active.points.length-1];
      if (last.x === point.x && last.y === point.y) return;
      this.active.points.push(point); this.paintStroke();
    }
    paintStroke() {
      const a = this.active, c = this.ink;
      c.clearRect(0,0,this.width,this.height);
      c.lineCap = 'round'; c.lineJoin = 'round'; c.lineWidth = a.size; c.strokeStyle = a.color; c.fillStyle = a.color;
      c.beginPath();
      if (a.points.length === 1) { c.arc(a.points[0].x,a.points[0].y,a.size/2,0,Math.PI*2); c.fill(); }
      else { c.moveTo(a.points[0].x,a.points[0].y); for (const p of a.points.slice(1)) c.lineTo(p.x,p.y); c.stroke(); }
      if (a.tool === 'eraser') {
        this.ctx.putImageData(this.history.items[this.history.index],0,0);
        this.ctx.save(); this.ctx.globalCompositeOperation = 'destination-out'; this.ctx.drawImage(this.overlay,0,0); this.ctx.restore();
        this.overlay.style.opacity = '0';
      } else { this.overlay.style.opacity = String(a.opacity); }
    }
    finish() {
      if (!this.active) return;
      const a = this.active;
      if (a.tool !== 'eraser') { this.ctx.save(); this.ctx.globalAlpha = a.opacity; this.ctx.drawImage(this.overlay,0,0); this.ctx.restore(); }
      this.ink.clearRect(0,0,this.width,this.height); this.active = null; this.commit();
    }
    cancel() {
      if (!this.active) return;
      this.ctx.putImageData(this.history.items[this.history.index],0,0);
      this.ink.clearRect(0,0,this.width,this.height); this.active = null;
    }
    commit() { this.history.push(this.ctx.getImageData(0,0,this.width,this.height)); this.onChange(); }
    undo() { this.cancel(); const state = this.history.undo(); if (state) { this.ctx.putImageData(state,0,0); this.onChange(); } }
    redo() { this.cancel(); const state = this.history.redo(); if (state) { this.ctx.putImageData(state,0,0); this.onChange(); } }
    clear() { this.cancel(); this.ctx.clearRect(0,0,this.width,this.height); this.commit(); }
    addImage(image) { this.cancel(); const f = fitImage(image.width,image.height,this.width,this.height); this.ctx.drawImage(image,f.x,f.y,f.width,f.height); this.commit(); }
    restore(image) { this.ctx.clearRect(0,0,this.width,this.height); this.ctx.drawImage(image,0,0,this.width,this.height); this.history = new History(12); this.history.push(this.ctx.getImageData(0,0,this.width,this.height)); }
    sample(point) {
      const [r,g,b,a] = this.ctx.getImageData(Math.floor(point.x),Math.floor(point.y),1,1).data;
      const background=[1,3,5].map(i=>parseInt(this.paperColor.slice(i,i+2),16));
      return '#' + [r,g,b].map((n,i) => Math.round(n*a/255 + background[i]*(1-a/255)).toString(16).padStart(2,'0')).join('');
    }
    exportCanvas() { const c = document.createElement('canvas'); c.width = this.width; c.height = this.height; const x = c.getContext('2d'); x.fillStyle=this.paperColor; x.fillRect(0,0,c.width,c.height); x.drawImage(this.canvas,0,0); return c; }
    draftPNG() { const c=document.createElement('canvas'); c.width=this.width; c.height=this.height; c.getContext('2d').putImageData(this.history.items[this.history.index],0,0); return c.toDataURL('image/png'); }
    isEmpty() { const d = this.ctx.getImageData(0,0,this.width,this.height).data; for(let i=3;i<d.length;i+=4) if(d[i]) return false; return true; }
  }
  window.DoodleDrawing = Drawing;
})();
