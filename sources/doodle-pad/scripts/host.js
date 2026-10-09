(function () {
  'use strict';
  function pngBlob(canvas) { return new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Could not create the PNG image.')),'image/png')); }
  async function decodeImage(blob) {
    if(!/^image\/(png|jpeg|webp)$/.test(blob.type)) throw new Error('Choose a PNG, JPEG or WebP image.');
    if(blob.size>20*1024*1024)throw new Error('Choose an image smaller than 20 MB.');
    const url=URL.createObjectURL(blob), image=new Image();
    try { image.src=url; await image.decode(); if(image.width*image.height>32_000_000)throw new Error('Choose an image under 32 megapixels.'); return image; }
    finally { URL.revokeObjectURL(url); }
  }
  async function copy(canvas) {
    if(!navigator.clipboard?.write || !window.ClipboardItem)throw new Error('Image copy is unavailable in this host. Try Save PNG.');
    try { await navigator.clipboard.write([new ClipboardItem({'image/png':pngBlob(canvas)})]); }
    catch { throw new Error('Clipboard copy was blocked. Allow clipboard access in the host or use Save PNG.'); }
  }
  async function paste() {
    if(!navigator.clipboard?.read)throw new Error('Tap the page and press Ctrl+V, or use Open image. Clipboard access is unavailable here.');
    let items;
    try { items=await navigator.clipboard.read(); } catch { throw new Error('Paste was blocked. Try Ctrl+V on the page, or Open image.'); }
    for(const item of items) { const type=item.types.find(t=>/^image\/(png|jpeg|webp)$/.test(t)); if(type)return decodeImage(await item.getType(type)); }
    throw new Error('No image on the clipboard. Copy an image first.');
  }
  async function save(canvas) {
    const blob=await pngBlob(canvas), url=URL.createObjectURL(blob), a=document.createElement('a');
    a.href=url; a.download='doodle-'+new Date().toISOString().replace(/[:.]/g,'-')+'.png'; document.body.append(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),60000);
  }
  window.DoodleHost={ pngBlob,decodeImage,copy,paste,save };
})();
