(function () {
  'use strict';
  const body = document.body;
  const widget = document.querySelector('.desk') ? 'ranch-desk' : 'omp-bot';
  const storageKey = widget + '.appearance';
  const themes = ['moss', 'sunset', 'moonlight'];
  const maps = ['meadow', 'courtyard'];
  let preferences = { theme: 'moss', map: 'meadow' };
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    if (saved && themes.includes(saved.theme)) preferences.theme = saved.theme;
    if (saved && maps.includes(saved.map)) preferences.map = saved.map;
  } catch {}
  if (widget === 'omp-bot') {
    try {
      if (localStorage.getItem(storageKey) === null) {
        const legacy = JSON.parse(localStorage.getItem('ranch-desk.appearance'));
        if (legacy && themes.includes(legacy.theme)) preferences.theme = legacy.theme;
        if (legacy && maps.includes(legacy.map)) preferences.map = legacy.map;
        if (legacy && (themes.includes(legacy.theme) || maps.includes(legacy.map))) {
          localStorage.setItem(storageKey, JSON.stringify(preferences));
        }
      }
    } catch {}
  }
  function apply() {
    body.dataset.theme = preferences.theme;
    body.dataset.map = preferences.map;
    body.dispatchEvent(new CustomEvent('appearancechange', { bubbles: true, detail: { ...preferences } }));
  }
  apply();
  const button = document.createElement('button');
  button.id = 'look';
  button.type = 'button';
  button.textContent = 'Look';
  button.setAttribute('aria-label', 'Appearance settings');
  button.setAttribute('aria-haspopup', 'dialog');
  button.setAttribute('aria-controls', 'appearance');
  let actions = document.querySelector('header .actions');
  if (!actions) {
    actions = document.createElement('div');
    actions.className = 'actions';
    const connect = document.getElementById('connect');
    connect.parentNode.insertBefore(actions, connect);
    actions.append(connect);
  }
  actions.prepend(button);
  const dialog = document.createElement('dialog');
  dialog.id = 'appearance';
  dialog.setAttribute('aria-labelledby', 'appearance-title');
  dialog.innerHTML = '<h2 id="appearance-title">Make it yours</h2><p>Choose the colors and setting for this widget.</p><label for="appearance-theme">Color theme</label><select id="appearance-theme"><option value="moss">Moss</option><option value="sunset">Sunset</option><option value="moonlight">Moonlight</option></select><label for="appearance-map">Map</label><select id="appearance-map"><option value="meadow">Meadow</option><option value="courtyard">Courtyard</option></select><p class="appearance-note">Changes save automatically on this widget.</p><div class="dialog-actions"><button id="appearance-close" type="button">Done</button></div>';
  body.append(dialog);
  const theme = dialog.querySelector('#appearance-theme');
  const map = dialog.querySelector('#appearance-map');
  theme.value = preferences.theme;
  map.value = preferences.map;
  function save() {
    preferences = { theme: theme.value, map: map.value };
    apply();
    try { localStorage.setItem(storageKey, JSON.stringify(preferences)); } catch {}
  }
  theme.addEventListener('change', save);
  map.addEventListener('change', save);
  button.addEventListener('click', () => dialog.showModal());
  dialog.querySelector('#appearance-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => button.focus());
})();
