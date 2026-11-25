// Test Node de quality.js : node assets/quality.test.mjs
import { createRequire } from 'module';
import assert from 'assert';
const T = createRequire(import.meta.url)('../loisirs/apex-gp/vendor/three.min.js');
const { frameUpdate, Q } = await import('./quality.js');
Q.mode = 'haut';
const scene = new T.Scene(); scene.background = new T.Color(0x88aacc);
const cam = new T.PerspectiveCamera(60, 1, 0.1, 5000); cam.position.set(0, 2, 0); cam.updateMatrixWorld();
const mk = (x, big) => { const m = new T.Mesh(big ? new T.BoxGeometry(2000, 1, 2000) : new T.BoxGeometry(2, 2, 2), new T.MeshBasicMaterial()); m.position.set(x, 0, 0); m.castShadow = true; scene.add(m); m.updateMatrixWorld(); return m; };
const near = mk(10), mid = mk(300), far = mk(2000), ground = mk(0, true);
const sun = new T.DirectionalLight(); sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096); scene.add(sun);
frameUpdate(T, scene, cam);
assert(near.visible && near.castShadow, 'proche : affiché avec ombre');
assert(mid.visible && !mid.castShadow, 'moyen : affiché sans ombre projetée');
assert(!far.visible, 'loin : masqué');
assert(ground.visible, 'grand sol : jamais coupé');
assert(scene.fog && scene.fog.far <= 700 && cam.far <= 840, 'brouillard et portée calés : ' + scene.fog.far + ' / ' + cam.far);
assert(sun.shadow.mapSize.x === 2048, 'ombre plafonnée');
Q.mode = 'bas'; frameUpdate(T, scene, cam);
assert(!mid.visible || !mid.castShadow, 'bas : le moyen recule'); assert(scene.fog.far <= 240 && sun.shadow.mapSize.x === 512);
Q.shadows = false; frameUpdate(T, scene, cam); assert(!sun.castShadow, 'ombres coupées');
Q.shadows = true; Q.mode = 'haut'; frameUpdate(T, scene, cam); assert(sun.castShadow && mid.visible && !far.visible, 'retour haut');
far.position.x = 100; far.updateMatrixWorld(); for (let i = 0; i < 8; i++) frameUpdate(T, scene, cam); assert(far.visible, 'objet qui se rapproche : réaffiché');
// Bas : matériau Standard remplacé par une copie Lambert qui partage la couleur, puis rendu au-dessus de Bas
const std = new T.MeshStandardMaterial({ color: 0xff0000 }), box2 = new T.Mesh(new T.BoxGeometry(2, 2, 2), std); box2.position.set(5, 0, 0); scene.add(box2); box2.updateMatrixWorld();
Q.mode = 'bas'; for (let i = 0; i < 8; i++) frameUpdate(T, scene, cam);
assert(box2.material.isMeshLambertMaterial && box2.material.color === std.color, 'bas : Lambert à couleur partagée');
std.emissiveIntensity = 3; box2.material.opacity = 0.5; for (let i = 0; i < 8; i++) frameUpdate(T, scene, cam);
assert(box2.material.emissiveIntensity === 3 && std.opacity === 0.5, 'valeurs recopiées dans les deux sens');
Q.mode = 'haut'; for (let i = 0; i < 8; i++) frameUpdate(T, scene, cam); assert(box2.material === std, 'haut : matériau d’origine');
// zones K.lodCity : version détaillée de près, simplifiée de loin
const zn = mk(30), zf = mk(30); zn.userData = { lod: 'near', lodC: [400, 0, 85] }; zf.userData = { lod: 'far', lodC: [400, 0, 85] };
for (let i = 0; i < 8; i++) frameUpdate(T, scene, cam); assert(!zn.visible && zf.visible, 'zone lointaine : simplifiée');
zn.userData.lodC = zf.userData.lodC = [50, 0, 85]; for (let i = 0; i < 8; i++) frameUpdate(T, scene, cam); assert(zn.visible && !zf.visible, 'zone proche : détaillée');
console.log('quality OK');
