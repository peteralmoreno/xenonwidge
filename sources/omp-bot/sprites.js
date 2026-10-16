/* Original 32-ish pixel robot, drawn on a 64 x 64 grid. */
window.RanchSprites=(()=>{
 const rect=(x,y,w,h,fill,cls='')=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" class="${cls}"/>`;
 const ink='#233830',cream='#fff0bf';
 const colors=[['coral','#e58d77','#f8baa0'],['cyan','#68bbc3','#b0e3d7'],['gold','#ddb55c','#ffe3a1'],['violet','#a396ca','#d0c5eb'],['rose','#e78fb3','#ffd0e4'],['orange','#e8a05b','#ffd3a1'],['lime','#a8c966','#deeda5'],['emerald','#65b58e','#b4e5c7'],['blue','#729edb','#bfd8ff'],['indigo','#8585d5','#cccaff'],['silver','#bbc5cb','#ecf2f5'],['red','#cf7070','#ffc2b8'],['cream','#e4dcad','#fff1cf'],['mint','#66d9ce','#b8f4e9'],['orchid','#d976ed','#f3b5f7'],['copper','#a78362','#dec09d'],['hotred','#ff2d2d','#ff9b9b'],['magenta','#ff4dd8','#ffb8ef'],['sky','#2ec4ff','#b8e9ff'],['neon','#7cff3f','#d4ffb8'],['tangerine','#ff6b00','#ffb877'],['sun','#ffd400','#fff080'],['spring','#00e676','#8af7c9'],['teal','#00b8a9','#86e8dd'],['azure','#0a7dff','#9cc8ff'],['royal','#5e35ff','#b3a1ff'],['grape','#9b30ff','#d2a3ff'],['fuchsia','#ff0088','#ff99d0'],['watermelon','#ff4f6d','#ffb0bc'],['lavender','#b388ff','#e0d0ff'],['pearl','#ffffff','#f0f0f0'],['jet','#151515','#4d4d4d']];
 function svg(slot,state,design='classic'){
  const [,c,light]=(colors[slot]||colors[0]);let prop='',badge='';
  if(state==='reading')prop=rect(15,38,34,17,ink)+rect(17,40,13,12,cream)+rect(33,40,14,12,'#e6d79b')+rect(19,43,9,2,'#a99a68')+rect(35,43,9,2,'#a99a68');
  if(state==='researching')prop=`<path d="M43 27h12v3h3v12h-3v3H43v-3h-3V30h3z" fill="${ink}"/><path d="M44 31h10v10H44z" fill="#c3e4ca"/><path d="m41 43 4 4-9 9-4-4z" fill="${cream}"/>`;
  if(state==='writing')prop=rect(12,49,34,7,cream)+rect(17,51,19,2,'#a99a68')+`<path d="m34 47 11-17 5 3-11 17-6 3z" fill="#efc26c"/><path d="m33 53 1-6 5 3z" fill="${ink}"/>`;
  if(state==='running'||state==='working')prop=rect(13,39,38,17,ink)+rect(16,42,32,11,'#456255')+`<path d="m19 44 3 3-3 3m8 0h6" stroke="${cream}" stroke-width="2" fill="none"/>`;
  if(state==='thinking')badge=rect(45,15,3,3,cream)+rect(49,10,5,5,cream)+rect(55,3,7,7,cream);
  const marks={waiting:'?',done:'✓',error:'!',offline:'z'};
  if(marks[state])badge=rect(46,3,16,17,ink)+rect(48,5,12,13,state==='error'?'#f2a080':cream)+`<text x="54" y="15" text-anchor="middle" font-family="monospace" font-size="12" font-weight="bold" fill="${ink}">${marks[state]}</text>`;
  let result=`<svg class="sprite" viewBox="0 0 64 64" shape-rendering="crispEdges" aria-hidden="true"><g class="robot">${rect(18,56,30,3,'#38624b')}${rect(22,47,8,9,ink)}${rect(35,47,8,9,ink)}${rect(19,54,12,4,ink)}${rect(34,54,12,4,ink)}${rect(19,34,27,16,ink)}${rect(22,36,21,12,c)}${rect(27,38,11,6,ink)}${rect(30,40,5,2,cream)}<g class="arm">${rect(13,36,6,13,ink)}${rect(46,36,6,13,ink)}${rect(14,40,5,6,light)}${rect(46,40,5,6,light)}</g>${rect(30,8,4,8,ink)}${rect(28,5,8,5,cream)}${rect(16,16,33,18,ink)}${rect(19,13,27,24,ink)}${rect(19,16,27,17,c)}${rect(20,16,24,3,light)}${rect(22,21,21,10,ink)}${rect(25,24,4,state==='offline'?1:4,cream,'eye')}${rect(36,24,4,state==='offline'?1:4,cream,'eye')}${rect(12,22,4,8,ink)}${rect(49,22,4,8,ink)}<g class="prop">${prop}</g></g><g class="badge">${badge}</g><g class="hammer"><path d="M45 25h4v22h-4z" fill="#79583f"/><path d="M39 22h17v8H39z" fill="#c8cbbc" stroke="#233830" stroke-width="2"/></g><g class="celebration"><path d="M8 9h4v4H8zM14 3h3v5h-3zM51 2h4v4h-4zM57 24h4v4h-4zM5 28h3v5H5z" fill="#ffe3a1"/><path d="M3 18h4v4H3zM57 10h4v5h-4zM12 25h3v3h-3z" fill="#eab4a2"/></g><g class="nap"><text x="47" y="17" fill="#fff0bf" font-family="monospace" font-size="13">z</text><text x="56" y="9" fill="#fff0bf" font-family="monospace" font-size="9">z</text></g></svg>`;
  if(design==='pm'){
   // Coordinator: an open face, headset, tidy jacket and a small task clipboard.
   const pm=`<g class="pm">${rect(20,12,25,5,ink)}${rect(22,12,21,3,light)}<path d="M17 26v-7h4m23 0h4v13h-8" fill="none" stroke="${ink}" stroke-width="3"/>${rect(14,23,5,8,light)}${rect(46,23,5,8,light)}${rect(38,30,5,3,cream)}${rect(23,36,19,12,c)}<path d="m26 36 6 9 7-9" fill="${cream}"/>${rect(31,38,3,6,ink)}${rect(39,38,12,15,ink)}${rect(41,40,8,11,cream)}${rect(43,38,4,4,light)}${rect(43,44,4,2,c)}${rect(43,48,4,1,ink)}</g>`;
   result=result.replace('<g class="prop">',pm+'<g class="prop">');
  }
  if(design==='pipeline'){
   // Compact service tank: valve cap, friendly face and a separate pressure gauge.
   const pipe=`<g class="pipeline">${rect(18,57,30,3,'#38624b')}${rect(23,49,7,8,ink)}${rect(36,49,7,8,ink)}${rect(20,55,11,3,ink)}${rect(35,55,11,3,ink)}<path d="M20 37h-7v12h6m25-12h7v12h-6" fill="none" stroke="${ink}" stroke-width="8"/><path d="M20 37h-7v12h6m25-12h7v12h-6" fill="none" stroke="${light}" stroke-width="4"/><path d="M23 14h18v4h5v29h-5v5H23v-5h-5V18h5z" fill="${ink}"/><path d="M24 17h16v4h3v24h-3v4H24v-4h-3V21h3z" fill="${c}"/>${rect(23,20,3,23,light)}${rect(26,23,15,11,ink)}${rect(28,26,3,state==='offline'?1:4,cream,'eye')}${rect(36,26,3,state==='offline'?1:4,cream,'eye')}<path d="M29 37h8v2h2v6h-2v2h-8v-2h-2v-6h2z" fill="${ink}"/>${rect(29,39,8,6,cream)}<path d="m33 44 2-4" fill="none" stroke="${ink}" stroke-width="2"/>${rect(30,8,5,8,ink)}${rect(24,5,17,4,ink)}${rect(25,4,15,3,light)}${rect(31,3,3,6,c)}${rect(9,46,8,4,c)}${rect(48,46,8,4,c)}</g>`;
   result=result.replace(/(<g class="robot">)[\s\S]*?(<g class="prop">)/,'$1'+pipe+'$2');
  }
  return result;
 }
 function portrait(slot,design='classic'){return svg(slot,'ready',design).replace('class="sprite" viewBox="0 0 64 64"','class="sprite portrait" viewBox="8 2 48 47"');}
 return {colors,svg,portrait};
})();
