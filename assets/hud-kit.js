// HUD commun des jeux Three.js : bouton pause (haut gauche), boussole (haut centre), carte du terrain (haut droite).
// Branché par perf.js sur le renderer principal : aucun changement dans le code des jeux.
// Réglages par page, sur <html> : data-hk-skip="map compass pause" (éléments déjà fournis par le jeu),
// data-hk-pause="Escape" (touche envoyée par le bouton), data-hk-menu="sel1, sel2" (menus visibles = HUD masqué).
const SIZE = 168, RANGE = 120, TOP = 'calc(var(--ui-bar-h, 52px) + 8px)';
const CSS = `
.hk{position:fixed;z-index:3;color:#e8f1f5;font:700 12px/1 system-ui,sans-serif;pointer-events:none;transition:opacity .2s}
.hk.off{opacity:0;visibility:hidden}
#hk-pause{top:${TOP};left:max(12px,env(safe-area-inset-left,0px));width:38px;height:38px;border-radius:10px;background:rgba(10,16,22,.62);border:1px solid rgba(255,255,255,.25);color:#fff;font-size:13px;pointer-events:auto;cursor:pointer;backdrop-filter:blur(4px)}
#hk-pause:hover{background:rgba(40,60,80,.8)}
#hk-compass{top:${TOP};left:50%;transform:translateX(-50%);height:38px;padding:0 14px 0 4px;display:flex;align-items:center;gap:8px;border-radius:19px;background:rgba(10,16,22,.62);border:1px solid rgba(255,255,255,.2);backdrop-filter:blur(4px);white-space:nowrap}
#hk-compass b{font-size:15px;min-width:20px}
#hk-compass span{opacity:.75;font-variant-numeric:tabular-nums}
#hk-map{top:${TOP};right:max(12px,env(safe-area-inset-right,0px));width:${SIZE}px;height:${SIZE}px;border-radius:50%;border:2px solid rgba(255,255,255,.35);background:#14202a;box-shadow:0 4px 16px rgba(0,0,0,.45)}
`;
const CARD = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];
let done = false;

export function initHud(T, r, s) {
  if (done || r.domElement.clientWidth < 300) return;
  done = true;
  const root = document.documentElement.dataset;
  const skip = (root.hkSkip || '').split(/\s+/);
  const menuSel = root.hkMenu || (document.querySelector('script[data-menu]') || {}).dataset?.menu || ''; // par défaut : le menu de départ des jeux à bloc de présentation
  const key = root.hkPause || 'Escape';
  const style = document.head.appendChild(document.createElement('style'));
  style.textContent = CSS;
  const add = (tag, id) => { const e = document.body.appendChild(document.createElement(tag)); e.id = id; e.className = 'hk'; return e; };

  if (!skip.includes('pause')) {
    const b = add('button', 'hk-pause');
    b.textContent = '❚❚'; b.title = 'Pause (' + key.replace('Key', '') + ')'; b.setAttribute('aria-label', 'Pause');
    b.onclick = () => {
      if (typeof window.__pauseGame === 'function') { b.blur(); return window.__pauseGame(); } // pause propre au jeu (rail-express) ou image figée (jeux sans menu pause)
      const ev = t => new KeyboardEvent(t, { code: key, key: key.startsWith('Key') ? key.slice(3).toLowerCase() : key, bubbles: true });
      document.dispatchEvent(ev('keydown'));
      setTimeout(() => document.dispatchEvent(ev('keyup')), 90); // les jeux qui lisent l'état des touches par image ont besoin d'un appui visible
      b.blur();
    };
  }

  let rose, rctx, txt, deg, map, mctx;
  if (!skip.includes('compass')) {
    const c = add('div', 'hk-compass');
    rose = c.appendChild(document.createElement('canvas')); rose.width = rose.height = 36;
    rctx = rose.getContext('2d');
    txt = c.appendChild(document.createElement('b'));
    deg = c.appendChild(document.createElement('span'));
  }
  const tmp = { p: new T.Vector3(), d: new T.Vector3() };
  if (!skip.includes('map')) {
    map = add('canvas', 'hk-map'); map.width = map.height = SIZE;
    mctx = map.getContext('2d');
  }

  const visible = e => e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden' && getComputedStyle(e).opacity !== '0';
  let hx = 0, hz = -1, nextMap = 0;

  function tick() {
    const l = s.last; if (!l) return;
    const hide = document.hidden || (menuSel && [...document.querySelectorAll(menuSel)].some(visible));
    document.querySelectorAll('.hk').forEach(e => e.classList.toggle('off', hide));
    if (hide) return;
    const { p, d } = tmp;
    l.camera.getWorldPosition(p); l.camera.getWorldDirection(d);
    const n = Math.hypot(d.x, d.z);
    if (n > .3) { hx = d.x / n; hz = d.z / n; } // regard quasi vertical : on garde le dernier cap
    const a = Math.atan2(hx, -hz);
    if (rose) {
      const h = Math.round((a * 180 / Math.PI + 360) % 360);
      txt.textContent = CARD[Math.round(h / 45) % 8]; deg.textContent = String(h).padStart(3, '0') + '°';
      rctx.clearRect(0, 0, 36, 36); rctx.translate(18, 18); rctx.rotate(-a);
      rctx.strokeStyle = 'rgba(255,255,255,.5)'; rctx.lineWidth = 2; rctx.beginPath(); rctx.arc(0, 0, 14, 0, 7); rctx.stroke();
      rctx.fillStyle = '#ff5a4d'; rctx.beginPath(); rctx.moveTo(0, -14); rctx.lineTo(5, 0); rctx.lineTo(-5, 0); rctx.fill();
      rctx.fillStyle = '#fff'; rctx.beginPath(); rctx.moveTo(0, 14); rctx.lineTo(5, 0); rctx.lineTo(-5, 0); rctx.fill();
      rctx.setTransform(1, 0, 0, 1, 0, 0);
    }
    const now = performance.now();
    if (map && now >= nextMap) { drawMap(p, a); nextMap = now + 100; }
  }

  // minicarte volontairement sans détail : fond uni, flèche du véhicule, points blancs pour les autres (window.__hkDots() -> [{x, z}], nord = -Z)
  function drawMap(p, a) {
    const m = SIZE / 2, k = m / RANGE, cx = p.x + hx * 6, cz = p.z + hz * 6;
    mctx.clearRect(0, 0, SIZE, SIZE);
    mctx.fillStyle = '#18222b'; mctx.fillRect(0, 0, SIZE, SIZE);
    mctx.strokeStyle = 'rgba(255,255,255,.08)'; mctx.lineWidth = 1;
    for (const q of [.33, .66]) { mctx.beginPath(); mctx.arc(m, m, m * q, 0, 7); mctx.stroke(); }
    mctx.fillStyle = '#fff';
    for (const d of (window.__hkDots && window.__hkDots()) || []) {
      const x = m + (d.x - cx) * k, y = m + (d.z - cz) * k;
      if (Math.hypot(x - m, y - m) < m - 4) { mctx.beginPath(); mctx.arc(x, y, 3, 0, 7); mctx.fill(); }
    }
    mctx.save(); mctx.translate(m, m); mctx.rotate(a);
    mctx.fillStyle = '#ffd34d'; mctx.strokeStyle = '#000'; mctx.lineWidth = 1.5;
    mctx.beginPath(); mctx.moveTo(0, -11); mctx.lineTo(7, 8); mctx.lineTo(0, 4); mctx.lineTo(-7, 8); mctx.closePath(); mctx.fill(); mctx.stroke();
    mctx.restore();
    mctx.fillStyle = '#fff'; mctx.font = '700 11px system-ui'; mctx.textAlign = 'center'; mctx.fillText('N', m, 13);
  }

  setInterval(tick, 100);
}
