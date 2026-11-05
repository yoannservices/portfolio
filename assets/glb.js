// Charge un modèle .glb (compression Draco comprise) avec les loaders de Three.js r186.
// La page doit déclarer l'import map "three" (les loaders importent 'three' par son nom).
import * as THREE from 'three';

const LOADERS = 'https://cdn.jsdelivr.net/npm/three@0.186.1/examples/jsm/loaders/';
export async function loadGLB(url) {
  const load = async () => {
    const [{ GLTFLoader }, { DRACOLoader }] = await Promise.all([import(LOADERS + 'GLTFLoader.js'), import(LOADERS + 'DRACOLoader.js')]);
    const draco = new DRACOLoader().setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');
    return (await new GLTFLoader().setDRACOLoader(draco).loadAsync(url)).scene;
  };
  return window.GameLoader ? window.GameLoader.trackPromise('Modèle 3D ' + new URL(url, location.href).pathname.split('/').pop(), load()) : load();
}

/* Détecte les roues d'un modèle cadré par fitGLB (nœuds dont le nom contient « wheel ») et prépare leur rotation.
   `left` : le côté gauche est sur +X (convention de rally-masters). Renvoie [{ front, left, c, pivot, spin, ax, ay }]. */
export function rigWheels(out, re = /wheel/i) {
  out.updateMatrixWorld(true);
  const hit = []; out.traverse((o) => { if (re.test(o.name)) hit.push(o); });
  const top = hit.filter((o) => { for (let p = o.parent; p; p = p.parent) if (hit.includes(p)) return false; return true; });
  return top.map((o) => {
    const c = new THREE.Box3().setFromObject(o).getCenter(new THREE.Vector3()), par = o.parent;
    const pivot = new THREE.Group(), spin = new THREE.Group(), inv = par.matrixWorld.clone().invert();
    pivot.position.copy(par.worldToLocal(c.clone())); par.add(pivot); pivot.add(spin); spin.attach(o);
    return { front: c.z > 0, left: c.x > 0, c, pivot, spin, ax: new THREE.Vector3(1, 0, 0).transformDirection(inv), ay: new THREE.Vector3(0, 1, 0).transformDirection(inv) };
  });
}
export function poseWheel(w, spin, steer = 0) {
  w.spin.quaternion.setFromAxisAngle(w.ax, spin);
  if (w.front) w.pivot.quaternion.setFromAxisAngle(w.ay, steer);
}

/* Supprime de la scène (et libère) tous les maillages de `root` sauf ceux situés sous un des objets de `keep` (pilote, afficheur...).
   Les lumières et les repères (Object3D) restent : les jeux s'en servent. */
export function purge(root, keep = []) {
  const dead = [];
  root.traverse((o) => {
    if (!o.isMesh) return;
    for (let p = o; p; p = p.parent) if (keep.includes(p)) return;
    dead.push(o);
  });
  for (const o of dead) { o.parent.remove(o); o.geometry.dispose(); }
}

/* Remplace l'apparence d'un groupe : supprime ses maillages (le jeu garde ses repères et groupes) et ajoute le modèle cadré.
   `url` est relatif à la page. */
export async function swapModel(group, url, length, yaw = 0, keepAxes = false) {
  const m = fitGLB(await loadGLB(new URL(url, location.href).href), length, yaw, keepAxes);
  purge(group);
  group.add(m);
  return m;
}

/* Cadre un modèle venu de Sketchfab (échelle et origine quelconques) : axe long le long de Z, longueur `length` (m),
   centré en X/Z, posé sur y = 0. `yaw` tourne le groupe retourné pour mettre l'avant du modèle sur +Z. */
export function fitGLB(model, length, yaw = 0, keepAxes = false) {
  const box = new THREE.Box3(), size = new THREE.Vector3(), c = new THREE.Vector3();
  model.updateMatrixWorld(true); box.setFromObject(model).getSize(size);
  if (!keepAxes && size.x > size.z) model.rotation.y = Math.PI / 2; // axe long -> Z ; avions : keepAxes (l'envergure dépasse la longueur)
  const holder = new THREE.Group(); holder.add(model);
  holder.updateMatrixWorld(true); box.setFromObject(holder).getSize(size);
  model.scale.setScalar(length / (keepAxes ? size.z : Math.max(size.x, size.z)));
  holder.updateMatrixWorld(true); box.setFromObject(holder); box.getCenter(c);
  model.position.set(-c.x, -box.min.y, -c.z);
  const out = new THREE.Group(); out.add(holder); out.rotation.y = yaw;
  return out;
}

/* Pièces instanciables d'un modèle statique : [{ geo, mat }] avec la géométrie déjà placée (centrée X/Z, posée sur y = 0, mise à l'échelle `scale`).
   Sert aux foules et au trafic (un InstancedMesh par pièce) ; `size` est la boîte finale. */
export function bakeParts(root, scale = 1) {
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root), c = box.getCenter(new THREE.Vector3()), parts = [];
  const fit = new THREE.Matrix4().makeScale(scale, scale, scale).multiply(new THREE.Matrix4().makeTranslation(-c.x, -box.min.y, -c.z));
  root.traverse((o) => { if (o.isMesh) parts.push({ geo: o.geometry.clone().applyMatrix4(fit.clone().multiply(o.matrixWorld)), mat: o.material }); });
  return { parts, size: box.getSize(new THREE.Vector3()).multiplyScalar(scale) };
}

/* Découpe les triangles de `root` choisis par `pick(maillage, centre)` (centre en repère monde, `root` hors scène) pour animer
   train, tuyère... d'un modèle d'un seul bloc. `pick` renvoie une clé (ou rien) ; renvoie { clé: [nouveaux maillages] }. */
export function carve(root, pick) {
  root.updateMatrixWorld(true);
  const list = [], out = {}, v = new THREE.Vector3(), cen = new THREE.Vector3();
  root.traverse((o) => { if (o.isMesh && o.geometry.attributes.position) list.push(o); });
  for (const o of list) {
    const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry, pos = g.attributes.position, rows = {}, keep = [];
    for (let i = 0; i < pos.count; i += 3) {
      cen.set(0, 0, 0); for (let k = 0; k < 3; k++) cen.add(v.fromBufferAttribute(pos, i + k).applyMatrix4(o.matrixWorld)); cen.multiplyScalar(1 / 3);
      const key = pick(o, cen); (key ? (rows[key] = rows[key] || []) : keep).push(i);
    }
    const sub = (ids) => {
      const ng = new THREE.BufferGeometry();
      for (const n in g.attributes) {
        const a = g.attributes[n], s = a.itemSize, arr = new Float32Array(ids.length * 3 * s);
        ids.forEach((r, j) => { for (let k = 0; k < 3; k++) for (let c = 0; c < s; c++) arr[(j * 3 + k) * s + c] = a.getComponent(r + k, c); });
        ng.setAttribute(n, new THREE.BufferAttribute(arr, s));
      }
      return ng;
    };
    const keys = Object.keys(rows); if (!keys.length) continue;
    for (const key of keys) {
      const m = new THREE.Mesh(sub(rows[key]), o.material);
      m.position.copy(o.position); m.quaternion.copy(o.quaternion); m.scale.copy(o.scale); o.parent.add(m); m.updateMatrixWorld(true);
      (out[key] = out[key] || []).push(m);
    }
    if (keep.length) o.geometry = sub(keep); else o.parent.remove(o);
  }
  return out;
}

/* Groupe articulé en `pos` (repère monde) qui reprend `meshes` sans les déplacer ; `wrap` doit être à l'identité. */
export function pivotAt(wrap, pos, meshes) {
  const p = new THREE.Group(); p.position.copy(pos); wrap.add(p); wrap.updateMatrixWorld(true);
  for (const m of meshes) p.attach(m);
  return p;
}

/* Articulations des avions réels en un bloc (F-35, V-22) : train et tuyère découpés en pièces mobiles, repère monde, avant = -Z.
   `wrap` : groupe à l'identité qui contient le modèle cadré. Renvoie { gear: [{ g, ax, ang, lift }], nozR } ;
   le jeu applique `g.rotation[ax] = ang * rentré` (rentré 0 = sorti, 1 = rentré) et `nozR.rotation.x = tuyère * π/2`. */
export const AIRCRAFT_RIGS = {
  f35(wrap) {
    const near = (o, re) => re.test(o.parent.name);
    const C = carve(wrap, (o, c) => {
      if (near(o, /^(Cylinder010_9|Plane02[0-9]_\d+|Plane03[0-2]_\d+)$/) && Math.abs(c.x) > 1.7 && Math.abs(c.x) < 2.7 && c.y < 2) return c.x < 0 ? 'L' : 'R';
      if (near(o, /^Cylinder042_16$/)) {
        if (Math.abs(c.x) < 0.5 && c.z < -4 && c.z > -5 && c.y < 1.1) return 'N';
        if (/^Object_5[0-3]$/.test(o.name)) return 'T';
      }
    });
    const gear = [], P = (x, y, z, k) => pivotAt(wrap, new THREE.Vector3(x, y, z), C[k]);
    for (const s of [-1, 1]) { const k = s < 0 ? 'L' : 'R'; if (C[k]) gear.push({ g: P(s * 2.2, 1.9, 2.2, k), ax: 'z', ang: s * -Math.PI / 2 }); }
    if (C.N) gear.push({ g: P(0, 0.95, -4.5, 'N'), ax: 'x', ang: -Math.PI / 2 });
    return { gear, nozR: C.T ? P(0, 1.9, 5, 'T') : null };
  },
  pv40(wrap) {
    const C = carve(wrap, (o, c) => {
      if (o.name !== 'Object_4' || c.y > 1.3) return;
      if (Math.abs(c.x) > 2.8 && Math.abs(c.x) < 4.6 && c.z > 1.4 && c.z < 3.7) return c.x < 0 ? 'L' : 'R';
      if (Math.abs(c.x) < 1 && c.z < -8.8 && c.z > -11.4) return 'N';
    });
    const gear = [], P = (x, y, z, k) => pivotAt(wrap, new THREE.Vector3(x, y, z), C[k]);
    for (const s of [-1, 1]) { const k = s < 0 ? 'L' : 'R'; if (C[k]) gear.push({ g: P(s * 3.7, 1.3, 2.5, k), ax: 'z', ang: s * -Math.PI / 2, lift: 0.5 }); }
    if (C.N) gear.push({ g: P(0, 1.3, -10, 'N'), ax: 'x', ang: -Math.PI / 2, lift: 0.3 });
    return { gear, nozR: null };
  },
};
