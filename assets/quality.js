// Qualité graphique commune des jeux Three.js : distance d'affichage à 3 seuils (proche / moyen / rien), brouillard calé sur la coupure,
// camera.far réduit, ombres plus légères ou coupées, plafond 30 FPS. Branché par perf.js (aucun changement dans le code des jeux).
// Réglages sauvegardés dans localStorage. Échelle de distance par jeu : <html data-lod="3"> (défaut 1 ; un simulateur de vol met 8).
const KEY = 'site.quality.v2'; // v2 : tout le monde repart en qualité Moyen
export const LEVELS = {
  // tex : plus grand côté des textures (px) ; aniso : filtrage anisotrope ; pr : plafond du pixelRatio (perf.js) ;
  // near : distance (m) en deçà de laquelle une zone K.lodCity montre ses bâtiments détaillés ; détail des bâtiments du kit lu au
  // chargement par building-kit.js (Haut et Moyen : complet, Bas : simplifié seulement)
  haut: { name: 'Haut', d1: 140, d2: 700, shadow: 2048, tex: Infinity, aniso: 8, pr: 2, near: 120 },
  moyen: { name: 'Moyen', d1: 90, d2: 420, shadow: 1024, tex: 1024, aniso: 4, pr: 1.5, near: 90 },
  bas: { name: 'Bas', d1: 55, d2: 240, shadow: 512, tex: 512, aniso: 1, pr: 1, simple: true }, // simple : matériaux Lambert (voir lambertOf)
};
const ORDER = ['haut', 'moyen', 'bas'];
export const Q = { mode: 'moyen', shadows: true, fps30: false, auto: 'haut', dist: 'normal', small: true, guide: 'both' }; // mode : auto | haut | moyen | bas ; auto = niveau choisi selon les FPS
try { Object.assign(Q, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { /* stockage indisponible */ }
if (Q.mode !== 'auto' && !LEVELS[Q.mode]) Q.mode = 'moyen';
const DIST = { court: 0.6, normal: 1, long: 1.6 };
if (!DIST[Q.dist]) Q.dist = 'normal';
if (!['both', 'haut', 'sol', 'none'].includes(Q.guide)) Q.guide = 'both';
Q.auto = 'haut';
export const save = () => { try { localStorage.setItem(KEY, JSON.stringify({ mode: Q.mode, shadows: Q.shadows, fps30: Q.fps30, dist: Q.dist, small: Q.small, guide: Q.guide })); } catch (e) { /* ignoré */ } };

export const level = () => LEVELS[Q.mode === 'auto' ? Q.auto : Q.mode];
export const maxFps = () => (Q.fps30 ? 30 : 60);
const lodScale = () => { const v = typeof document !== 'undefined' ? parseFloat(document.documentElement.dataset.lod) : NaN; return v > 0 ? v : 1; };

// Mode auto : si la résolution est déjà au plus bas et que ça rame encore, on raccourcit les distances ; quand tout va bien longtemps, on les rallonge.
let slow = 0, fast = 0;
export function autoTick(avgMs, resScale, dtMs) {
  if (Q.mode !== 'auto') return;
  if (avgMs > 1000 / 38 && resScale <= 0.6) { slow += dtMs; fast = 0; } else if (avgMs < 1000 / 56 && resScale >= 0.99) { fast += dtMs; slow = 0; } else { slow = Math.max(0, slow - dtMs); fast = Math.max(0, fast - dtMs); }
  const i = ORDER.indexOf(Q.auto);
  if (slow > 3000 && i < 2) { Q.auto = ORDER[i + 1]; slow = 0; }
  else if (fast > 20000 && i > 0) { Q.auto = ORDER[i - 1]; fast = 0; }
}

// ---------- état par objet (propriétés préfixées __q : jamais écrasées par les jeux) ----------
const skipObj = o => o.isSkinnedMesh || o.isSprite || (o.userData && o.userData.noLod);
const matOf = o => (Array.isArray(o.material) ? o.material[0] : o.material);

function sphereOf(o) {
  const g = o.geometry; if (!g) return null;
  let s = o.isInstancedMesh && o.boundingSphere !== undefined ? (o.boundingSphere || (o.computeBoundingSphere(), o.boundingSphere)) : (g.boundingSphere || (g.computeBoundingSphere(), g.boundingSphere));
  return s;
}

// Parcours (toutes les 8 images) : distance à la caméra -> proche / moyen (sans ombre projetée) / loin (masqué). Retourne le rayon du plus grand ciel détecté.
function sweep(T, root, cam, d1, d2, shadowsOn, lvl, small) {
  const cp = cam.matrixWorld.elements; const cx = cp[12], cy = cp[13], cz = cp[14];
  let skyR = 0;
  const visit = o => {
    if (o.isLight && o.shadow) lightShadow(o, shadowsOn, lvl);
    if (!o.visible && !o.__qHid) return; // masqué par le jeu : on ne touche pas à ses enfants
    if ((o.isMesh || o.isPoints || o.isLine) && o.geometry && !skipObj(o)) {
      const sp = sphereOf(o), m = matOf(o);
      if (o.isMesh && o.material && !o.isSprite) matSwap(T, o, !!lvl.simple);
      if (Array.isArray(o.material)) for (const x of o.material) matLevel(x, lvl); else matLevel(o.material, lvl);
      if (sp) {
        const e = o.matrixWorld.elements, sc = Math.max(1e-6, Math.sqrt(Math.max(e[0] * e[0] + e[1] * e[1] + e[2] * e[2], e[4] * e[4] + e[5] * e[5] + e[6] * e[6], e[8] * e[8] + e[9] * e[9] + e[10] * e[10])));
        const r = sp.radius * sc;
        const px = e[0] * sp.center.x + e[4] * sp.center.y + e[8] * sp.center.z + e[12], py = e[1] * sp.center.x + e[5] * sp.center.y + e[9] * sp.center.z + e[13], pz = e[2] * sp.center.x + e[6] * sp.center.y + e[10] * sp.center.z + e[14];
        const dist = Math.sqrt((px - cx) ** 2 + (py - cy) ** 2 + (pz - cz) ** 2) - r;
        const lod = o.userData && o.userData.lod, lc = lod && o.userData.lodC;
        if (lod && (lod === 'near') !== (Math.hypot(lc[0] - cx, lc[1] - cz) - lc[2] < (lvl.near || 0) * DIST[Q.dist])) { if (!o.__qHid) { o.__qHid = true; o.visible = false; } } // zone de ville : version détaillée de près, simplifiée de loin
        else if (m && (m.side === 1 || m.fog === false) && r > 100) { if (r > skyR) skyR = r; if (o.__qHid) { o.visible = true; o.__qHid = false; } }
        // trop grand pour être coupé (sol, circuit, montagne), ou déclaré toujours dessiné par le jeu (frustumCulled = false : trafic instancié, jets d'eau,
        // particules dont la sphère, calculée une fois à vide, ne suit pas le contenu qui bouge)
        else if (r > 0.35 * d2 || o.frustumCulled === false) { if (o.__qHid) { o.visible = true; o.__qHid = false; } }
        else if (dist > d2 || (!small && r < 1 && dist > d1 * 0.6)) { if (!o.__qHid) { o.__qHid = true; o.visible = false; } }
        else {
          if (o.__qHid) { o.visible = true; o.__qHid = false; }
          if (dist > d1) { if (o.castShadow && o.__qCs === undefined) { o.__qCs = true; o.castShadow = false; } }
          else if (o.__qCs) { o.castShadow = true; o.__qCs = undefined; }
        }
      }
    }
    const ch = o.children; for (let i = 0; i < ch.length; i++) visit(ch[i]);
  };
  visit(root);
  return skyR;
}

// Taille des textures : image réduite sur une copie (originale gardée pour remonter de niveau). Textures redessinées par le jeu
// (vidéo, données, ou version qui bouge après notre copie : cadrans, cartes) rendues à l'original et laissées telles quelles. Retourne false si l'image n'est pas encore là.
const TEX_KEYS = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'bumpMap', 'aoMap', 'emissiveMap', 'alphaMap', 'displacementMap', 'specularMap', 'lightMap', 'clearcoatNormalMap'];
const isImg = i => i && i.width > 0 && ((typeof HTMLImageElement !== 'undefined' && i instanceof HTMLImageElement && i.complete) || (typeof HTMLCanvasElement !== 'undefined' && i instanceof HTMLCanvasElement) || (typeof ImageBitmap !== 'undefined' && i instanceof ImageBitmap));
function texLevel(t, lvl) {
  if (!t || t.__qSkip || t.__qLvl === lvl) return true;
  if (t.isVideoTexture || t.isDataTexture || t.isCompressedTexture || t.isCubeTexture || t.isRenderTargetTexture || t.isFramebufferTexture) { t.__qSkip = true; return true; }
  if (t.__qImg && t.version !== t.__qVer) { t.image = t.__qImg; t.__qImg = null; t.__qSkip = true; t.needsUpdate = true; return true; } // le jeu redessine cette texture
  const src = t.__qImg || t.image;
  if (!isImg(src)) return !!(src && src.data) || typeof document === 'undefined'; // pas encore chargée : on réessaiera
  t.__qLvl = lvl; t.anisotropy = lvl.aniso;
  const k = Math.min(1, lvl.tex / Math.max(src.width, src.height));
  if (k < 1) {
    const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(src.width * k)); c.height = Math.max(1, Math.round(src.height * k));
    c.getContext('2d').drawImage(src, 0, 0, c.width, c.height); t.__qImg = src; t.image = c;
  } else if (t.__qImg) { t.image = t.__qImg; t.__qImg = null; }
  t.needsUpdate = true; t.__qVer = t.version;
  return true;
}
function matLevel(m, lvl) {
  if (!m || m.__qLvl === lvl) return;
  let done = true;
  for (const k of TEX_KEYS) if (m[k] && !texLevel(m[k], lvl)) done = false;
  if (done) m.__qLvl = lvl;
}

// Bas : MeshStandard/Physical remplacés par une copie Lambert (éclairage bien moins coûteux par pixel : -35 % mesuré sur un GPU intégré).
// Couleurs partagées (mêmes objets Color) ; valeurs simples recopiées dans les deux sens à chaque parcours, donc le jeu peut modifier
// l'un ou l'autre (nuit, feux stop) ; matériaux à shader modifié (onBeforeCompile) laissés tels quels. Retour à l'original au-dessus de Bas.
const SYNC = ['map', 'emissiveMap', 'alphaMap', 'emissiveIntensity', 'opacity', 'transparent', 'visible', 'alphaTest', 'side', 'depthWrite', 'depthTest', 'colorWrite', 'vertexColors', 'polygonOffset', 'polygonOffsetFactor', 'polygonOffsetUnits', 'fog', 'wireframe', 'toneMapped'];
const RECOMPILE = new Set(['vertexColors', 'transparent', 'fog', 'alphaTest']);
const lam = new WeakMap(), lamLive = new Set();
function lambertOf(T, m) {
  let l = lam.get(m);
  if (l === undefined) {
    l = m.onBeforeCompile !== T.Material.prototype.onBeforeCompile || (m.userData && m.userData.noLod) ? null : new T.MeshLambertMaterial({ flatShading: m.flatShading });
    if (l) {
      l.name = m.name; l.color = m.color; l.emissive = m.emissive; l.__qSrc = m; l.__qLam = true; l.__qS = {};
      for (const k of SYNC) l.__qS[k] = l[k] = m[k];
      if (m.transmission > 0) { l.transparent = true; l.opacity = Math.min(m.opacity, 0.45); } // verre à transmission : rendu en simple transparence
    }
    lam.set(m, l);
  }
  return l;
}
function syncLam(l) {
  const m = l.__qSrc, s = l.__qS, glass = m.transmission > 0; let nu = false;
  for (const k of SYNC) {
    if (glass && (k === 'opacity' || k === 'transparent')) continue;
    if (l[k] !== s[k]) m[k] = l[k]; // le jeu a modifié la copie
    else if (m[k] !== l[k]) { if (RECOMPILE.has(k) || (k.endsWith('ap') && !m[k] !== !l[k])) nu = true; l[k] = m[k]; } // ... ou l'original
    s[k] = l[k];
  }
  if (nu) l.needsUpdate = true;
}
function matSwap(T, o, simple) {
  const m = o.material;
  if (Array.isArray(m)) {
    if (simple && m !== o.__qArrL) { const a = m.map(x => (x && x.isMeshStandardMaterial && lambertOf(T, x)) || x); if (a.some((x, i) => x !== m[i])) { o.__qArr = m; o.material = o.__qArrL = a; a.forEach(x => x.__qLam && lamLive.add(x)); } }
    else if (!simple && o.__qArr && m === o.__qArrL) { o.material = o.__qArr; o.__qArr = o.__qArrL = null; }
  } else if (simple) { if (m.isMeshStandardMaterial) { const l = lambertOf(T, m); if (l) { o.material = l; lamLive.add(l); } } }
  else if (m.__qLam) o.material = m.__qSrc;
}

function lightShadow(l, on, lvl) {
  if (l.castShadow && !on) { l.__qOff = true; l.castShadow = false; }
  else if (!l.castShadow && on && l.__qOff) { l.__qOff = false; l.castShadow = true; }
  const sh = l.shadow; if (!sh || !sh.mapSize) return;
  if (sh.__qMs === undefined) sh.__qMs = sh.mapSize.x;
  const cap = parseInt(typeof document !== 'undefined' ? document.documentElement.dataset.shadow : '') || 0; // <html data-shadow="2048"> : taille d'ombre voulue par le jeu (au lieu de celle du niveau)
  const t = Math.min(sh.__qMs, lvl === LEVELS.bas ? lvl.shadow : cap || lvl.shadow);
  if (sh.mapSize.x !== t) { sh.mapSize.set(t, t); if (sh.map) { sh.map.dispose(); sh.map = null; } }
}

function applyFog(T, scene, d2) {
  let f = scene.fog;
  if (!f) { // pas de brouillard : un léger brouillard de la couleur du fond, seulement si le fond est une couleur unie
    if (!(scene.background && scene.background.isColor)) return;
    f = scene.fog = new T.Fog(scene.background.clone(), d2 * 0.55, d2); f.__q = { far: d2, near: d2 * 0.55, wf: d2, wn: d2 * 0.55, mine: true }; return;
  }
  const st = f.__q || (f.__q = { far: f.far, near: f.near, density: f.density, wf: f.far, wn: f.near, wd: f.density });
  if (f.isFog) {
    if (f.far !== st.wf) { st.far = f.far; st.near = f.near; } // le jeu (météo) a réécrit le brouillard : c'est la nouvelle référence
    const far = Math.min(st.far, d2), near = Math.min(st.near, far * 0.55);
    f.far = st.wf = far; f.near = st.wn = near;
  } else if (f.isFogExp2) {
    if (f.density !== st.wd) st.density = f.density;
    f.density = st.wd = Math.max(st.density, 2 / d2);
  }
}

function applyFar(cam, d2, skyR) {
  const st = cam.__q || (cam.__q = { far: cam.far, set: cam.far });
  if (cam.far !== st.set) st.far = cam.far; // le jeu a changé la portée
  const target = Math.max(Math.min(st.far, d2 * 1.2), skyR * 1.8, cam.near * 10);
  const t = Math.min(st.far, target);
  if (Math.abs(cam.far - t) > 1) { cam.far = st.set = t; cam.updateProjectionMatrix(); }
}

let frame = 0, last = null;
// Appelée par perf.js avant chaque rendu écran d'une scène avec une caméra perspective.
export function frameUpdate(T, scene, cam) {
  const lvl = level(), k = lodScale() * DIST[Q.dist], d1 = lvl.d1 * k, d2 = lvl.d2 * k;
  const key = lvl.d2 + Q.dist + (Q.shadows ? 'S' : 'N') + (Q.small ? 'P' : 'x');
  let skyR = scene.__qSky || 0;
  if (++frame % 8 === 0 || last !== key || scene.__qLast !== key) {
    if (cam.matrixWorld) skyR = scene.__qSky = sweep(T, scene, cam, d1, d2, Q.shadows, lvl, Q.small);
    for (const l of lamLive) syncLam(l);
    scene.__qLast = last = key;
  }
  applyFog(T, scene, d2);
  applyFar(cam, d2, skyR);
}

// ---------- panneau « Réglages » (bouton en bas à gauche + bouton « Réglages » des menus, via window.GameSettings.open()) ----------
// Guidage : <html data-guide="1"> sur les jeux qui ont une aide à la conduite ; ils lisent GameSettings.guide ('haut' | 'sol' | 'both') et l'événement 'gamesettings'.
export function initPanel() {
  if (typeof document === 'undefined' || document.getElementById('q-panel')) return;
  const css = document.createElement('style');
  css.textContent = `#q-panel{position:fixed;inset:0;z-index:100000;display:none;place-items:center;background:rgba(8,10,14,.72);font:14px Inter,system-ui,sans-serif;color:var(--ui-text,#e5e7eb)}
#q-panel.on{display:grid}#q-panel .q-card{width:min(460px,calc(100vw - 24px));max-height:calc(100vh - 24px);overflow:auto;background:var(--ui-surface,#0f1115);border:1px solid rgba(255,255,255,.18);border-top:3px solid var(--ui-accent,#22c55e);border-radius:12px;padding:18px 20px}
#q-panel h3{margin:0 0 10px;font-size:18px}#q-panel .r{display:flex;gap:6px 10px;margin:9px 0;flex-wrap:wrap;align-items:center;justify-content:space-between}#q-panel .r>span:first-child{font-weight:600}
#q-panel button{font:inherit;color:inherit;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.16);border-radius:6px;padding:5px 10px;cursor:pointer}
#q-panel button.sel{background:var(--ui-accent,#22c55e);color:#04130a;border-color:transparent;font-weight:700}#q-panel small{opacity:.65;display:block;margin-top:8px;line-height:1.35}
#q-panel .q-close{width:100%;margin-top:12px;padding:9px}`;
  document.head.appendChild(css);
  const p = document.createElement('div'); p.id = 'q-panel';
  const hasGuide = () => ['1', 'sol'].includes(document.documentElement.dataset.guide); // 'sol' : jeu qui n'a que le tracé au sol (Rally Masters, Drift King : le virage suivant est dans leur HUD)
  const guideOnly = () => document.documentElement.dataset.guide === 'sol';
  const eff = () => (guideOnly() ? (Q.guide === 'none' ? 'none' : 'sol') : Q.guide); // mode réellement appliqué
  const seg = (key, opts, cur) => opts.map(([v, n]) => `<button type="button" class="${String(cur) === String(v) ? 'sel' : ''}" data-k="${key}" data-v="${v}">${n}</button>`).join(' ');
  const draw = () => {
    p.innerHTML = `<div class="q-card"><h3>Réglages</h3>
<div class="r"><span>Qualité graphique</span><span>${seg('mode', [['auto', 'Auto'], ...ORDER.map(m => [m, LEVELS[m].name])], Q.mode)}</span></div>
<div class="r"><span>Ombres</span><span>${seg('shadows', [[1, 'Oui'], [0, 'Non']], +Q.shadows)}</span></div>
<div class="r"><span>Distance d'affichage</span><span>${seg('dist', [['court', 'Courte'], ['normal', 'Normale'], ['long', 'Longue']], Q.dist)}</span></div>
<div class="r"><span>Petits objets lointains</span><span>${seg('small', [[1, 'Oui'], [0, 'Non']], +Q.small)}</span></div>
<div class="r"><span>Limite d'images</span><span>${seg('fps30', [[0, '60 FPS'], [1, '30 FPS']], +Q.fps30)}</span></div>
${hasGuide() ? `<div class="r"><span>Guidage de conduite</span><span>${seg('guide', guideOnly() ? [['sol', 'Tracé au sol'], ['none', 'Rien']] : [['haut', 'Flèche en haut'], ['sol', 'Tracé au sol'], ['both', 'Les deux'], ['none', 'Rien']], eff())}</span></div>` : ''}
<small>Auto s'adapte aux FPS${Q.mode === 'auto' ? ' (niveau actuel : ' + LEVELS[Q.auto].name + ')' : ''}. La qualité règle la distance d'affichage, le brouillard, la portée de la caméra, la taille des ombres et des textures, la résolution et (Bas) des matériaux plus simples ; les bâtiments détaillés (Haut et Moyen) changent au prochain chargement. Réglages gardés sur cet appareil.</small>
<button type="button" class="q-close" data-close>Fermer</button></div>`;
  };
  p.addEventListener('click', e => {
    if (e.target === p || e.target.closest('[data-close]')) { p.classList.remove('on'); return; }
    const t = e.target.closest('button[data-k]'); if (!t) return;
    const k = t.dataset.k, v = t.dataset.v;
    if (k === 'mode' || k === 'dist' || k === 'guide') Q[k] = v; else if (k === 'shadows' || k === 'small') Q[k] = v === '1'; else Q.fps30 = v === '1';
    save(); draw(); dispatchEvent(new CustomEvent('gamesettings', { detail: { ...Q } }));
  });
  const open = () => { draw(); p.classList.add('on'); };
  for (const ev of ['keydown', 'keyup']) p.addEventListener(ev, e => { e.stopPropagation(); if (ev === 'keydown' && e.code === 'Escape') p.classList.remove('on'); });
  document.body.append(p);
  // Guidage. arrow(rel, label) : flèche en haut de l'écran ; rel = angle (rad) de la cible par rapport au cap, positif = à gauche ; arrow(null) la cache.
  // Visible si Guidage = « Flèche en haut » ou « Les deux ». ground(T, scene) : tracé de chevrons au sol (« Tracé au sol » ou « Les deux »).
  let ar = null, arLbl = null;
  const arrow = (rel, label) => {
    if (rel == null || Q.guide === 'sol' || Q.guide === 'none') { if (ar) ar.style.display = 'none'; return; }
    if (!ar) {
      ar = document.createElement('div'); ar.setAttribute('aria-hidden', 'true');
      ar.style.cssText = 'position:fixed;top:20vh;left:50%;margin-left:-30px;opacity:.92;width:60px;z-index:5;pointer-events:none;text-align:center;font:700 12px Inter,system-ui,sans-serif;color:#fff;text-shadow:0 1px 3px #000';
      ar.innerHTML = '<svg viewBox="0 0 64 64" width="60" height="60" style="display:block;filter:drop-shadow(0 2px 4px #000a)"><path d="M32 3 L57 31 H41 V61 H23 V31 H7 Z" fill="#22c55e" stroke="#fff" stroke-width="3" stroke-linejoin="round"/></svg><span></span>';
      arLbl = ar.querySelector('span'); ar._svg = ar.querySelector('svg'); document.body.append(ar);
    }
    ar.style.display = 'block'; ar._svg.style.transform = `rotate(${-rel}rad)`; arLbl.textContent = label || '';
    clearTimeout(ar._t); ar._t = setTimeout(() => { ar.style.display = 'none'; }, 600); // plus d'appel (pause, menu) : la flèche disparaît
  };
  // Tracé au sol : T = le THREE du jeu (jamais importé ici : r149, r186 ou copie locale selon le jeu). update(pts) reçoit la ligne devant le véhicule [{x, y, z}, ...].
  const ground = (T, scene) => {
    const N = 30, STEP = 4;
    const sh = new T.Shape(); sh.moveTo(-1.1, -0.5); sh.lineTo(0, 0.3); sh.lineTo(1.1, -0.5); sh.lineTo(1.1, -1); sh.lineTo(0, -0.2); sh.lineTo(-1.1, -1); sh.closePath();
    const geo = new T.ShapeGeometry(sh).rotateX(-Math.PI / 2).translate(0, 0.12, 0);
    const mat = new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -8 });
    const mesh = new T.InstancedMesh(geo, mat, N); mesh.frustumCulled = false; mesh.renderOrder = 20; mesh.userData.noLod = true; mesh.visible = false;
    mesh.setColorAt(0, new T.Color(0, 0, 0)); scene.add(mesh);
    const m = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), one = new T.Vector3(1, 1, 1), p = new T.Vector3(), c = new T.Color();
    return {
      mesh,
      update(pts, t) {
        const on = eff() === 'sol' || eff() === 'both';
        mesh.visible = on && !!pts && pts.length > 1; if (!mesh.visible) return;
        let seg = 0, left = 0, n = 0; // un chevron tous les STEP mètres le long de la ligne
        while (n < N && seg < pts.length - 1) {
          const a = pts[seg], b = pts[seg + 1], dx = b.x - a.x, dz = b.z - a.z, l = Math.hypot(dx, dz);
          if (l < 1e-6) { seg++; continue; }
          if (left <= l) {
            const u = left / l; p.set(a.x + dx * u, (a.y || 0) + ((b.y || 0) - (a.y || 0)) * u, a.z + dz * u);
            m.compose(p, q.setFromEuler(e.set(0, Math.atan2(-dx, -dz), 0)), one); mesh.setMatrixAt(n, m);
            const k = (1 - (n / N) ** 2) * (0.65 + 0.35 * Math.sin((t || 0) * 5.5 - n * 0.9)); mesh.setColorAt(n, c.setRGB(0.05 * k, 1.0 * k, 0.3 * k)); n++; left += STEP;
          } else { left -= l; seg++; }
        }
        for (; n < N; n++) { m.compose(p.set(0, -9999, 0), q.identity(), one); mesh.setMatrixAt(n, m); }
        mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      },
      dispose() { mesh.removeFromParent(); geo.dispose(); mat.dispose(); },
    };
  };
  // Pied de menu commun (menus de départ ET de pause) : bouton Réglages, puis les commandes en deux blocs.
  // data-controls (balise loader.js) : lignes « touche : action » séparées par |, une ligne « # Titre » ouvre un bloc.
  const foot = () => {
    const f = document.createElement('div'); f.className = 'hk-foot';
    const b = document.createElement('button'); b.type = 'button'; b.className = 'hk-btn hk-set'; b.textContent = '⚙ Réglages'; b.onclick = e => { e.stopPropagation(); open(); };
    f.append(b);
    let keys = null;
    for (const line of ((document.querySelector('script[data-controls]') || {}).dataset?.controls || 'Commandes').split('|').filter(Boolean)) {
      if (line.startsWith('#') || !keys) {
        const h = document.createElement('h3'); h.className = 'hk-foot__title'; h.textContent = line.startsWith('#') ? line.slice(1).trim() : 'Commandes';
        keys = document.createElement('div'); keys.className = 'hk-brief__keys'; f.append(h, keys); if (line.startsWith('#')) continue;
      }
      const i = line.indexOf(':'), row = document.createElement('div'); row.className = 'hk-brief__key';
      const k = document.createElement('kbd'); k.textContent = i < 0 ? '' : line.slice(0, i).trim();
      const a = document.createElement('span'); a.textContent = (i < 0 ? line : line.slice(i + 1)).trim();
      row.append(k, a); keys.append(row);
    }
    return f;
  };
  // Menu de pause (touche Échap ou bouton ❚❚) : tout menu qui contient un bouton « Reprendre » reçoit le même cadre et le même pied (Réglages + commandes).
  const injectPause = () => {
    for (const b of document.querySelectorAll('button')) {
      if (!/^\s*(▶\s*)?Reprendre/i.test(b.textContent) || !b.getClientRects().length || b.closest('#q-panel')) continue;
      const card = b.closest('.hk-card,.card,.panel,.pause-panel,.in,[role=dialog]') || b.parentElement.parentElement;
      if (!card || card.querySelector('.hk-foot')) continue;
      card.classList.add('hk-card');
      if (card.parentElement && card.parentElement !== document.body) card.parentElement.classList.add('hk-scrim');
      for (const x of card.querySelectorAll('button')) if (!x.closest('.hk-foot') && !x.parentElement.closest('[class*="grid"],[class*="opt"],[class*="seg"],[class*="tabs"],nav,header')) x.classList.add('hk-btn');
      card.append(foot());
    }
  };
  const slots = () => { for (const e of document.querySelectorAll('[data-foot]')) if (!e.firstChild) e.append(foot()); }; // pages à menu fait main (FPV, Sky Pilot)
  setInterval(() => { injectPause(); slots(); }, 400);
  if (!document.getElementById('hk-menu-css')) document.head.append(Object.assign(document.createElement('link'), { id: 'hk-menu-css', rel: 'stylesheet', href: (import.meta.url ? new URL('game-menu.css', import.meta.url) : new URL('../../assets/game-menu.css', location.href)).href }  /* bus : bundle iife, import.meta vide */));
  // Écran de départ commun pour les jeux sans menu de départ (<html data-start="1"> : Steep Peaks, Déneigeur) : titre, description, bouton Jouer, Réglages, commandes.
  if (document.documentElement.dataset.start === '1') {
    const L = document.querySelector('script[data-name]') || { dataset: {} };
    const show = () => {
      if (document.getElementById('hk-start')) return;
      const ov = document.createElement('div'); ov.id = 'hk-start'; ov.className = 'hk-scrim';
      ov.style.cssText = 'position:fixed;inset:0;z-index:99990;display:grid;place-items:center;overflow:auto;padding:16px';
      const card = document.createElement('div'); card.className = 'hk-card'; card.style.cssText = 'width:min(640px,100%);max-height:100%;overflow:auto';
      const brief = document.createElement('div'); brief.className = 'hk-brief';
      const h = document.createElement('h1'); h.textContent = L.dataset.name || document.title;
      const d = document.createElement('p'); d.textContent = L.dataset.description || '';
      brief.append(h, d);
      const go = document.createElement('button'); go.type = 'button'; go.className = 'hk-btn hk-primary'; go.textContent = 'Jouer'; go.style.width = '100%';
      const block = e => { if (e.code !== 'Escape') e.stopImmediatePropagation(); }; // le jeu tourne derrière : pas de touche tant que l'écran est là
      const close = () => { ov.remove(); removeEventListener('keydown', block, true); removeEventListener('keyup', block, true); };
      go.onclick = close;
      card.append(brief, go, foot()); ov.append(card); document.body.append(ov);
      addEventListener('keydown', block, true); addEventListener('keyup', block, true);
      go.focus();
    };
    if (document.getElementById('game-loader')) addEventListener('game-ready', show, { once: true }); else show();
  }
  window.GameSettings = { Q, open, close: () => p.classList.remove('on'), arrow, ground, foot, get guide() { return eff(); } };
}
if (typeof document !== 'undefined') { if (document.body) initPanel(); else addEventListener('DOMContentLoaded', initPanel); }
