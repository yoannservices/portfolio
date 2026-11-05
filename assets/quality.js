// Qualité graphique commune des jeux Three.js : distance d'affichage à 3 seuils (proche / moyen / rien), brouillard calé sur la coupure,
// camera.far réduit, ombres plus légères ou coupées, plafond 30 FPS. Branché par perf.js (aucun changement dans le code des jeux).
// Réglages sauvegardés dans localStorage. Échelle de distance par jeu : <html data-lod="3"> (défaut 1 ; un simulateur de vol met 8).
const KEY = 'site.quality.v1';
export const LEVELS = {
  haut: { name: 'Haut', d1: 140, d2: 700, shadow: 2048 },
  moyen: { name: 'Moyen', d1: 90, d2: 420, shadow: 1024 },
  bas: { name: 'Bas', d1: 55, d2: 240, shadow: 512 },
};
const ORDER = ['haut', 'moyen', 'bas'];
export const Q = { mode: 'auto', shadows: true, fps30: false, auto: 'haut' }; // mode : auto | haut | moyen | bas ; auto = niveau choisi selon les FPS
try { Object.assign(Q, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { /* stockage indisponible */ }
if (Q.mode !== 'auto' && !LEVELS[Q.mode]) Q.mode = 'auto';
Q.auto = 'haut';
const save = () => { try { localStorage.setItem(KEY, JSON.stringify({ mode: Q.mode, shadows: Q.shadows, fps30: Q.fps30 })); } catch (e) { /* ignoré */ } };

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
function sweep(root, cam, d1, d2, shadowsOn, lvl) {
  const cp = cam.matrixWorld.elements; const cx = cp[12], cy = cp[13], cz = cp[14];
  let skyR = 0;
  const visit = o => {
    if (o.isLight && o.shadow) lightShadow(o, shadowsOn, lvl);
    if (!o.visible && !o.__qHid) return; // masqué par le jeu : on ne touche pas à ses enfants
    if ((o.isMesh || o.isPoints || o.isLine) && o.geometry && !skipObj(o)) {
      const sp = sphereOf(o), m = matOf(o);
      if (sp) {
        const e = o.matrixWorld.elements, sc = Math.max(1e-6, Math.sqrt(Math.max(e[0] * e[0] + e[1] * e[1] + e[2] * e[2], e[4] * e[4] + e[5] * e[5] + e[6] * e[6], e[8] * e[8] + e[9] * e[9] + e[10] * e[10])));
        const r = sp.radius * sc;
        const px = e[0] * sp.center.x + e[4] * sp.center.y + e[8] * sp.center.z + e[12], py = e[1] * sp.center.x + e[5] * sp.center.y + e[9] * sp.center.z + e[13], pz = e[2] * sp.center.x + e[6] * sp.center.y + e[10] * sp.center.z + e[14];
        const dist = Math.sqrt((px - cx) ** 2 + (py - cy) ** 2 + (pz - cz) ** 2) - r;
        if (m && (m.side === 1 || m.fog === false) && r > 100) { if (r > skyR) skyR = r; if (o.__qHid) { o.visible = true; o.__qHid = false; } }
        else if (r > 0.35 * d2) { if (o.__qHid) { o.visible = true; o.__qHid = false; } } // trop grand pour être coupé (sol, circuit, montagne)
        else if (dist > d2) { if (!o.__qHid) { o.__qHid = true; o.visible = false; } }
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

function lightShadow(l, on, lvl) {
  if (l.castShadow && !on) { l.__qOff = true; l.castShadow = false; }
  else if (!l.castShadow && on && l.__qOff) { l.__qOff = false; l.castShadow = true; }
  const sh = l.shadow; if (!sh || !sh.mapSize) return;
  if (sh.__qMs === undefined) sh.__qMs = sh.mapSize.x;
  const t = Math.min(sh.__qMs, lvl.shadow);
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
  const lvl = level(), k = lodScale(), d1 = lvl.d1 * k, d2 = lvl.d2 * k;
  const key = lvl.d2 + (Q.shadows ? 'S' : 'N');
  let skyR = scene.__qSky || 0;
  if (++frame % 8 === 0 || last !== key || scene.__qLast !== key) {
    if (cam.matrixWorld) skyR = scene.__qSky = sweep(scene, cam, d1, d2, Q.shadows, lvl);
    scene.__qLast = last = key;
  }
  applyFog(T, scene, d2);
  applyFar(cam, d2, skyR);
}

// ---------- panneau « Graphismes » (bouton en bas à gauche) ----------
export function initPanel() {
  if (typeof document === 'undefined' || document.getElementById('q-panel')) return;
  const css = document.createElement('style');
  css.textContent = `#q-btn{position:fixed;left:8px;bottom:8px;z-index:99998;font:600 12px Inter,system-ui,sans-serif;color:var(--ui-text,#e5e7eb);background:rgba(15,17,21,.72);border:1px solid rgba(255,255,255,.18);border-radius:8px;padding:6px 10px;cursor:pointer;opacity:.55}
#q-btn:hover,#q-btn:focus-visible{opacity:1}
#q-panel{position:fixed;left:8px;bottom:44px;z-index:99999;width:min(280px,calc(100vw - 16px));font:13px Inter,system-ui,sans-serif;color:var(--ui-text,#e5e7eb);background:rgba(15,17,21,.94);border:1px solid rgba(255,255,255,.18);border-radius:12px;padding:12px;display:none}
#q-panel.on{display:block}#q-panel h3{margin:0 0 8px;font-size:13px}#q-panel .r{display:flex;gap:6px;margin:6px 0;flex-wrap:wrap;align-items:center;justify-content:space-between}
#q-panel button{font:inherit;color:inherit;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.16);border-radius:6px;padding:4px 9px;cursor:pointer}
#q-panel button.sel{background:var(--ui-accent,#22c55e);color:#04130a;border-color:transparent;font-weight:700}#q-panel small{opacity:.65;display:block;margin-top:6px;line-height:1.35}`;
  document.head.appendChild(css);
  const btn = document.createElement('button'); btn.id = 'q-btn'; btn.type = 'button'; btn.textContent = '⚙ Graphismes'; btn.setAttribute('aria-label', 'Réglages graphiques');
  const p = document.createElement('div'); p.id = 'q-panel';
  const draw = () => {
    const b = (cls, label, on) => `<button type="button" class="${on ? 'sel' : ''}" data-${cls}>${label}</button>`;
    p.innerHTML = `<h3>Graphismes</h3>
<div class="r"><span>Qualité</span><span>${[['auto', 'Auto'], ...ORDER.map(m => [m, LEVELS[m].name])].map(([m, n]) => `<button type="button" class="${Q.mode === m ? 'sel' : ''}" data-mode="${m}">${n}</button>`).join(' ')}</span></div>
<div class="r"><span>Ombres</span><span>${b('sh="1"', 'Oui', Q.shadows)} ${b('sh="0"', 'Non', !Q.shadows)}</span></div>
<div class="r"><span>Limite d'images</span><span>${b('fps="60"', '60 FPS', !Q.fps30)} ${b('fps="30"', '30 FPS', Q.fps30)}</span></div>
<small>La qualité règle la distance d'affichage (proche, moyen, rien), le brouillard, la portée de la caméra et la taille des ombres. Auto s'adapte aux FPS.${Q.mode === 'auto' ? ' Niveau actuel : ' + LEVELS[Q.auto].name + '.' : ''}</small>`;
  };
  p.addEventListener('click', e => {
    const t = e.target.closest('button'); if (!t) return;
    if (t.dataset.mode) Q.mode = t.dataset.mode; else if (t.dataset.sh) Q.shadows = t.dataset.sh === '1'; else if (t.dataset.fps) Q.fps30 = t.dataset.fps === '30';
    save(); draw();
  });
  btn.addEventListener('click', () => { draw(); p.classList.toggle('on'); });
  for (const ev of ['keydown', 'keyup']) p.addEventListener(ev, e => e.stopPropagation());
  document.body.append(btn, p);
}
if (typeof document !== 'undefined') { if (document.body) initPanel(); else addEventListener('DOMContentLoaded', initPanel); }
