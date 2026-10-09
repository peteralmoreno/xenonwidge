(function () {
  'use strict';
  const { hsvToHex, hexToHsv } = DoodleCore;
  class Picker {
    constructor(onApply) {
      this.dialog = document.querySelector('#color-dialog'); this.onApply = onApply;
      this.inputs = Object.fromEntries(['hue','saturation','brightness','opacity','hex'].map(n => [n,document.getElementById(n)]));
      for(const [id,key] of [['hue','h'],['saturation','s'],['brightness','v'],['opacity','a']]) this.inputs[id].addEventListener('input', () => { this.value[key] = Number(this.inputs[id].value); this.update(); });
      this.inputs.hex.addEventListener('input', () => { const next = hexToHsv(this.inputs.hex.value,this.value.h); if(next) { Object.assign(this.value,next); this.update(false); } });
      document.getElementById('color-apply').addEventListener('click', () => {
        if (!this.inputs.hex.checkValidity()) { this.inputs.hex.reportValidity(); return; }
        this.onApply({ ...this.value }); this.dialog.close();
      });
      const wheel = document.getElementById('hue-wheel');
      const c = wheel.getContext('2d');
      for(let deg=0;deg<360;deg++) { c.beginPath(); c.arc(140,140,112,(deg-90)*Math.PI/180,(deg-88.5)*Math.PI/180); c.lineWidth=40; c.strokeStyle=hsvToHex(deg,100,100); c.stroke(); }
      const pickHue = e => { const r=wheel.getBoundingClientRect(); this.value.h = (Math.atan2(e.clientY-r.top-r.height/2,e.clientX-r.left-r.width/2)*180/Math.PI+450)%360; this.update(); };
      wheel.addEventListener('pointerdown', e => { if(e.button!==0 || this.pointer!=null)return; this.pointer=e.pointerId; wheel.setPointerCapture(e.pointerId); pickHue(e); });
      wheel.addEventListener('pointermove', e => { if(e.pointerId===this.pointer)pickHue(e); });
      for(const event of ['pointerup','pointercancel','lostpointercapture']) wheel.addEventListener(event,e=>{ if(e.pointerId===this.pointer)this.pointer=null; });
    }
    open(color, opacity) { this.value={...color,a:Math.round(opacity*100)}; this.pointer=null; this.update(); this.dialog.showModal(); }
    update(updateHex=true) {
      const v=this.value, hex=hsvToHex(v.h,v.s,v.v);
      for(const [id,key,suffix] of [['hue','h','°'],['saturation','s','%'],['brightness','v','%'],['opacity','a','%']]) { this.inputs[id].value=Math.round(v[key]); document.getElementById(id+'-value').textContent=Math.round(v[key])+suffix; }
      if(updateHex)this.inputs.hex.value=hex;
      document.getElementById('hex-preview').textContent=hex;
      const preview=document.getElementById('color-preview'); preview.style.background=hex; preview.style.opacity=v.a/100;
      this.inputs.saturation.style.background=`linear-gradient(to right,${hsvToHex(v.h,0,v.v)},${hsvToHex(v.h,100,v.v)})`;
      this.inputs.brightness.style.background=`linear-gradient(to right,#000,${hsvToHex(v.h,v.s,100)})`;
      this.inputs.opacity.style.background=`linear-gradient(to right,transparent,${hex}),repeating-conic-gradient(#fff 0% 25%,#9ba5b4 0% 50%) 0 / 12px 12px`;
      const angle=(v.h-90)*Math.PI/180, cursor=document.getElementById('hue-cursor'); cursor.style.left=(50+40*Math.cos(angle))+'%'; cursor.style.top=(50+40*Math.sin(angle))+'%';
    }
  }
  window.DoodlePicker=Picker;
})();
