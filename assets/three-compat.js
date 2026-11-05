// Charge Three.js (dernière version) pour les jeux écrits en scripts classiques (ancien style r128).
// Expose window.THREE puis charge, dans l'ordre, les scripts de data-scripts (chemins relatifs à la page).
// Compat r128 : encodages, intensités de lumière (rendu physique depuis r155), ombres PCF.
import * as T from 'https://cdn.jsdelivr.net/npm/three@0.186.1/build/three.module.js';
import { patch } from './perf.js';
patch(T);

// anciens réglages de lumière -> rendu physique : ambiante/directe/hémisphère x pi, ponctuelle/spot x 4pi
function scaled(Base, k, defaults) {
  return class extends Base {
    constructor(...a) {
      super(...a);
      let raw = this.intensity;
      Object.defineProperty(this, 'intensity', { get: () => raw * k, set: v => { raw = v; }, configurable: true, enumerable: true });
      if (defaults && a[defaults.i] === undefined) this.decay = 1; // r128 : decay = 1 par défaut
    }
  };
}

const sRGB = 3001, linear = 3000;
const colorSpaceProp = (get, set) => ({ get, set, configurable: true });
Object.defineProperty(T.Texture.prototype, 'encoding', colorSpaceProp(
  function () { return this.colorSpace === T.SRGBColorSpace ? sRGB : linear; },
  function (v) { this.colorSpace = v === sRGB ? T.SRGBColorSpace : T.NoColorSpace; this.needsUpdate = true; }
));
Object.defineProperty(T.WebGLRenderer.prototype, 'outputEncoding', colorSpaceProp(
  function () { return this.outputColorSpace === T.SRGBColorSpace ? sRGB : linear; },
  function (v) { this.outputColorSpace = v === sRGB ? T.SRGBColorSpace : T.LinearSRGBColorSpace; }
));

window.THREE = {
  ...T,
  sRGBEncoding: sRGB,
  LinearEncoding: linear,
  PCFSoftShadowMap: T.PCFShadowMap, // PCFSoftShadowMap est déprécié
  AmbientLight: scaled(T.AmbientLight, Math.PI),
  DirectionalLight: scaled(T.DirectionalLight, Math.PI),
  HemisphereLight: scaled(T.HemisphereLight, Math.PI),
  PointLight: scaled(T.PointLight, 4 * Math.PI, { i: 3 }),
  SpotLight: scaled(T.SpotLight, 4 * Math.PI, { i: 5 }),
};

const scripts = (document.querySelector('script[data-scripts]').dataset.scripts || '').split(',').map(s => s.trim()).filter(Boolean);
for (const src of scripts) {
  await new Promise((ok, ko) => {
    const s = document.createElement('script');
    const end = window.GameLoader && window.GameLoader.begin('Script ' + src.split('/').pop());
    s.src = new URL(src, location.href).href;
    s.onload = () => { if (end) end(); ok(); };
    s.onerror = () => { const error = new Error('chargement impossible : ' + src); if (end) end(error); ko(error); };
    document.body.appendChild(s);
  });
}
