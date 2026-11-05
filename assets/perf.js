// Performance commune des jeux Three.js : plafond à 60 FPS et résolution adaptative (cible 30-60 FPS).
// patch(THREE) intercepte render/setPixelRatio, que WebGLRenderer définit sur chaque instance : aucun changement dans le code des jeux.
import { initHud } from './hud-kit.js';
const MIN_SCALE = 0.4, MAX_FPS = 60;

export function patch(T) {
  const P = T.WebGLRenderer.prototype;
  if (P.__perf) return;
  P.__perf = true;
  const S = new WeakMap(); // état par renderer : { base, scale, skip, avg, good, started }
  const state = r => S.get(r) || S.set(r, { base: 1, scale: 1, skip: false, avg: 16.7, good: 0, started: false }).get(r);

  // le constructeur fait this.render = fn : un setter sur le prototype reçoit la fonction et la remplace par une version enveloppée
  const wrap = (name, make) => Object.defineProperty(P, name, {
    configurable: true,
    set(fn) { Object.defineProperty(this, name, { value: make(this, fn), writable: true, configurable: true }); },
  });

  wrap('setPixelRatio', (r, setPR) => v => { const s = state(r); s.base = v; setPR.call(r, v * s.scale); });

  wrap('render', (r, render) => (...a) => {
    const s = state(r);
    s.raw = render;
    if (!s.started) start(r, s);
    if (r.hudView && !s.last) { s.last = r.hudView; initHud(T, r, s); } // jeu qui rend la scène hors écran (fpv-racer) : il fournit scène et caméra
    const [scene, cam] = a; // la scène la plus fournie rendue à l'écran sert de base à la carte du HUD commun
    if (scene && scene.isScene && cam && cam.isPerspectiveCamera && !r.getRenderTarget() && (!s.last || scene.children.length >= s.last.scene.children.length)) {
      s.last = { scene, camera: cam };
      initHud(T, r, s);
    }
    if (s.skip) return;
    return render.apply(r, a);
  });

  function start(r, s) {
    s.started = true;
    let prev = performance.now(), lastDraw = 0;
    (function tick(now) {
      requestAnimationFrame(tick);
      const dt = now - prev; prev = now;
      if (dt > 250 || document.hidden) return; // onglet en pause : on ignore
      s.skip = now - lastDraw < 1000 / MAX_FPS - 1.5; // écran > 60 Hz : une image sur deux
      if (!s.skip) lastDraw = now;
      s.avg += (dt - s.avg) * 0.08;
      if (s.avg > 1000 / 40 && s.scale > MIN_SCALE) { // sous 40 FPS : on baisse la résolution
        s.scale = Math.max(MIN_SCALE, s.scale - 0.1); s.avg = 16.7; s.good = 0; r.setPixelRatio(s.base);
      } else if (s.avg < 1000 / 55 && s.scale < 1) { // marge confortable : on remonte doucement
        if (++s.good > 240) { s.scale = Math.min(1, s.scale + 0.05); s.good = 0; r.setPixelRatio(s.base); }
      } else s.good = 0;
    })(prev);
  }
}
