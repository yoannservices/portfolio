/* Manette Xbox (API Gamepad) : sticks et boutons -> touches clavier (keydown/keyup, event.code) pour les jeux qui lisent le clavier,
   navigation des menus, Start = pause, joystick droit = caméra (clic + glisser simulé).
   <script src=".../gamepad.js" data-profile="dk|tesla|mr|kuk|trot|rail|plane|mo|none"> ; "none" = jeu à manette native : menus + caméra seulement.
   Valeurs analogiques dans window.GP (lx, ly, rx, ry, lt, rt ; haut = négatif). Hooks posés par les jeux :
   GP.sub() sous-profil (id d'avion, {cat,id} du véhicule), GP.air() vrai en l'air, GP.wheelOpen() roue des véhicules, GP.canvas() canvas de la scène.
   Boutons : 0 A, 1 B, 2 X, 3 Y, 4 LB, 5 RB, 6 LT, 7 RT, 8 Back, 9 Start, 10 L3, 11 R3, 12-15 croix haut/bas/gauche/droite. */
(function () {
  'use strict';
  if (window.GP) return;
  const dz = (v, d = 0.18) => (Math.abs(v) < d ? 0 : (v - Math.sign(v) * d) / (1 - d));
  const GP = (window.GP = { on: false, lx: 0, ly: 0, rx: 0, ry: 0, lt: 0, rt: 0, sub: null, air: null, wheelOpen: null, canvas: null });
  const T = 0.4; // seuil d'un stick traité comme une touche
  const base = document.currentScript && document.currentScript.dataset.profile || 'none';
  const camOK = !document.currentScript || document.currentScript.dataset.cam !== '0'; // data-cam="0" : jeu sans caméra libre ou stick droit déjà utilisé

  // a : [axe, code négatif (gauche/haut), code positif (droite/bas)] · t : [gâchette, code] · b : bouton -> code | [code, key, répétition ms] | { c: [codes simultanés] }
  const STEER = ['lx', 'KeyA', 'KeyD'], DRIVE = [['rt', 'KeyW'], ['lt', 'KeyS']];
  const P = {
    none: { cam: true },
    dk: { cam: true, a: [STEER], t: DRIVE, b: { 0: 'Space', 2: 'KeyR' } },
    mr: { cam: true, a: [STEER], t: DRIVE, b: { 0: 'Space', 2: 'KeyR', 3: 'KeyC' } },
    kuk: { cam: true, a: [STEER], t: DRIVE, b: { 0: 'Space', 5: 'ShiftLeft', 3: 'KeyC', 2: 'KeyE', 8: 'KeyT', 12: 'KeyM' } },
    car: { cam: true, a: [STEER], t: DRIVE, b: { 0: 'Space', 1: 'KeyL', 2: 'KeyR', 3: 'KeyC', 5: 'ShiftLeft' } },
    // Tesla : au sol gâchettes = gaz/frein et stick gauche = direction ; en l'air seuls les sticks comptent
    tesla: {
      cam: true, a: [STEER], t: DRIVE, b: { 0: 'Space', 1: 'KeyL', 2: 'KeyR', 3: 'KeyC', 5: 'ShiftLeft', 12: 'KeyT', 15: 'KeyN' },
      air: { cam: false, a: [STEER, ['ly', 'KeyW', 'KeyS'], ['rx', 'KeyQ', 'KeyE']], t: [] },
    },
    // voiture volante : au sol comme une voiture ; en vol sticks = avancer/lacet (gauche) et glisser/roulis (droit), RT monte, LT descend
    flycar: {
      cam: true, a: [STEER], t: DRIVE, b: { 0: 'Space', 1: 'KeyL', 2: 'KeyR', 3: 'KeyC', 4: 'KeyB', 5: 'KeyG', 10: 'KeyO', 11: 'ShiftLeft', 13: 'KeyF' },
      air: { cam: false, a: [['lx', 'KeyA', 'KeyD'], ['ly', 'KeyW', 'KeyS'], ['rx', 'KeyQ', 'KeyE']], t: [['rt', 'Space'], ['lt', 'ControlLeft']] },
    },
    // trottinette freestyle / VTT : en l'air stick gauche = rotations + flips, stick droit = barre (x) et socle (y) ; au sol caméra
    trot: {
      cam: true, a: [STEER], t: DRIVE,
      b: { 0: 'Space', 1: 'KeyL', 2: 'KeyR', 3: 'KeyC', 4: 'KeyE', 5: 'ShiftLeft', 12: { c: ['KeyL', 'KeyW'] }, 13: { c: ['KeyL', 'KeyS'] }, 14: { c: ['KeyL', 'KeyA'] }, 15: { c: ['KeyL', 'KeyD'] } },
      air: { cam: false, a: [STEER, ['ly', 'KeyW', 'KeyS'], ['rx', 'KeyI', 'KeyK'], ['ry', 'KeyJ', 'KeyU']], t: [] },
    },
    // train : e.key en lettres AZERTY ; RT monte le manipulateur, LT serre le frein, LB le desserre, RB VACMA, A acquitter KVB, X klaxon, croix bas urgence, croix haut portes
    rail: {
      cam: true, a: [['ly', ['KeyW', 'z', 160], ['KeyS', 's', 160]]], t: [['rt', ['KeyW', 'z', 140]], ['lt', ['KeyF', 'f', 450]]],
      b: { 0: ['Enter', 'Enter'], 2: ['KeyK', 'k'], 3: ['KeyC', 'c'], 4: ['KeyD', 'd', 450], 5: ['Space', ' '], 12: ['KeyP', 'p'], 13: ['KeyU', 'u'], 14: ['KeyD', 'd', 450], 15: ['KeyF', 'f', 450], 8: ['KeyM', 'm'] },
    },
    plane: {
      a: [STEER, ['ly', 'KeyS', 'KeyW'], ['rx', 'KeyA', 'KeyD'], ['ry', 'KeyQ', 'KeyE']], t: [['rt', 'ShiftLeft'], ['lt', 'ControlLeft']],
      b: { 0: 'KeyG', 3: 'KeyC', 12: 'KeyF', 13: 'KeyB', 14: 'KeyO', 15: 'KeyH', 4: 'KeyT', 5: 'KeyT', 8: 'KeyM', 11: 'Tab' },
    },
    f35: { b: { 4: 'KeyT', 5: 'KeyT' } },
    pv40: { b: { 4: 'KeyY', 5: 'KeyT' } },
    heli: { a: [['lx', 'KeyQ', 'KeyE'], ['ly', 'KeyW', 'KeyS'], ['rx', 'KeyA', 'KeyD']], t: [['rt', 'ShiftLeft'], ['lt', 'ControlLeft']], b: { 0: 'Space', 2: 'KeyR', 3: 'KeyC' } },
    drone: { a: [['lx', 'KeyA', 'KeyD'], ['ly', 'ArrowUp', 'ArrowDown'], ['rx', 'ArrowLeft', 'ArrowRight']], t: [['rt', 'KeyW'], ['lt', 'KeyS']], b: { 1: 'KeyV', 3: 'KeyC', 2: 'KeyR' } },
  };
  const COMMON = { 8: 'KeyM' };
  let xTwice = false; // avion : X = frein d'urgence puis, 2e fois, parachute

  // profil effectif : base (+ sous-profil GP.sub()) ; air/sol ; monde-ouvert : GP.sub() = { cat, id } du véhicule
  function profile() {
    const s = GP.sub && GP.sub();
    if (base === 'none') return { cam: camOK && !(GP.air && GP.air()) };
    let p = P[base] || P.none, id = s;
    if (base === 'mo') {
      const cat = s && s.cat; id = s && s.id;
      const k = id === 'freestyle' ? 'trot' : id === 'tesla' ? 'tesla' : id === 'flycar' ? 'flycar' : id === 'kukirin' ? 'kuk' : { bike: 'mr', heli: 'heli', plane: 'plane', drone: 'drone' }[cat] || 'car';
      p = Object.assign({}, P[k]); p.b = Object.assign({}, p.b, k === 'plane' ? { 3: 'KeyC', 15: 'KeyV', 14: 'KeyF', 11: 'KeyO' } : {});
      if (k === 'mr') p.b = Object.assign({}, p.b, { 1: 'KeyL' });
    }
    const o = P[id];
    if (o && o !== p) p = { cam: p.cam, a: o.a || p.a, t: o.t || p.t, b: Object.assign({}, p.b, o.b) };
    if (p.air && GP.air && GP.air()) p = Object.assign({}, p, p.air, { b: Object.assign({}, p.b, p.air.b) });
    return p;
  }

  const held = new Map();   // code -> { key, rep, last }
  let prevB = [], camOn = false, camX = 0, camY = 0, wasWheel = false, nav = { root: null, t: 0 }, cv = null;
  const body = () => document.body || document.documentElement;
  const send = (type, code, key, repeat) => {
    const t = document.activeElement && /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) ? window : body();
    t.dispatchEvent(new KeyboardEvent(type, { code, key: key || (code.startsWith('Key') ? code.slice(3).toLowerCase() : code), bubbles: true, cancelable: true, repeat: !!repeat }));
  };
  const tap = (code, key) => { send('keydown', code, key); send('keyup', code, key); };
  const want = (m, spec) => {
    if (!spec) return;
    if (spec.c) { spec.c.forEach(c => want(m, c)); return; }
    const [code, key, rep] = Array.isArray(spec) ? spec : [spec];
    if (!m.has(code)) m.set(code, { key, rep });
  };
  function releaseAll() { for (const [code, h] of held) send('keyup', code, h.key); held.clear(); }
  const pause = () => { const b = document.getElementById('hk-pause'); if (b) b.click(); else tap('Escape'); };

  /* ── Caméra : le joystick droit simule clic + glisser sur le canvas de la scène ── */
  function canvas() {
    if (GP.canvas) { const c = GP.canvas(); if (c) return c; }
    if (cv && cv.isConnected && cv.getClientRects().length) return cv;
    let best = null, area = 0;
    for (const c of document.querySelectorAll('canvas')) {
      if (c.closest('.driving-map,.hk,[id^="hk-"]')) continue;
      const r = c.getBoundingClientRect(), a = r.width * r.height;
      if (a > area) { area = a; best = c; }
    }
    return (cv = best);
  }
  function fire(type, x, y, mx, my) {
    const c = canvas(); if (!c) return;
    c.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, pointerId: 1, pointerType: 'mouse', isPrimary: true, button: 0, buttons: type === 'pointerup' ? 0 : 1, clientX: x, clientY: y, movementX: mx || 0, movementY: my || 0 }));
  }
  function camStep(on) {
    const x = GP.rx, y = GP.ry;
    if (on && Math.hypot(x, y) > 0.2) {
      if (!camOn) { camOn = true; camX = innerWidth / 2; camY = innerHeight / 2; fire('pointerdown', camX, camY); }
      const mx = x * 9, my = y * 9; camX += mx; camY += my;
      fire('pointermove', camX, camY, mx, my);
      if (camX < 30 || camY < 30 || camX > innerWidth - 30 || camY > innerHeight - 30) { fire('pointerup', camX, camY); camOn = false; }
    } else if (camOn) { fire('pointerup', camX, camY); camOn = false; }
  }

  /* ── Menus : stick gauche / croix = focus, A = clic, B = retour ── */
  const ROOTS = ['#hk-menu', '.hk-card', '#screen', '#menu', '#ovStart', '#ovMenu', '#ovGarage', '#ovBusted', '#ovPhone', '#menu-start', '#menu-pause', '#panel-results', '#panel-book', '#panel-controls', '#overlay', '#suBody', '.menu .panel', '.menu'];
  const FOCUS = 'button:not([disabled]),select:not([disabled]),input[type=range]:not([disabled]),input[type=checkbox]:not([disabled]),[role=button],.item:not([disabled])';
  const shown = e => e && !e.hidden && e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden' && !e.closest('[hidden]');
  const items = root => [...root.querySelectorAll(FOCUS)].filter(shown);
  function menuRoot() {
    for (const s of ROOTS) for (const e of document.querySelectorAll(s)) if (shown(e) && items(e).length) return e;
    return null;
  }
  function navStep(root, now, g) {
    const it = items(root); if (!it.length) return;
    if (nav.root !== root) { nav.root = root; const pi = it.findIndex(b => b.classList.contains('hk-primary') || /primary|\bgo\b/.test(b.className) || b.id === 'go'); nav.i = pi >= 0 ? pi : Math.max(0, it.findIndex(b => !/^\s*[✕×]/.test(b.textContent))); it[nav.i].focus(); }
    let i = it.indexOf(document.activeElement); if (i < 0) { i = Math.min(nav.i || 0, it.length - 1); it[i].focus(); }
    nav.i = i;
    const bp = n => !!(g.buttons[n] && g.buttons[n].pressed);
    const dx = (GP.lx > T || bp(15) ? 1 : 0) - (GP.lx < -T || bp(14) ? 1 : 0), dy = (GP.ly > T || bp(13) ? 1 : 0) - (GP.ly < -T || bp(12) ? 1 : 0);
    const cur = it[i], adj = cur.tagName === 'SELECT' || cur.type === 'range';
    if ((dx || dy) && now - nav.t > 220) {
      nav.t = now;
      if (adj && dx) {
        if (cur.tagName === 'SELECT') cur.selectedIndex = Math.max(0, Math.min(cur.options.length - 1, cur.selectedIndex + dx));
        else cur.value = String(+cur.value + dx * (+cur.step || 1) * Math.max(1, Math.round((+cur.max - +cur.min) / 20)));
        cur.dispatchEvent(new Event('input', { bubbles: true })); cur.dispatchEvent(new Event('change', { bubbles: true }));
      } else {
        const j = Math.max(0, Math.min(it.length - 1, i + (dy || dx))); nav.i = j; it[j].focus(); it[j].scrollIntoView({ block: 'nearest' });
      }
    }
    if (bp(0) && !prevB[0]) cur.click();
    if (bp(1) && !prevB[1]) tap('Escape');
  }

  function wheelStep(g) {
    // roue des véhicules (monde-ouvert) : stick gauche ou croix pointe un secteur ; fort = anneau des véhicules ; A valide, B annule
    const s = Math.min(innerWidth, innerHeight), rOut = Math.max(150, Math.min(240, s * 0.26));
    let x = GP.lx, y = GP.ly; if (g.buttons[14] && g.buttons[14].pressed) x = -1; if (g.buttons[15] && g.buttons[15].pressed) x = 1; if (g.buttons[12] && g.buttons[12].pressed) y = -1; if (g.buttons[13] && g.buttons[13].pressed) y = 1;
    const mag = Math.hypot(x, y);
    if (mag > 0.35) {
      const d = mag > 0.8 ? rOut + 100 : rOut * 0.8, k = d / mag;
      window.dispatchEvent(new PointerEvent('pointermove', { clientX: innerWidth / 2 + x * k, clientY: innerHeight / 2 + y * k, bubbles: true }));
    }
    const a = !!(g.buttons[0] && g.buttons[0].pressed), b = !!(g.buttons[1] && g.buttons[1].pressed);
    if (a && !prevB[0]) send('keyup', 'Tab'); else if (b && !prevB[1]) { tap('Escape'); }
    prevB[0] = a; prevB[1] = b;
  }

  function frame(now) {
    requestAnimationFrame(frame);
    const g = [...(navigator.getGamepads ? navigator.getGamepads() : [])].find(p => p && p.connected);
    if (!g) { if (GP.on) { GP.on = false; releaseAll(); if (camOn) { fire('pointerup', camX, camY); camOn = false; } } return; }
    GP.on = true;
    GP.lx = dz(g.axes[0] || 0); GP.ly = dz(g.axes[1] || 0); GP.rx = dz(g.axes[2] || 0); GP.ry = dz(g.axes[3] || 0);
    const bv = i => (g.buttons[i] ? g.buttons[i].value : 0), bp = i => !!(g.buttons[i] && g.buttons[i].pressed), edge = i => bp(i) && !prevB[i];
    GP.lt = bv(6); GP.rt = bv(7);
    GP.btn = g.buttons.map(b => b.pressed);

    if (GP.wheelOpen && GP.wheelOpen()) { if (!wasWheel) { releaseAll(); camStep(false); } wasWheel = true; wheelStep(g); return; }
    if (wasWheel) { wasWheel = false; releaseAll(); prevB = g.buttons.map(b => b.pressed); return; }

    const root = menuRoot();
    if (root) { // menu ouvert : plus de touches de jeu
      if (held.size) releaseAll(); camStep(false);
      if (base !== 'none' && edge(9)) pause();
      navStep(root, now, g);
      prevB = g.buttons.map(b => b.pressed); return;
    }
    nav.root = null;
    if (base !== 'none' && edge(9)) pause();
    if (base === 'mo' && edge(12)) send('keydown', 'Tab'); // Start = pause ; croix haut = roue des véhicules (Tab maintenu jusqu'à A ou B)

    const p = profile(), w = new Map();
    camStep(!!p.cam);
    for (const [ax, neg, pos] of p.a || []) { const v = GP[ax]; if (v < -T) want(w, neg); else if (v > T) want(w, pos); }
    for (const [tr, code] of p.t || []) if (GP[tr] > 0.2) want(w, code);
    const b = Object.assign({}, COMMON, p.b); if (base === 'mo') delete b[12];
    if (base === 'plane' || (base === 'mo' && GP.sub && GP.sub() && GP.sub().cat === 'plane')) {
      // X : frein d'urgence, 2e appui : lâcher le parachute (F-35)
      delete b[2];
      if (edge(2)) { if (xTwice) tap('KeyJ'); else send('keydown', 'Space'); xTwice = !xTwice; }
      if (!bp(2) && prevB[2]) send('keyup', 'Space');
    }
    for (const i in b) if (bp(i)) want(w, b[i]);
    for (const [code, h] of held) if (!w.has(code)) { send('keyup', code, h.key); held.delete(code); }
    for (const [code, h] of w) {
      const cur = held.get(code);
      if (!cur) { send('keydown', code, h.key); held.set(code, { key: h.key, rep: h.rep, last: now }); }
      else if (cur.rep && now - cur.last > cur.rep) { send('keyup', code, cur.key); send('keydown', code, cur.key); cur.last = now; }
    }
    prevB = g.buttons.map(b => b.pressed);
  }
  addEventListener('blur', releaseAll);
  requestAnimationFrame(frame);
})();
