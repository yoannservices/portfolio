/* Kit commun de bâtiments détaillés (tous les jeux de loisirs/).
   Pas d'import : THREE est passé en paramètre, donc le fichier marche en module (import '../../assets/building-kit.js')
   comme en script classique (three-compat data-scripts). Il pose globalThis.BuildingKit(THREE).

   Une seule source de vérité par façade : la liste des ouvertures (fenêtres, porte, vitrine, porte de garage) est calculée
   une fois, puis sert à la géométrie ET aux éléments qui doivent les contourner (soubassement, volets, bandeaux).
   Les fenêtres sont en relief : cadre, vitre en retrait, meneau, appui, linteau, volets, balcon à garde-corps.
   Toits : deux pans (débords, rives, faîtage, gouttières, descentes, cheminée, pignons maçonnés) ou terrasse
   (acrotère, couvertine, édicule d'escalier, groupes de clim, citerne, mât).

   Utilisation :
     const K = BuildingKit(THREE), acc = K.acc(), mats = K.materials({ wall: '#d8c6a9', style: 'stucco', roof: 'tile' });
     acc.at(x, 0, z, yaw); K.building(acc, { w: 12, d: 9, h: 5.6, roof: 'gable', door: '+z', shutters: true });
     scene.add(K.group(acc.geometries(), mats));             // ou K.instanced(geos, mats, matrices)
   Repère local : centre de l'emprise au sol, façade principale vers +z, faîtage le long de x. */
(function () {
  // qualité graphique (assets/quality.js, clé site.quality.v2) lue au chargement : Bas = version simplifiée (cadres et vitres en plans, sans volets en relief, gouttières ni montants)
  const QDETAIL = (() => { try { return JSON.parse(localStorage.getItem('site.quality.v2') || '{}').mode === 'bas' ? 0 : 2; } catch (e) { return 2; } })();
  const kit = (THREE) => {
    const V = (x, y, z) => new THREE.Vector3(x, y, z);
    const srgb = (t) => { if ('colorSpace' in t) t.colorSpace = THREE.SRGBColorSpace; else t.encoding = THREE.sRGBEncoding; return t; };

    /* ---------- accumulateur de triangles (positions, normales, UV en mètres / tuile, couleur de sommet) ---------- */
    class Acc {
      constructor() { this.b = {}; this.m = new THREE.Matrix4(); this.nm = new THREE.Matrix3(); this.c = [1, 1, 1]; this.tv = V(0, 0, 0); this.tn = V(0, 0, 0); }
      at(x = 0, y = 0, z = 0, yaw = 0) { this.m.makeRotationY(yaw).setPosition(x, y, z); this.nm.getNormalMatrix(this.m); return this; }
      color(c) { if (c == null) this.c = [1, 1, 1]; else { const k = new THREE.Color(c); this.c = [k.r, k.g, k.b]; } return this; }
      // keys({ wall: 'wall_brick' }) : renomme des clés (plusieurs styles de mur dans un même accumulateur)
      keys(map) { this.rn = map || null; return this; }
      buf(k) { if (this.rn && this.rn[k]) k = this.rn[k]; return this.b[k] || (this.b[k] = { p: [], n: [], u: [], c: [] }); }
      vert(B, p, n, uv) {
        const v = this.tv.copy(p).applyMatrix4(this.m), q = this.tn.copy(n).applyMatrix3(this.nm).normalize();
        B.p.push(v.x, v.y, v.z); B.n.push(q.x, q.y, q.z); B.u.push(uv[0], uv[1]); B.c.push(this.c[0], this.c[1], this.c[2]);
      }
      // quad a b c d (UV ua..ud) ; hint = direction extérieure attendue : l'ordre est retourné si besoin
      quad(k, a, b, c, d, ua, ub, uc, ud, hint) {
        const n = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(d, a));
        if (n.lengthSq() < 1e-12) n.subVectors(c, a).cross(new THREE.Vector3().subVectors(d, b));
        n.normalize();
        if (hint && n.dot(hint) < 0) { [b, d] = [d, b]; [ub, ud] = [ud, ub]; n.negate(); }
        const B = this.buf(k);
        for (const [p, uv] of [[a, ua], [b, ub], [c, uc], [a, ua], [c, uc], [d, ud]]) this.vert(B, p, n, uv);
      }
      tri(k, a, b, c, ua, ub, uc, hint) {
        const n = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a)).normalize();
        if (hint && n.dot(hint) < 0) { [b, c] = [c, b]; [ub, uc] = [uc, ub]; n.negate(); }
        const B = this.buf(k);
        for (const [p, uv] of [[a, ua], [b, ub], [c, uc]]) this.vert(B, p, n, uv);
      }
      // pavé aligné sur les axes, UV en mètres / tile ; skip = faces à ne pas créer ('+x','-x','+y','-y','+z','-z')
      box(k, x0, y0, z0, x1, y1, z1, tile = 1, skip) {
        if (x0 > x1) [x0, x1] = [x1, x0]; if (y0 > y1) [y0, y1] = [y1, y0]; if (z0 > z1) [z0, z1] = [z1, z0];
        const t = tile, s = (f) => skip && skip.includes(f);
        if (!s('+z')) this.quad(k, V(x0, y0, z1), V(x1, y0, z1), V(x1, y1, z1), V(x0, y1, z1), [x0 / t, y0 / t], [x1 / t, y0 / t], [x1 / t, y1 / t], [x0 / t, y1 / t], V(0, 0, 1));
        if (!s('-z')) this.quad(k, V(x1, y0, z0), V(x0, y0, z0), V(x0, y1, z0), V(x1, y1, z0), [-x1 / t, y0 / t], [-x0 / t, y0 / t], [-x0 / t, y1 / t], [-x1 / t, y1 / t], V(0, 0, -1));
        if (!s('+x')) this.quad(k, V(x1, y0, z1), V(x1, y0, z0), V(x1, y1, z0), V(x1, y1, z1), [-z1 / t, y0 / t], [-z0 / t, y0 / t], [-z0 / t, y1 / t], [-z1 / t, y1 / t], V(1, 0, 0));
        if (!s('-x')) this.quad(k, V(x0, y0, z0), V(x0, y0, z1), V(x0, y1, z1), V(x0, y1, z0), [z0 / t, y0 / t], [z1 / t, y0 / t], [z1 / t, y1 / t], [z0 / t, y1 / t], V(-1, 0, 0));
        if (!s('+y')) this.quad(k, V(x0, y1, z1), V(x1, y1, z1), V(x1, y1, z0), V(x0, y1, z0), [x0 / t, -z1 / t], [x1 / t, -z1 / t], [x1 / t, -z0 / t], [x0 / t, -z0 / t], V(0, 1, 0));
        if (!s('-y')) this.quad(k, V(x0, y0, z0), V(x1, y0, z0), V(x1, y0, z1), V(x0, y0, z1), [x0 / t, z0 / t], [x1 / t, z0 / t], [x1 / t, z1 / t], [x0 / t, z1 / t], V(0, -1, 0));
      }
      cyl(k, x, y0, z, r, h, seg = 12) {
        for (let i = 0; i < seg; i++) {
          const a0 = (i / seg) * Math.PI * 2, a1 = ((i + 1) / seg) * Math.PI * 2, c0 = Math.cos(a0) * r, s0 = Math.sin(a0) * r, c1 = Math.cos(a1) * r, s1 = Math.sin(a1) * r;
          const n = V(Math.cos((a0 + a1) / 2), 0, Math.sin((a0 + a1) / 2));
          this.quad(k, V(x + c0, y0, z + s0), V(x + c1, y0, z + s1), V(x + c1, y0 + h, z + s1), V(x + c0, y0 + h, z + s0), [a0 * r, y0], [a1 * r, y0], [a1 * r, y0 + h], [a0 * r, y0 + h], n);
          this.tri(k, V(x, y0 + h, z), V(x + c0, y0 + h, z + s0), V(x + c1, y0 + h, z + s1), [0, 0], [c0, s0], [c1, s1], V(0, 1, 0));
        }
      }
      geometries() {
        const out = {};
        for (const k in this.b) {
          const B = this.b[k]; if (!B.p.length) continue;
          const g = new THREE.BufferGeometry();
          g.setAttribute('position', new THREE.Float32BufferAttribute(B.p, 3));
          g.setAttribute('normal', new THREE.Float32BufferAttribute(B.n, 3));
          g.setAttribute('uv', new THREE.Float32BufferAttribute(B.u, 2));
          g.setAttribute('color', new THREE.Float32BufferAttribute(B.c, 3));
          g.computeBoundingSphere(); out[k] = g;
        }
        return out;
      }
      clear() { this.b = {}; return this; }
    }

    /* ---------- textures (dessinées une fois, partagées) ---------- */
    const cache = {};
    const canvasTex = (key, size, draw, repeat = true) => {
      if (cache[key]) return cache[key];
      const c = document.createElement('canvas'); c.width = c.height = size;
      draw(c.getContext('2d'), size);
      const t = srgb(new THREE.CanvasTexture(c));
      if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.anisotropy = 8;
      return (cache[key] = t);
    };
    let seed = 12345;
    const R = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    const speck = (g, S, n, a) => { for (let i = 0; i < n; i++) { g.fillStyle = R() < 0.5 ? `rgba(0,0,0,${a * R()})` : `rgba(255,255,255,${a * R()})`; g.fillRect(R() * S, R() * S, 1 + R() * 2.5, 1 + R() * 2.5); } };
    // une tuile = 4 m x 4 m (UV en mètres / 4)
    const WALL = {
      stucco: (g, S) => { g.fillStyle = '#ece8e0'; g.fillRect(0, 0, S, S); speck(g, S, S * S / 6, 0.09); },
      brick: (g, S) => {
        g.fillStyle = '#d9d4cc'; g.fillRect(0, 0, S, S);
        const bh = S / (4 / 0.075), bw = bh * 3.4;   // brique 0,25 x 0,075 m (tuile de 4 m)
        for (let y = 0, r = 0; y < S; y += bh, r++) for (let x = -(r % 2) * bw / 2; x < S; x += bw) {
          const v = 200 + (R() - 0.5) * 50; g.fillStyle = `rgb(${v},${v * 0.93},${v * 0.88})`; g.fillRect(x + 1, y + 1, bw - 2, bh - 2);
        }
        speck(g, S, S * S / 10, 0.06);
      },
      stone: (g, S) => {
        g.fillStyle = '#cfc9be'; g.fillRect(0, 0, S, S);
        const bh = S / 10;
        for (let y = 0, r = 0; y < S; y += bh, r++) for (let x = -(r % 2) * bh, w; x < S; x += w) {
          w = bh * (1.6 + R() * 1.4); const v = 225 + (R() - 0.5) * 30; g.fillStyle = `rgb(${v},${v * 0.97},${v * 0.92})`; g.fillRect(x + 1.5, y + 1.5, w - 3, bh - 3);
        }
        speck(g, S, S * S / 8, 0.07);
      },
      concrete: (g, S) => {
        g.fillStyle = '#d6d6d2'; g.fillRect(0, 0, S, S); speck(g, S, S * S / 7, 0.06);
        g.fillStyle = 'rgba(0,0,0,0.18)'; for (let k = 0; k <= 2; k++) { g.fillRect(0, k * S / 2, S, 2); g.fillRect(k * S / 2, 0, 2, S); }
        g.fillStyle = 'rgba(0,0,0,0.12)'; for (let x = S / 8; x < S; x += S / 4) for (let y = S / 8; y < S; y += S / 4) { g.beginPath(); g.arc(x, y, 2.5, 0, 7); g.fill(); }
      },
      wood: (g, S) => {
        g.fillStyle = '#e2d6c4'; g.fillRect(0, 0, S, S);
        const pw = S / 20;
        for (let x = 0; x < S; x += pw) { const v = 225 + (R() - 0.5) * 40; g.fillStyle = `rgb(${v},${v * 0.93},${v * 0.84})`; g.fillRect(x, 0, pw - 2, S); g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(x + pw - 2, 0, 2, S); }
        for (let i = 0; i < S * 3; i++) { g.fillStyle = 'rgba(80,50,20,0.06)'; g.fillRect(R() * S, R() * S, 1, 6 + R() * 20); }
      },
      logs: (g, S) => {
        g.fillStyle = '#5a4030'; g.fillRect(0, 0, S, S);
        const lh = S / 16;
        for (let y = 0; y < S; y += lh) {
          const gr = g.createLinearGradient(0, y, 0, y + lh); gr.addColorStop(0, '#c8a880'); gr.addColorStop(0.5, '#e8cfa8'); gr.addColorStop(1, '#8a6a48');
          g.fillStyle = gr; g.fillRect(0, y + 1, S, lh - 2);
        }
        for (let i = 0; i < S * 3; i++) { g.fillStyle = 'rgba(70,40,15,0.08)'; g.fillRect(R() * S, R() * S, 8 + R() * 30, 1); }
      },
      metal: (g, S) => {
        g.fillStyle = '#dcdedf'; g.fillRect(0, 0, S, S);
        const p = S / 40;
        for (let x = 0; x < S; x += p) { const gr = g.createLinearGradient(x, 0, x + p, 0); gr.addColorStop(0, '#f2f3f4'); gr.addColorStop(0.5, '#b9bcbf'); gr.addColorStop(1, '#eceeef'); g.fillStyle = gr; g.fillRect(x, 0, p, S); }
        speck(g, S, S * 4, 0.05);
      },
    };
    const wallTex = (style) => canvasTex('w-' + style, 512, WALL[style] || WALL.stucco);
    const ROOF = {
      tile: (g, S) => {   // tuiles canal : rangées ondulées
        g.fillStyle = '#c8c0b8'; g.fillRect(0, 0, S, S);
        const rh = S / 12, cw = S / 16;
        for (let y = 0, r = 0; y < S; y += rh, r++) for (let x = (r % 2) * cw / 2 - cw; x < S; x += cw) {
          const gr = g.createLinearGradient(x, 0, x + cw, 0); gr.addColorStop(0, '#9a928a'); gr.addColorStop(0.5, '#f4eee8'); gr.addColorStop(1, '#8c847c');
          g.fillStyle = gr; g.fillRect(x, y, cw - 1, rh - 1); g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(x, y + rh - 3, cw, 3);
        }
      },
      slate: (g, S) => {
        g.fillStyle = '#9aa0a6'; g.fillRect(0, 0, S, S);
        const rh = S / 16, cw = S / 10;
        for (let y = 0, r = 0; y < S; y += rh, r++) for (let x = (r % 2) * cw / 2 - cw; x < S; x += cw) { const v = 215 + (R() - 0.5) * 40; g.fillStyle = `rgb(${v},${v},${v * 1.03})`; g.fillRect(x + 1, y + 1, cw - 2, rh - 2); }
        g.fillStyle = 'rgba(0,0,0,0.3)'; for (let y = 0; y < S; y += rh) g.fillRect(0, y + rh - 2, S, 2);
      },
      tin: (g, S) => {
        g.fillStyle = '#d0d4d8'; g.fillRect(0, 0, S, S);
        const p = S / 16;
        for (let x = 0; x < S; x += p) { const gr = g.createLinearGradient(x, 0, x + p, 0); gr.addColorStop(0, '#9da3a8'); gr.addColorStop(0.3, '#f5f7f8'); gr.addColorStop(1, '#b8bdc2'); g.fillStyle = gr; g.fillRect(x, 0, p, S); }
      },
      gravel: (g, S) => { g.fillStyle = '#9b9890'; g.fillRect(0, 0, S, S); speck(g, S, S * S / 2, 0.25); },
    };
    const roofTex = (k) => canvasTex('r-' + k, 256, ROOF[k] || ROOF.tile);
    const louvreTex = () => canvasTex('louvre', 64, (g, S) => { g.fillStyle = '#f0f0f0'; g.fillRect(0, 0, S, S); for (let y = 0; y < S; y += 6) { g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(0, y + 4, S, 2); g.fillStyle = 'rgba(255,255,255,0.6)'; g.fillRect(0, y, S, 1); } });
    const stripeTex = () => canvasTex('stripe', 64, (g, S) => { for (let x = 0; x < S; x += 16) { g.fillStyle = '#ffffff'; g.fillRect(x, 0, 8, S); g.fillStyle = '#9a9a9a'; g.fillRect(x + 8, 0, 8, S); } });
    const railTex = () => canvasTex('rail', 128, (g, S) => {
      g.clearRect(0, 0, S, S); g.fillStyle = '#fff';
      g.fillRect(0, 0, S, 10); g.fillRect(0, S - 12, S, 8);
      for (let x = 4; x < S; x += 16) g.fillRect(x, 0, 5, S);
    });
    const garageTex = () => canvasTex('garage', 128, (g, S) => {
      g.fillStyle = '#e8e8e8'; g.fillRect(0, 0, S, S);
      for (let y = 0; y < S; y += S / 8) { g.fillStyle = 'rgba(0,0,0,0.32)'; g.fillRect(0, y + S / 8 - 3, S, 3); g.fillStyle = 'rgba(255,255,255,0.5)'; g.fillRect(0, y, S, 2); }
      for (let x = 0; x < S; x += 4) { g.fillStyle = 'rgba(0,0,0,0.04)'; g.fillRect(x, 0, 1, S); }
    });
    const doorTex = () => canvasTex('door', 128, (g, S) => {   // porte à panneaux moulurés (U : largeur 1 m, V : hauteur 2 m pour une tuile de 2 m)
      g.fillStyle = '#e6e6e6'; g.fillRect(0, 0, S, S);
      for (const [x, y, w, h] of [[0.14, 0.06, 0.32, 0.36], [0.54, 0.06, 0.32, 0.36], [0.14, 0.5, 0.72, 0.42]]) {
        g.fillStyle = 'rgba(0,0,0,0.22)'; g.fillRect(x * S, y * S, w * S, h * S);
        g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(x * S + 3, y * S + 3, w * S - 6, h * S - 6);
        g.fillStyle = '#d8d8d8'; g.fillRect(x * S + 6, y * S + 6, w * S - 12, h * S - 12);
      }
    });

    /* ---------- matériaux ---------- */
    const std = (o) => new THREE.MeshStandardMaterial(Object.assign({ vertexColors: true, roughness: 0.85 }, o));
    function materials(o = {}) {
      const style = o.style || 'stucco', roof = o.roof || 'tile';
      const off = { polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 };
      const m = {
        wall: std({ map: wallTex(style), color: o.wall || '#e8dcc6', roughness: style === 'metal' ? 0.5 : 0.9, metalness: style === 'metal' ? 0.3 : 0 }),
        plinth: std({ map: wallTex('stone'), color: o.plinth || '#9c968c', roughness: 0.95 }),
        trim: std({ color: o.trim || '#efebe2', roughness: 0.7 }),
        frame: std({ color: o.frame || '#f4f4f2', roughness: 0.45, metalness: 0.1 }),
        glass: std(Object.assign({ color: o.glass || '#4a6378', roughness: 0.12, metalness: 0.35, emissive: '#000000' }, off)),
        lit: std(Object.assign({ color: o.glass || '#4a6378', roughness: 0.12, metalness: 0.35, emissive: o.litColor || '#ffcf86', emissiveIntensity: 0 }, off)),
        shop: std(Object.assign({ color: '#5b7487', roughness: 0.1, metalness: 0.3, emissive: '#ffe2a8', emissiveIntensity: 0 }, off)),
        door: std(Object.assign({ map: doorTex(), color: o.door || '#6b4428', roughness: 0.6 }, off)),
        garage: std(Object.assign({ map: garageTex(), color: o.garage || '#d6d8da', roughness: 0.5, metalness: 0.3 }, off)),
        shutter: std({ map: louvreTex(), color: o.shutter || '#3f6b4a', roughness: 0.6 }),
        roof: std({ map: roofTex(roof), color: o.roofColor || ({ tile: '#b0573f', slate: '#5d646c', tin: '#8d959c', gravel: '#ffffff' })[roof], roughness: roof === 'tin' ? 0.45 : 0.85, metalness: roof === 'tin' ? 0.4 : 0 }),
        roofFlat: std({ map: roofTex('gravel'), color: '#b9b5ad', roughness: 1 }),
        under: std({ color: o.under || '#e9e4d8', roughness: 0.8 }),
        roofTrim: std({ color: o.roofTrim || '#7a7f86', roughness: 0.6, metalness: 0.2 }),
        metal: std({ color: o.metal || '#8e959b', roughness: 0.45, metalness: 0.6 }),
        dark: std({ color: '#3a3e44', roughness: 0.6, metalness: 0.2 }),
        rail: std({ map: railTex(), color: o.rail || '#2e3236', alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.5, metalness: 0.5 }),
        awning: std({ map: stripeTex(), color: o.awning || '#b3262e', roughness: 0.8, side: THREE.DoubleSide }),
        fascia: std({ color: o.fascia || '#2b2f35', roughness: 0.5 }),
        chimney: std({ map: wallTex('brick'), color: o.chimney || '#b06a52', roughness: 0.9 }),
      };
      return m;
    }

    /* ---------- bâtiment ---------- */
    const FACES = ['+z', '-z', '+x', '-x'];
    function building(acc, o) {
      const rand = o.rand || Math.random;
      const w = o.w, d = o.d, detail = Math.min(o.detail ?? 2, QDETAIL);
      const fh = o.fh ?? 3, gfh = o.gfh ?? (o.shop ? Math.max(fh, 4) : fh);
      const roof = o.roof ?? 'gable';
      const facadeType = o.facade || 'punched';          // punched (fenêtres), ribbon (bandeaux vitrés), curtain (mur-rideau)
      const h = o.h, floors = Math.max(1, Math.floor((h - gfh) / fh + 0.02) + 1);
      const plinthH = o.plinth === false ? 0 : (o.plinth ?? 0.45);
      const tile = 4;
      const tint = o.tint;
      const litP = o.lit ?? 0.38;
      const faces = o.faces || FACES;
      const L = (f) => (f === '+z' || f === '-z' ? w : d), Dh = (f) => (f === '+z' || f === '-z' ? d / 2 : w / 2);
      // passage repère façade (s le long de la façade vers la droite vue de dehors, y, o vers l'extérieur) -> local
      const P = (f, s, y, oo) => {
        const hd = Dh(f) + oo;
        return f === '+z' ? V(s, y, hd) : f === '-z' ? V(-s, y, -hd) : f === '+x' ? V(hd, y, -s) : V(-hd, y, s);
      };
      const N = { '+z': V(0, 0, 1), '-z': V(0, 0, -1), '+x': V(1, 0, 0), '-x': V(-1, 0, 0) };
      const back = { '+z': '-z', '-z': '+z', '+x': '-x', '-x': '+x' };
      const fbox = (k, f, s0, s1, y0, y1, o0, o1, noBack = true, t = 1) => {
        const a = P(f, s0, y0, o0), b = P(f, s1, y1, o1);
        acc.box(k, a.x, a.y, a.z, b.x, b.y, b.z, t, noBack ? [back[f]] : null);
      };
      const fquad = (k, f, s0, s1, y0, y1, oo, t = 1, us = 0, uvr, inward) => {
        const [u0, v0, u1, v1] = uvr || [(s0 + us) / t, y0 / t, (s1 + us) / t, y1 / t];
        acc.quad(k, P(f, s0, y0, oo), P(f, s1, y0, oo), P(f, s1, y1, oo), P(f, s0, y1, oo), [u0, v0], [u1, v0], [u1, v1], [u0, v1], inward ? N[f].clone().negate() : N[f]);
      };
      // quad en coordonnées façade [s, y, o] ; dir = direction extérieure attendue ('o', '+s', '-s', '+y', '-y')
      const DIRV = (f, dir) => dir === 'o' ? N[f] : dir === '+y' ? V(0, 1, 0) : dir === '-y' ? V(0, -1, 0) : P(f, dir === '+s' ? 1 : -1, 0, 0).sub(P(f, 0, 0, 0));
      const fq4 = (k, f, a, b, c, d, dir) => acc.quad(k, P(f, ...a), P(f, ...b), P(f, ...c), P(f, ...d), [0, 0], [1, 0], [1, 1], [0, 1], DIRV(f, dir));
      // cadre en anneau (face avant, tableaux intérieurs, côtés extérieurs) : 24 triangles au lieu de 40 pour 4 pavés
      const ring = (k, f, s0, s1, y0, y1, fw, oo, oi = 0.03) => {
        const S0 = s0 - fw, S1 = s1 + fw, Y0 = y0 - fw, Y1 = y1 + fw;
        fq4(k, f, [S0, Y0, oo], [s0, Y0, oo], [s0, Y1, oo], [S0, Y1, oo], 'o'); fq4(k, f, [s1, Y0, oo], [S1, Y0, oo], [S1, Y1, oo], [s1, Y1, oo], 'o');
        fq4(k, f, [s0, y1, oo], [s1, y1, oo], [s1, Y1, oo], [s0, Y1, oo], 'o'); fq4(k, f, [s0, Y0, oo], [s1, Y0, oo], [s1, y0, oo], [s0, y0, oo], 'o');
        fq4(k, f, [s0, y0, oi], [s0, y0, oo], [s0, y1, oo], [s0, y1, oi], '+s'); fq4(k, f, [s1, y0, oi], [s1, y0, oo], [s1, y1, oo], [s1, y1, oi], '-s');
        fq4(k, f, [s0, y1, oi], [s1, y1, oi], [s1, y1, oo], [s0, y1, oo], '-y'); fq4(k, f, [s0, y0, oi], [s1, y0, oi], [s1, y0, oo], [s0, y0, oo], '+y');
        fq4(k, f, [S0, Y0, 0], [S0, Y0, oo], [S0, Y1, oo], [S0, Y1, 0], '-s'); fq4(k, f, [S1, Y0, 0], [S1, Y0, oo], [S1, Y1, oo], [S1, Y1, 0], '+s');
        fq4(k, f, [S0, Y1, 0], [S1, Y1, 0], [S1, Y1, oo], [S0, Y1, oo], '+y'); fq4(k, f, [S0, Y0, 0], [S1, Y0, 0], [S1, Y0, oo], [S0, Y0, oo], '-y');
      };
      // barre fine (meneau, traverse, linteau) : pavé sans face arrière, extrémités fermées
      const bar = (k, f, s0, s1, y0, y1, o0, o1) => fbox(k, f, s0, s1, y0, y1, o0, o1);
      const glassKey = () => (rand() < litP ? 'lit' : 'glass');
      const glassTint = () => { const v = 0.82 + rand() * 0.3; return new THREE.Color(v, v, v * (0.98 + rand() * 0.06)); };
      const wallTop = roof === 'flat' ? h + (o.parapet ?? 0.9) : h;

      /* --- ouvertures du rez-de-chaussée (une seule liste, partagée par la géométrie et les éléments qui les contournent) --- */
      const margin = (f) => Math.min(o.margin ?? 1.1, L(f) / 2 - 0.5);
      const ground = {};
      for (const f of FACES) ground[f] = [];
      const lobby = facadeType === 'curtain' && !o.shop && o.lobby !== false;   // tours : rez entièrement vitré (hall)
      const shopFaces = lobby ? FACES : o.shop === true ? ['+z'] : o.shop || [];
      for (const f of shopFaces) { const m = Math.max(0.6, margin(f) * 0.6); ground[f].push({ type: 'shop', s0: -L(f) / 2 + m, s1: L(f) / 2 - m }); }
      for (const op of o.openings || []) ground[op.face].push({ type: op.type || 'door', s0: op.s - op.w / 2, s1: op.s + op.w / 2, h: op.h });

      // grille de travées par façade
      const bays = {};
      for (const f of FACES) {
        const Lf = L(f), m = margin(f), bay = o.bay ?? 3.1;
        const n = Lf - 2 * m < 1.2 ? 0 : Math.max(1, Math.round((Lf - 2 * m) / bay)), sp = n ? (Lf - 2 * m) / n : 0;
        bays[f] = { n, sp, s: Array.from({ length: n }, (_, k) => -Lf / 2 + m + sp * (k + 0.5)) };
      }
      // porte d'entrée : prend la travée la plus proche de doorS (sa fenêtre du rez disparaît)
      const doorFace = o.door === undefined ? '+z' : o.door;
      if (doorFace && !shopFaces.includes(doorFace) && bays[doorFace].n) {
        const B = bays[doorFace], ds = o.doorS ?? 0;
        let k = 0; for (let i = 1; i < B.n; i++) if (Math.abs(B.s[i] - ds) < Math.abs(B.s[k] - ds)) k = i;
        const dw = Math.min(o.doorW ?? (o.doorType === 'block' ? 1.8 : 1.0), B.sp - 0.5);
        ground[doorFace].push({ type: o.doorType === 'block' ? 'entry' : 'door', s0: B.s[k] - dw / 2, s1: B.s[k] + dw / 2, slot: k });
      }
      const blocked = (f, s, half) => ground[f].some((g) => s + half > g.s0 - 0.35 && s - half < g.s1 + 0.35);

      /* --- murs : un quad par façade (UV continues autour du bâtiment), troué par les baies ouvertes ('bay') --- */
      const baysOf = (f) => ground[f].filter((g) => g.type === 'bay').sort((a, b) => a.s0 - b.s0);
      const wallFace = (f, y0, y1, oo, us, inward = false) => {
        const Lf = L(f) + (inward ? 2 * oo : 0), bs = baysOf(f);
        let s = -Lf / 2;
        for (const b of bs) {
          if (b.s0 > s) fquad('wall', f, s, b.s0, y0, y1, oo, tile, us, null, inward);
          if (b.h < y1) fquad('wall', f, b.s0, b.s1, Math.max(y0, b.h), y1, oo, tile, us, null, inward);
          s = b.s1;
        }
        if (Lf / 2 > s) fquad('wall', f, s, Lf / 2, y0, y1, oo, tile, us, null, inward);
      };
      const hasBay = FACES.some((f) => baysOf(f).length);
      if (hasBay || o.interior) {   // intérieur visible par les baies : murs intérieurs, plafond, tableaux des baies
        const T = 0.25;
        for (const f of FACES) {
          wallFace(f, 0.02, h, -T, 0, true);
          for (const b of baysOf(f)) {
            for (const [sb, dir] of [[b.s0, 1], [b.s1, -1]]) acc.quad('wall', P(f, sb, 0, -T), P(f, sb, 0, 0), P(f, sb, b.h, 0), P(f, sb, b.h, -T), [0, 0], [T, 0], [T, b.h / tile], [0, b.h / tile], P(f, dir, 0, 0).sub(P(f, 0, 0, 0)));
            acc.quad('under', P(f, b.s0, b.h, -T), P(f, b.s1, b.h, -T), P(f, b.s1, b.h, 0), P(f, b.s0, b.h, 0), [0, 0], [1, 0], [1, 1], [0, 1], V(0, -1, 0));
          }
        }
        acc.quad('under', V(-w / 2 + T, h, -d / 2 + T), V(w / 2 - T, h, -d / 2 + T), V(w / 2 - T, h, d / 2 - T), V(-w / 2 + T, h, d / 2 - T), [0, 0], [1, 0], [1, 1], [0, 1], V(0, -1, 0));
        acc.quad('plinth', V(-w / 2, 0.03, -d / 2), V(w / 2, 0.03, -d / 2), V(w / 2, 0.03, d / 2), V(-w / 2, 0.03, d / 2), [-w / 8, -d / 8], [w / 8, -d / 8], [w / 8, d / 8], [-w / 8, d / 8], V(0, 1, 0));   // sol intérieur
      }
      acc.color(tint);
      let us = 0;
      for (const f of FACES) {
        const Lf = L(f);
        if (facadeType !== 'curtain') wallFace(f, plinthH, wallTop, 0, us);
        else { fquad('wall', f, -Lf / 2, Lf / 2, plinthH, gfh, 0, tile, us); if (wallTop > h) fquad('wall', f, -Lf / 2, Lf / 2, h, wallTop, 0, tile, us); }
        us += Lf;
      }
      acc.color(null);

      /* --- soubassement : contourne portes et vitrines --- */
      if (plinthH > 0) for (const f of FACES) {
        const Lf = L(f), cuts = ground[f].filter((g) => g.type !== 'win').map((g) => [g.s0 - 0.12, g.s1 + 0.12]).sort((a, b) => a[0] - b[0]);
        let s = f === '+z' || f === '-z' ? -Lf / 2 - 0.05 : -Lf / 2;
        const end = f === '+z' || f === '-z' ? Lf / 2 + 0.05 : Lf / 2;
        for (const [c0, c1] of cuts) { if (c0 > s) fbox('plinth', f, s, c0, 0, plinthH, 0, 0.05, true, tile); s = Math.max(s, c1); }
        if (end > s) fbox('plinth', f, s, end, 0, plinthH, 0, 0.05, true, tile);
      }

      /* --- chaînages d'angle (pierre / enduit) --- */
      if (o.quoins && detail > 0) {
        acc.color(null);
        for (const f of FACES) for (const sg of [-1, 1]) {
          const Lf = L(f), edge = sg * Lf / 2;
          for (let y = plinthH + 0.1, i = 0; y + 0.3 < h - 0.3; y += 0.62, i++) {
            const len = ((i + (f === '+z' || f === '-z' ? 0 : 1)) % 2) ? 0.55 : 0.32;
            fbox('trim', f, sg > 0 ? edge - len : edge, sg > 0 ? edge : edge + len, y, y + 0.5, 0, 0.035);
          }
        }
      }

      /* --- bandeaux d'étage et corniche (s'arrêtent aux angles sans se recouvrir : ±z débordent, ±x non) --- */
      const ext = (f, oo) => (f === '+z' || f === '-z' ? oo : 0);
      if (o.bands !== false && facadeType !== 'curtain') for (const f of FACES) {
        const Lf = L(f);
        for (let i = 1; i < floors; i++) { const y = gfh + (i - 1) * fh; fbox('trim', f, -Lf / 2 - ext(f, 0.07), Lf / 2 + ext(f, 0.07), y - 0.1, y + 0.08, 0, 0.07); }
      }
      if (o.cornice !== false && roof !== 'gable' && facadeType !== 'curtain') for (const f of FACES) {
        const Lf = L(f);
        fbox('trim', f, -Lf / 2 - ext(f, 0.22), Lf / 2 + ext(f, 0.22), h - 0.42, h - 0.12, 0, 0.22);
        fbox('trim', f, -Lf / 2 - ext(f, 0.12), Lf / 2 + ext(f, 0.12), h - 0.62, h - 0.42, 0, 0.12);
      }

      /* --- fenêtres --- */
      const win = (f, s, ys, ww, wh, opt = {}) => {
        const fw = 0.08, gk = opt.lit ?? glassKey();
        if (detail === 0) {   // lointain : cadre et vitre en simples plans (4 triangles)
          fquad('frame', f, s - ww / 2 - fw, s + ww / 2 + fw, ys - fw, ys + wh + fw, 0.01);
          acc.color(glassTint()); fquad(gk, f, s - ww / 2, s + ww / 2, ys, ys + wh, 0.02); acc.color(null);
        } else if (detail >= 2) {
          // cadre en anneau, vitre en retrait, meneau + traverse, appui saillant, linteau
          ring('frame', f, s - ww / 2, s + ww / 2, ys, ys + wh, fw, 0.1);
          acc.color(glassTint()); fquad(gk, f, s - ww / 2, s + ww / 2, ys, ys + wh, 0.03); acc.color(null);
          if (ww > 0.9) bar('frame', f, s - 0.03, s + 0.03, ys, ys + wh, 0.03, 0.075);
          if (wh > 1.1 && !opt.door) bar('frame', f, s - ww / 2, s + ww / 2, ys + wh * 0.68 - 0.03, ys + wh * 0.68 + 0.03, 0.03, 0.075);
          if (!opt.door) fbox('trim', f, s - ww / 2 - 0.16, s + ww / 2 + 0.16, ys - fw - 0.07, ys - fw, 0, 0.2, false);
          if (o.lintel !== false) bar('trim', f, s - ww / 2 - 0.2, s + ww / 2 + 0.2, ys + wh + fw, ys + wh + fw + 0.16, 0, 0.05);
        } else {
          fbox('frame', f, s - ww / 2 - fw, s + ww / 2 + fw, ys - fw, ys + wh + fw, 0, 0.06);
          acc.color(glassTint()); fquad(gk, f, s - ww / 2, s + ww / 2, ys, ys + wh, 0.065); acc.color(null);
          if (!opt.door) fbox('trim', f, s - ww / 2 - 0.14, s + ww / 2 + 0.14, ys - fw - 0.07, ys - fw, 0, 0.16);
        }
        if (opt.shutters) for (const sg of [-1, 1]) {
          const sw = ww / 2, x0 = sg < 0 ? s - ww / 2 - fw - 0.04 - sw : s + ww / 2 + fw + 0.04;
          acc.color(opt.shutters);
          if (detail === 0) fquad('shutter', f, x0, x0 + sw, ys - 0.02, ys + wh + 0.02, 0.01, 0.5); else fbox('shutter', f, x0, x0 + sw, ys - 0.02, ys + wh + 0.02, 0, 0.05, true, 0.5);
          acc.color(null);
        }
      };
      const balcony = (f, s, yb, ww) => {
        const bw = Math.min(ww + 1.0, bays[f].sp - 0.15), dep = 1.0;
        fbox('trim', f, s - bw / 2, s + bw / 2, yb - 0.08, yb + 0.1, 0, dep, false);
        // garde-corps ajouré (texture à barreaux) + main courante
        const P0 = P(f, s - bw / 2 + 0.03, yb + 0.1, dep - 0.03), P1 = P(f, s + bw / 2 - 0.03, yb + 0.1, dep - 0.03);
        const up = V(0, 0.95, 0);
        acc.quad('rail', P0, P1, P1.clone().add(up), P0.clone().add(up), [0, 0], [bw / 1.2, 0], [bw / 1.2, 1], [0, 1], N[f]);
        for (const sg of [-1, 1]) {
          const a = P(f, s + sg * (bw / 2 - 0.03), yb + 0.1, 0.02), b = P(f, s + sg * (bw / 2 - 0.03), yb + 0.1, dep - 0.03);
          acc.quad('rail', a, b, b.clone().add(up), a.clone().add(up), [0, 0], [dep / 1.2, 0], [dep / 1.2, 1], [0, 1]);
        }
        if (detail === 0) return;
        fbox('metal', f, s - bw / 2, s + bw / 2, yb + 1.05, yb + 1.1, dep - 0.06, dep, false);
        for (const sg of [-1, 1]) fbox('metal', f, s + sg * (bw / 2 - 0.03) - 0.025, s + sg * (bw / 2 - 0.03) + 0.025, yb + 1.05, yb + 1.1, 0.02, dep, false);
      };
      const ww0 = o.win ? o.win[0] : 1.3, wh0 = o.win ? o.win[1] : 1.45, shutC = o.shutters && SHUT(o, rand);
      if (facadeType === 'punched') for (const f of faces) {
        const B = bays[f]; if (!B.n) continue;
        let ww = Math.min(ww0, B.sp - 0.7);
        if (o.shutters) ww = Math.min(ww, (B.sp - 0.45) / 2 - 0.1);
        if (ww < 0.45) continue;
        for (let i = 0; i < floors; i++) {
          const yb = i === 0 ? 0 : gfh + (i - 1) * fh, fhi = i === 0 ? gfh : fh;
          if (yb + fhi > h + 0.05) break;
          const bal = o.balcony && i > 0 && (o.balcony !== 'alt' || (i % 2) === 1) && f === (o.balconyFace || '+z');
          for (const s of B.s) {
            if (i === 0 && blocked(f, s, ww / 2 + 0.1)) continue;
            if (bal) {
              const wh = Math.min(fhi - 0.75, 2.2), ys = yb + 0.12;
              win(f, s, ys, Math.min(ww, 1.2), wh, { door: true, shutters: shutC });
              balcony(f, s, yb, Math.min(ww, 1.2));
            } else {
              const wh = Math.min(wh0, fhi - 1.1), ys = yb + Math.max(0.85, (fhi - wh) * 0.55);
              if (i === 0 && ys < plinthH + 0.2) continue;
              win(f, s, ys, ww, wh, { shutters: shutC });
            }
          }
        }
        // lucarne de pignon
        if (roof === 'gable' && (f === '+x' || f === '-x') && o.attic !== false) {
          const rise = o.rise ?? Math.min(d * 0.35, 3.2), ww2 = 0.7, wh2 = 0.8, y0 = h + 0.35;
          const halfAt = (y) => (d / 2) * (1 - (y - h) / rise);
          if (halfAt(y0 + wh2 + 0.2) > ww2 / 2 + 0.25) win(f, 0, y0, ww2, wh2, { shutters: false });
        }
      }
      if (facadeType === 'ribbon') for (const f of faces) {
        const Lf = L(f), m = 0.6;
        for (let i = 1; i < floors; i++) {
          const yb = gfh + (i - 1) * fh, ys = yb + 0.9, wh = fh - 1.3;
          if (yb + fh > h + 0.05) break;
          const n = Math.max(1, Math.round((Lf - 2 * m) / 1.6)), sp = (Lf - 2 * m) / n;
          const st = detail === 0 ? 4 : 1;   // de loin : vitrages groupés par 4 travées
          for (let k = 0; k < n; k += st) { acc.color(glassTint()); fquad(glassKey(), f, -Lf / 2 + m + k * sp, -Lf / 2 + m + Math.min(n, k + st) * sp, ys, ys + wh, 0.02); }
          acc.color(null);
          fbox('trim', f, -Lf / 2 + m - 0.1, Lf / 2 - m + 0.1, ys - 0.12, ys, 0, 0.18);
        }
        // montants verticaux sur toute la hauteur (un par travée, pas un par étage)
        const n = Math.max(1, Math.round((Lf - 2 * m) / 1.6)), sp = (Lf - 2 * m) / n;
        if (detail > 0) for (let k = 0; k <= n; k++) { const s = -Lf / 2 + m + k * sp; bar('frame', f, s - 0.05, s + 0.05, gfh + 0.5, h - 0.7, 0, 0.12); }
      }
      if (facadeType === 'curtain') for (const f of FACES) {
        const Lf = L(f), cell = o.cell ?? 1.6, n = Math.max(1, Math.round(Lf / cell)), sp = Lf / n;
        for (let i = 1; i < floors + (h - (gfh + (floors - 1) * fh) > 1 ? 1 : 0); i++) {
          const yb = gfh + (i - 1) * fh, top = Math.min(h, yb + fh);
          const st = detail === 0 ? 4 : 1;
          for (let k = 0; k < n; k += st) { acc.color(glassTint()); fquad(glassKey(), f, -Lf / 2 + k * sp, -Lf / 2 + Math.min(n, k + st) * sp, yb, top, 0); }
          acc.color(null);
          fbox('frame', f, -Lf / 2 - ext(f, 0.1), Lf / 2 + ext(f, 0.1), yb - 0.12, yb + 0.5, 0, 0.1);
        }
        if (detail > 0) for (let k = 1; k < n; k++) { const s = -Lf / 2 + k * sp; bar('frame', f, s - 0.05, s + 0.05, gfh, h, 0, 0.14); }
        for (const sg of [-1, 1]) fbox('frame', f, sg > 0 ? Lf / 2 - 0.35 : -Lf / 2, sg > 0 ? Lf / 2 : -Lf / 2 + 0.35, gfh, h, 0, 0.16);
        fbox('frame', f, -Lf / 2 - ext(f, 0.12), Lf / 2 + ext(f, 0.12), h - 0.5, h, 0, 0.12);
      }

      /* --- ouvertures du rez : portes, entrées vitrées, vitrines, portes de garage --- */
      for (const f of FACES) for (const g of ground[f]) {
        const s0 = g.s0, s1 = g.s1, sw = s1 - s0, sc = (s0 + s1) / 2;
        if (g.type === 'door' || g.type === 'entry') {
          const dh = Math.min(g.h ?? (g.type === 'entry' ? 2.5 : 2.2), gfh - 0.45), fw = 0.12;
          fbox('trim', f, s0 - fw, s0, 0, dh + fw, 0, 0.14); fbox('trim', f, s1, s1 + fw, 0, dh + fw, 0, 0.14); fbox('trim', f, s0 - fw, s1 + fw, dh, dh + fw + 0.06, 0, 0.16);
          if (g.type === 'door') {
            fquad('door', f, s0, s1, 0.16, dh, 0.03, 1, 0, [0, 0, 1, 1]);
            acc.color(glassTint()); fquad('glass', f, s0 + sw * 0.25, s1 - sw * 0.25, dh - 0.55, dh - 0.12, 0.04); acc.color(null);
            fbox('metal', f, s1 - 0.14, s1 - 0.1, 1.0, 1.06, 0.03, 0.1);
          } else {
            acc.color(glassTint()); fquad('lit', f, s0, s1, 0.16, dh, 0.03); acc.color(null);
            fbox('frame', f, sc - 0.03, sc + 0.03, 0.16, dh, 0.03, 0.08); fbox('frame', f, s0, s1, dh - 0.5, dh - 0.45, 0.03, 0.08);
            fbox('metal', f, sc - 0.12, sc - 0.08, 0.8, 1.6, 0.03, 0.12); fbox('metal', f, sc + 0.08, sc + 0.12, 0.8, 1.6, 0.03, 0.12);
          }
          fbox('plinth', f, s0 - 0.35, s1 + 0.35, 0, 0.16, 0, 0.55, false, tile);   // marche
          if (o.canopy !== false) {   // auvent sur consoles
            const cw = sw + 0.5, cd = g.type === 'entry' ? 1.6 : 0.9, cy = dh + 0.3;
            fbox(g.type === 'entry' ? 'fascia' : 'roofTrim', f, sc - cw / 2, sc + cw / 2, cy, cy + 0.1, 0, cd, false);
            for (const sg of [-1, 1]) fbox('metal', f, sc + sg * (cw / 2 - 0.1) - 0.03, sc + sg * (cw / 2 - 0.1) + 0.03, cy - 0.35, cy, 0, cd * 0.7);
            if (g.type === 'entry') fbox('lit', f, sc - 0.3, sc + 0.3, cy - 0.04, cy, 0.4, 0.7, false);
          }
        } else if (g.type === 'shop') {
          const sh = gfh - 0.95;
          for (const s of [s0 - 0.35, s1]) fbox('trim', f, s, s + 0.35, 0, gfh - 0.1, 0, 0.12);         // pilastres
          fbox(lobby ? 'frame' : 'fascia', f, s0 - 0.35, s1 + 0.35, sh + 0.05, gfh - 0.15, 0, 0.16);  // bandeau d'enseigne
          fbox('dark', f, s0, s1, 0, 0.5, 0, 0.06);                                                    // allège
          const n = Math.max(2, Math.round(sw / 2.2)), sp = sw / n, dk = Math.floor(n / 2);
          for (let k = 0; k < n; k++) {
            const a = s0 + k * sp, b = a + sp;
            if (k === dk) { acc.color(glassTint()); fquad('shop', f, a + 0.1, b - 0.1, 0.05, sh - 0.25, 0.04); acc.color(null); fbox('metal', f, (a + b) / 2 - 0.02, (a + b) / 2 + 0.02, 0.9, 1.5, 0.04, 0.1); }
            else { acc.color(glassTint()); fquad('shop', f, a, b, 0.5, sh, 0.03); acc.color(null); }
          }
          for (let k = 0; k <= n; k++) fbox('frame', f, s0 + k * sp - 0.05, s0 + k * sp + 0.05, 0, sh, 0, 0.09);
          fbox('frame', f, s0, s1, sh - 0.25, sh - 0.18, 0, 0.09);
          if (o.awning !== false && !lobby) {   // store banne rayé + lambrequin
            const ay = sh - 0.05, ad = 1.2, a0 = P(f, s0, ay + 0.55, 0.16), a1 = P(f, s1, ay + 0.55, 0.16), b0 = P(f, s0, ay, ad), b1 = P(f, s1, ay, ad);
            acc.color(o.awningColor); acc.quad('awning', a0, a1, b1, b0, [0, 0], [sw, 0], [sw, 1], [0, 1], V(0, 1, 0).add(N[f]));
            fbox('awning', f, s0, s1, ay - 0.28, ay, ad - 0.02, ad, false, 1); acc.color(null);
            for (const s of [s0, s1]) { const p0 = P(f, s, ay + 0.55, 0.16), p1 = P(f, s, ay, ad); acc.quad('awning', p0, p1, P(f, s, ay - 0.28, ad), P(f, s, ay + 0.27, 0.16), [0, 0], [1, 0], [1, 1], [0, 1]); }
          }
        } else if (g.type === 'bay') {
          const fw = 0.25;
          fbox('trim', f, s0 - fw, s0, 0, g.h + fw, 0, 0.1); fbox('trim', f, s1, s1 + fw, 0, g.h + fw, 0, 0.1); fbox('trim', f, s0 - fw, s1 + fw, g.h, g.h + fw, 0, 0.12);
        } else if (g.type === 'garage') {
          const gh = Math.min(g.h ?? 2.4, gfh - 0.3), fw = 0.18;
          fbox('trim', f, s0 - fw, s0, 0, gh + fw, 0, 0.12); fbox('trim', f, s1, s1 + fw, 0, gh + fw, 0, 0.12); fbox('trim', f, s0 - fw, s1 + fw, gh, gh + fw, 0, 0.14);
          fquad('garage', f, s0, s1, 0, gh, 0.03, gh);
        }
      }

      /* --- toit --- */
      if (roof === 'gable') {
        const rise = o.rise ?? Math.min(d * 0.35, 3.2), e = o.eave ?? 0.45, v = o.verge ?? 0.3, t = 0.18;
        const k = rise / (d / 2), xv = w / 2 + v, yR = h + rise, ze = d / 2 + e, yE = h - k * e;
        const slope = Math.hypot(ze, yR - yE);
        // pignons maçonnés (même enduit que les murs, affleurants)
        acc.color(tint);
        for (const sg of [-1, 1]) {
          const x = sg * w / 2, uo = sg > 0 ? w : 2 * w + d;
          acc.tri('wall', V(x, h, -d / 2 * sg), V(x, h, d / 2 * sg), V(x, yR, 0), [uo / tile, h / tile], [(uo + d) / tile, h / tile], [(uo + d / 2) / tile, yR / tile], V(sg, 0, 0));
        }
        acc.color(null);
        for (const sg of [-1, 1]) {
          const z = sg * ze;
          // couverture (dessus), sous-face, planche de rive (égout), rives latérales
          acc.quad('roof', V(-xv, yR + t, 0), V(xv, yR + t, 0), V(xv, yE + t, z), V(-xv, yE + t, z), [-xv / 2, slope / 2], [xv / 2, slope / 2], [xv / 2, 0], [-xv / 2, 0], V(0, 1, sg));
          acc.quad('under', V(-xv, yR, 0), V(xv, yR, 0), V(xv, yE, z), V(-xv, yE, z), [0, 0], [1, 0], [1, 1], [0, 1], V(0, -1, -sg * 0.1));
          acc.quad('roofTrim', V(-xv, yE, z), V(xv, yE, z), V(xv, yE + t, z), V(-xv, yE + t, z), [0, 0], [1, 0], [1, 1], [0, 1], V(0, 0, sg));
          for (const sx of [-1, 1]) acc.quad('roofTrim', V(sx * xv, yR, 0), V(sx * xv, yE, z), V(sx * xv, yE + t, z), V(sx * xv, yR + t, 0), [0, 0], [1, 0], [1, 1], [0, 1], V(sx, 0, 0));
          // gouttière pendante + descente d'eau pluviale avec coude
          acc.box('metal', -xv + 0.05, yE - 0.16, z + sg * 0.01, xv - 0.05, yE + 0.02, z + sg * 0.17, 1);
          if (o.gutters !== false && detail > 0) {
            const xd = w / 2 - 0.25, zw = sg * (d / 2 + 0.06), zs = sg * (d / 2 + 0.16);
            acc.box('metal', xd - 0.05, 0.05, zw, xd + 0.05, yE - 0.5, zs, 1);
            acc.box('metal', xd - 0.05, yE - 0.5, zw, xd + 0.05, yE - 0.16, z + sg * 0.08, 1);
          }
        }
        acc.box('roofTrim', -xv - 0.02, yR + t - 0.06, -0.16, xv + 0.02, yR + t + 0.14, 0.16, 1);   // faîtage
        if (o.chimney !== false) {
          const cx = w * 0.27, cz = -d * 0.18, ch = yR + 0.9;
          acc.box('chimney', cx - 0.4, h, cz - 0.4, cx + 0.4, ch, cz + 0.4, 1, ['-y']);
          acc.box('trim', cx - 0.5, ch, cz - 0.5, cx + 0.5, ch + 0.12, cz + 0.5, 1);
          acc.box('dark', cx - 0.12, ch + 0.12, cz - 0.12, cx + 0.12, ch + 0.4, cz + 0.12, 1);
        }
      } else if (roof === 'flat') {
        const ph = o.parapet ?? 0.9, it = 0.3, top = h + ph;
        // faces intérieures de l'acrotère, couvertine, dalle gravillonnée
        acc.color(tint);
        for (const f of FACES) { const Lf = L(f) - 2 * it; fquad('wall', f, -Lf / 2, Lf / 2, h + 0.1, top, -it, tile, 0, null, true); }
        acc.color(null);
        for (const f of FACES) {
          const Lf = L(f);
          fbox('trim', f, -Lf / 2 - ext(f, 0.06), Lf / 2 + ext(f, 0.06), top, top + 0.08, -it - 0.04, 0.06, false);
        }
        acc.quad('roofFlat', V(-w / 2 + it, h + 0.1, d / 2 - it), V(w / 2 - it, h + 0.1, d / 2 - it), V(w / 2 - it, h + 0.1, -d / 2 + it), V(-w / 2 + it, h + 0.1, -d / 2 + it),
          [-w / 8, d / 8], [w / 8, d / 8], [w / 8, -d / 8], [-w / 8, -d / 8], V(0, 1, 0));
        if (o.equip !== false && w > 6 && d > 6) {
          // édicule d'escalier avec porte, groupes de clim à grille, citerne, mât
          const bw = Math.min(3.6, w * 0.25), bd = Math.min(3.2, d * 0.25), bx = -w / 2 + it + 0.6 + bw / 2, bz = -d / 2 + it + 0.6 + bd / 2, bh = 2.6;
          acc.color(tint); acc.box('wall', bx - bw / 2, h + 0.1, bz - bd / 2, bx + bw / 2, h + 0.1 + bh, bz + bd / 2, tile, ['-y']); acc.color(null);
          acc.box('trim', bx - bw / 2 - 0.1, h + 0.1 + bh, bz - bd / 2 - 0.1, bx + bw / 2 + 0.1, h + 0.25 + bh, bz + bd / 2 + 0.1, 1);
          acc.quad('door', V(bx - 0.45, h + 0.1, bz + bd / 2 + 0.02), V(bx + 0.45, h + 0.1, bz + bd / 2 + 0.02), V(bx + 0.45, h + 2.1, bz + bd / 2 + 0.02), V(bx - 0.45, h + 2.1, bz + bd / 2 + 0.02), [0, 0], [0.45, 0], [0.45, 1], [0, 1], V(0, 0, 1));
          const n = Math.min(5, 1 + Math.floor((w * d) / 250));
          for (let i = 0; i < n; i++) {
            const ux = w / 2 - it - 1.6 - i * 2.4, uz = d / 2 - it - 1.4 - (i % 2) * 2.2;
            if (ux < bx + bw / 2 + 1.2) break;
            acc.box('metal', ux - 0.8, h + 0.1, uz - 0.6, ux + 0.8, h + 1.1, uz + 0.6, 1, ['-y']);
            acc.box('dark', ux - 0.45, h + 1.1, uz - 0.45, ux + 0.45, h + 1.14, uz + 0.45, 1, ['-y']);
          }
          if (o.tank) acc.cyl('metal', w * 0.2, h + 0.1, -d * 0.18, 1.5, 2.6, 14);
          if (o.mast) { acc.box('metal', w * 0.15 - 0.08, h + 0.1, d * 0.15 - 0.08, w * 0.15 + 0.08, h + 0.1 + o.mast, d * 0.15 + 0.08, 1); acc.box('lit', w * 0.15 - 0.2, h + o.mast, d * 0.15 - 0.2, w * 0.15 + 0.2, h + 0.3 + o.mast, d * 0.15 + 0.2, 1); }
        }
      }
    }
    const SHUT = (o, rand) => (typeof o.shutters === 'string' ? o.shutters : ['#3f6b4a', '#6b8fa8', '#8a4b3a', '#d8c690', '#7a8a96'][Math.floor(rand() * 5)]);

    /* ---------- maillages ---------- */
    // seules les grandes pièces (murs, toits, cheminées) projettent une ombre : les cadres, appuis et volets doublaient la passe d'ombre
    const castKey = (k) => /^(wall|roof|chimney|plinth)/.test(k) && !k.startsWith('roofFlat');
    function group(geos, mats, { cast = true, receive = true } = {}) {
      const g = new THREE.Group();
      for (const k in geos) { const m = new THREE.Mesh(geos[k], mats[k] || mats.trim); m.castShadow = cast && castKey(k); m.receiveShadow = receive; g.add(m); }
      return g;
    }
    function instanced(geos, mats, matrices, { cast = true } = {}) {
      const g = new THREE.Group();
      for (const k in geos) {
        const m = new THREE.InstancedMesh(geos[k], mats[k] || mats.trim, Math.max(1, matrices.length));
        matrices.forEach((x, i) => m.setMatrixAt(i, x)); m.count = matrices.length; m.instanceMatrix.needsUpdate = true;
        m.castShadow = cast && castKey(k); m.receiveShadow = true; m.frustumCulled = false;
        g.add(m);
      }
      return g;
    }
    // matériaux pilotés par la nuit (0 = jour, 1 = nuit)
    function setNight(mats, n) { if (mats.lit) mats.lit.emissiveIntensity = 1.4 * n; if (mats.shop) mats.shop.emissiveIntensity = 1.1 * n; }

    /* Ville par zones (côté chunk, en m) à deux versions : détaillée (de près) et simplifiée detail 0 (de loin). assets/quality.js
       choisit selon la distance de la caméra à la zone (userData.lod, userData.lodC = [x, z, rayon]). Au niveau Bas, seule la
       version simplifiée est construite. La version détaillée tire les nombres aléatoires du jeu comme avant (plan de ville inchangé),
       la simplifiée rejoue les mêmes tirages.
       const city = K.lodCity(120); city.building(x, y, z, yaw, opts, keys); scene.add(city.group(mats)); */
    function lodCity(chunk = 120) {
      const cells = new Map();
      return {
        building(x, y, z, yaw, o, keys = null) {
          const k = Math.floor(x / chunk) + ',' + Math.floor(z / chunk);
          let c = cells.get(k);
          if (!c) cells.set(k, c = { i: Math.floor(x / chunk), j: Math.floor(z / chunk), near: QDETAIL > 0 ? new Acc() : null, far: new Acc(), h: 0 });
          c.h = Math.max(c.h, y + (o.h || 0));
          const src = o.rand || Math.random, rec = [];
          if (c.near) { c.near.at(x, y, z, yaw).keys(keys); building(c.near, { ...o, rand: () => { const v = src(); rec.push(v); return v; } }); }
          let n = 0;
          c.far.at(x, y, z, yaw).keys(keys); building(c.far, { ...o, detail: 0, rand: c.near ? () => (n < rec.length ? rec[n++] : 0.5) : src });
        },
        group(mats) {
          const g = new THREE.Group();
          for (const c of cells.values()) {
            const lodC = [(c.i + 0.5) * chunk, (c.j + 0.5) * chunk, chunk * 0.71];
            for (const lod of ['near', 'far']) {
              if (!c[lod]) continue;
              const geos = c[lod].geometries();
              for (const key in geos) {
                const m = new THREE.Mesh(geos[key], mats[key] || mats.trim); m.castShadow = castKey(key); m.receiveShadow = true;
                if (c.near) { m.userData.lod = lod; m.userData.lodC = lodC; }
                g.add(m);
              }
            }
          }
          return g;
        },
      };
    }

    // Bâtiments types placés à plusieurs endroits : chaque exemplaire est fusionné dans sa zone (lodCity), et les types qui ont un
    // matériau identique (même couleur, même texture) le partagent : un appel de dessin par zone et par matériau au lieu d'un par
    // type. types : [{ opts, mats, places: [[x, y, z, yaw], ...] }] ; renvoie le groupe à ajouter à la scène.
    function cityOfTypes(types, chunk = 240) {
      const city = lodCity(chunk), all = {}, sig = new Map();
      const S = (m) => [m.type, m.map ? m.map.uuid : '', m.color ? m.color.getHexString() : '', m.emissive ? m.emissive.getHexString() : '', m.emissiveIntensity, m.roughness, m.metalness, m.transparent, m.opacity, m.vertexColors, m.polygonOffset, m.side].join('|');
      for (const t of types) {
        const keys = {};
        for (const k in t.mats) {
          const sg = k + '|' + S(t.mats[k]);
          if (!sig.has(sg)) { const nk = k + '_' + sig.size; sig.set(sg, nk); all[nk] = t.mats[k]; if (!all.trim && k === 'trim') all.trim = t.mats[k]; }
          keys[k] = sig.get(sg);
        }
        for (const [x, y, z, yaw] of t.places) city.building(x, y, z, yaw, t.opts, keys);
      }
      return city.group(all);
    }

    return { acc: () => new Acc(), materials, building, group, instanced, setNight, lodCity, cityOfTypes, wallTex, roofTex, Acc };
  };
  kit.cast = (k) => /^(wall|roof|chimney|plinth)/.test(k) && !k.startsWith('roofFlat');
  globalThis.BuildingKit = kit;
})();
