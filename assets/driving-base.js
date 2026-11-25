(() => {
  const here = document.currentScript && document.currentScript.src;
  const init = () => {
  const loader = document.querySelector('script[data-name][data-driving]');
  if (!loader) return;

  const name = loader.dataset.name || document.title;
  const description = loader.dataset.description || '';
  const controls = (loader.dataset.controls || '').split('|').filter(Boolean);
  const style = document.createElement('style');
  style.textContent = `
    .driving-map-target{position:fixed!important;top:max(14px,env(safe-area-inset-top,0px))!important;right:max(14px,env(safe-area-inset-right,0px))!important;left:auto!important;bottom:auto!important;width:clamp(112px,22vw,172px)!important;height:auto!important;aspect-ratio:1!important;z-index:4!important;border:1px solid rgba(201,232,223,.52)!important;border-radius:8px!important;box-shadow:0 8px 26px rgba(0,0,0,.4)!important;pointer-events:auto!important}
    .driving-map{position:fixed;top:max(14px,env(safe-area-inset-top,0px));left:max(14px,env(safe-area-inset-left,0px));z-index:4;width:clamp(112px,22vw,172px);aspect-ratio:1;border:1px solid rgba(201,232,223,.52);border-radius:8px;background:#101a1d;box-shadow:0 8px 26px rgba(0,0,0,.4);pointer-events:none}
    .driving-map[hidden]{display:none}
    .driving-map{display:none!important}
    .driving-map canvas{display:block;width:100%;height:100%}
    .driving-map__label{position:absolute;top:7px;left:8px;color:#c4d5d0;font:9px 'IBM Plex Mono',Consolas,monospace;letter-spacing:.08em;text-shadow:0 1px 3px #000}`;
  document.head.append(style);

  // Menu unique : titre, présentation (2 lignes), touches, insérés en tête du menu du jeu (data-menu), dont les éléments redondants (data-menu-hide, séparés par |) sont masqués.
  // Le bloc disparaît dès que le menu de départ est refermé : pause et fin de partie gardent leur contenu.
  const menuSel = loader.dataset.menu, when = loader.dataset.menuWhen;
  if (menuSel) {
    const hide = (loader.dataset.menuHide || '').split('|').filter(Boolean).map(s => `.hk-brief ~ ${s}`).join(',');
    const css = document.createElement('style');
    css.textContent = hide ? hide + '{display:none!important}' : '';
    if (here) document.head.append(Object.assign(document.createElement('link'), { rel: 'stylesheet', href: new URL('game-menu.css', here).href }));
    document.head.append(css);
    const brief = document.createElement('div');
    brief.className = 'hk-brief';
    const h1 = document.createElement('h1'); h1.textContent = name;
    const desc = document.createElement('p'); desc.textContent = description;
    brief.append(h1, desc);
    // Pied de menu (Réglages + commandes) : construit par assets/quality.js (GameSettings.foot), le même que dans les menus de pause
    let foot = null;
    const getFoot = () => foot || (window.GameSettings ? (foot = window.GameSettings.foot()) : null);
    let seen = false, done = false;
    setInterval(() => {
      const card = document.querySelector(menuSel);
      if (!card) return;
      const shown = card.getClientRects().length > 0;
      if (shown) seen = true;
      else if (seen && !done) { done = true; foot?.remove(); h1.textContent = name + ' · pause'; desc.hidden = true; } // le bloc reste dans le menu (il garde masqués les titres, textes et listes de touches propres au jeu) : le menu rouvert est celui de pause
      if (!shown) return;
      // habillage commun, y compris pour les écrans suivants du menu (garage, réglages…)
      card.classList.add('hk-card');
      if (card.parentElement && card.parentElement !== document.body) card.parentElement.classList.add('hk-scrim');
      const acts = [...card.querySelectorAll('button')].filter(b => !b.closest('.hk-brief') && !b.closest('.hk-foot') && !b.parentElement.closest('[class*="grid"],[class*="opt"],[class*="seg"],[class*="tabs"],#bikes'));
      acts.forEach(b => b.classList.add('hk-btn'));
      if (acts.length && !acts.some(b => b.classList.contains('hk-primary'))) (acts.find(b => /primary|go/.test(b.className) || b.id === 'go') || acts[0]).classList.add('hk-primary');
      if (done) return;
      const ok = !when || (when.startsWith(':scope') ? card : document).querySelector(when);
      if (!ok) { brief.remove(); foot?.remove(); }
      else { if (brief.parentNode !== card) card.prepend(brief); const ft = getFoot(); if (ft && (ft.parentNode !== card || card.lastElementChild !== ft)) card.append(ft); }
    }, 150);
  }

  const mini = document.createElement('div');
  mini.className = 'driving-map';
  mini.setAttribute('aria-label', 'Carte de conduite');
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const label = document.createElement('span');
  label.className = 'driving-map__label';
  label.textContent = 'TRACE GPS';
  mini.append(canvas, label);
  const mapSources = ['#minimap', '#mini', '.hud-map', '#h-map'];
  let existingMap = null;
  document.body.append(mini);
  function bindExistingMap() {
    const found = document.querySelector(mapSources.join(','));
    if (!found || found === existingMap) return;
    existingMap = found;
    found.classList.add('driving-map-target');
    if (found.id === 'h-map') found.hidden = false;
    mini.hidden = true;
  }
  bindExistingMap();
  new MutationObserver(bindExistingMap).observe(document.body, { childList: true, subtree: true });

  const samples = [];
  let state = null;
  function drawMap() {
    const context = canvas.getContext('2d');
    const size = canvas.width, center = size / 2;
    context.clearRect(0, 0, size, size);
    context.fillStyle = '#101a1d'; context.fillRect(0, 0, size, size);
    context.strokeStyle = 'rgba(177,208,198,.12)'; context.lineWidth = 1;
    for (let p = 32; p < size; p += 32) { context.beginPath(); context.moveTo(p, 0); context.lineTo(p, size); context.stroke(); context.beginPath(); context.moveTo(0, p); context.lineTo(size, p); context.stroke(); }
    context.strokeStyle = 'rgba(177,208,198,.2)';
    for (const radius of [42, 84, 126]) { context.beginPath(); context.arc(center, center, radius, 0, Math.PI * 2); context.stroke(); }
    if (state && samples.length > 1) {
      const maxDist = samples.reduce((max, point) => Math.max(max, Math.hypot(point.x - state.x, point.z - state.z)), 30);
      const scale = 116 / maxDist;
      context.strokeStyle = '#72d9c0'; context.lineWidth = 3; context.lineCap = 'round'; context.lineJoin = 'round'; context.beginPath();
      samples.forEach((point, index) => {
        const x = center + (point.x - state.x) * scale;
        const y = center - (point.z - state.z) * scale;
        index ? context.lineTo(x, y) : context.moveTo(x, y);
      });
      context.stroke();
    }
    context.save(); context.translate(center, center); context.rotate(-(state?.heading || 0));
    context.fillStyle = '#f2c17c'; context.strokeStyle = '#07120f'; context.lineWidth = 3;
    context.beginPath(); context.moveTo(0, -13); context.lineTo(9, 10); context.lineTo(0, 6); context.lineTo(-9, 10); context.closePath(); context.fill(); context.stroke(); context.restore();
  }
  function update(next) {
    if (!next || !Number.isFinite(next.x) || !Number.isFinite(next.z)) return;
    state = { x: next.x, z: next.z, heading: Number(next.heading) || 0 };
    const last = samples[samples.length - 1];
    if (!last || Math.hypot(last.x - state.x, last.z - state.z) > 1.5) {
      samples.push(state);
      if (samples.length > 240) samples.shift();
    }
    if (!existingMap) drawMap();
  }
  const readState = () => {
    if (loader.dataset.driving === 'drift-zone') {
      const car = window.game?.car;
      return car && { x: car.x, z: car.y, heading: car.angle };
    }
    if (loader.dataset.driving === 'drift-king') return window.__driftMap?.();
    if (loader.dataset.driving === 'rail-express') return window.__railMap?.();
    if (loader.dataset.driving === 'downhill-riders') return window.__downhillMap?.();
    if (loader.dataset.driving === 'trottinette-freestyle') {
      const rider = window.__trott?.st;
      return rider && { x: rider.pos.x, z: rider.pos.z, heading: rider.heading };
    }
    return null;
  };
  window.DrivingBase = { update, get state() { return state; } };
  const poll = () => { if (!existingMap) update(readState()); };
  poll();
  setInterval(poll, 100);

  window.addEventListener('game-ready', () => {
    if (!existingMap) update(readState());
  });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();