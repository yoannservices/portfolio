

/* --- Project data --- */
/* Chaque projet a son dépôt GitHub (code) et sa démo GitHub Pages */
const GH_USER = 'yoannservices';
const repoLinks = repo => [
  { label:"Démo", url:`https://${GH_USER}.github.io/${repo}/`, icon:"fas fa-arrow-up-right-from-square" },
  { label:"Code", url:`https://github.com/${GH_USER}/${repo}`, icon:"fab fa-github" },
];

const PROJECTS = [
  { title:"PC Builder Pro", desc:"Configurateur de PC avec sélection de composants, vérification de compatibilité et estimation des performances.", badge:"Outil web", icon:"fas fa-microchip", category:"web", tags:["JavaScript","Logique métier","Interface"], links:repoLinks("pc-builder") },
  { title:"API Dashboard", desc:"Tableau de bord réunissant des données en temps réel (météo, crypto, adresse IP, NASA et ISS).", badge:"Dashboard", icon:"fas fa-satellite-dish", category:"web", tags:["API REST","JavaScript","Données"], links:repoLinks("api-dashboard") },
  { title:"Conjugator", desc:"Analyseur de formes verbales françaises : retrouve le mode, le temps et la personne d'un verbe conjugué.", badge:"Outil web", icon:"fas fa-language", category:"web", tags:["JavaScript","JSON","Recherche"], links:repoLinks("conjugator") },
  { title:"Game Tools Lab", desc:"Suite d'outils et de calculateurs pour tester des performances et périphériques de jeu.", badge:"Suite web", icon:"fas fa-sliders", category:"web", tags:["JavaScript","Outils interactifs","UI modulaire"], links:repoLinks("game-tools-lab") },
  { title:"Habit Tracker", desc:"Application de suivi d'habitudes avec statistiques, séries et vue mensuelle.", badge:"Application web", icon:"fas fa-chart-line", category:"web", tags:["React","JavaScript","Visualisation"], links:repoLinks("habit-tracker") },
  { title:"CSS Animator", desc:"Éditeur visuel d'animations CSS avec aperçu en direct et export de code.", badge:"Outil web", icon:"fas fa-wand-magic-sparkles", category:"web", tags:["JavaScript","CSS","Animations"], links:repoLinks("css-animator") },
  { title:"Générateur de CV", desc:"Formulaire avec aperçu en direct et export PDF du CV.", badge:"Outil web", icon:"fas fa-file-lines", category:"web", tags:["JavaScript","Formulaires","PDF"], links:repoLinks("generateur-cv") },
  { title:"Tableau Périodique", desc:"Les 118 éléments chimiques dans un tableau interactif avec fiches détaillées.", badge:"Éducation", icon:"fas fa-flask", category:"web", tags:["JavaScript","Données","Interface"], links:repoLinks("tableau-periodique") },
  { title:"Sky Pilot", desc:"Simulateur de vol avec pistes, relief, météo et modèle de vol interactif (F-35B, PV-40 à aile basculante).", badge:"Simulation 3D", icon:"fas fa-plane", category:"simulation", tags:["JavaScript","Three.js","Physique de vol"], links:repoLinks("sky-pilot") },
  { title:"Moto Rider", desc:"Moto sur une route de col, avec inclinaison, rapports et physique de conduite.", badge:"Simulation 3D", icon:"fas fa-motorcycle", category:"simulation", tags:["JavaScript","Three.js","Simulation"], links:repoLinks("moto-rider") },
  { title:"Rail Express", desc:"Conduite ferroviaire en France : composition du train, itinéraire entre vraies gares, signalisation BAL/TVM, KVB et procédures de mise en service.", badge:"Simulation 3D", icon:"fas fa-train", category:"simulation", tags:["JavaScript","Three.js","Signalisation"], links:repoLinks("rail-express") },
  { title:"FPV Racer", desc:"Drone FPV en acro : rates Betaflight, propwash, chute de tension batterie et vidéo analogique. Tunnels, bando, course chronométrée et suivi de voitures en drift.", badge:"Simulation 3D", icon:"fas fa-helicopter", category:"simulation", tags:["JavaScript","Three.js","Physique"], links:repoLinks("fpv-racer") },
  { title:"Drift King", desc:"Drift en voiture sur une route de montagne, avec score et glisse contrôlée.", badge:"Simulation 3D", icon:"fas fa-car-side", category:"simulation", tags:["JavaScript","Three.js","Physique"], links:repoLinks("drift-king") },
  { title:"Banc d'essai moteur", desc:"Banc d'essai moteur avec boîte de vitesses, pédales et sons moteur.", badge:"Simulation", icon:"fas fa-gauge-high", category:"simulation", tags:["JavaScript","Web Audio","Simulation"], links:repoLinks("banc-essai-moteur") },
  { title:"Kukirin", desc:"Simulation de trottinette électrique avec livraisons, quêtes et garage.", badge:"Simulation 3D", icon:"fas fa-bicycle", category:"simulation", tags:["JavaScript","Three.js","Systèmes de jeu"], links:repoLinks("kukirin") },
  { title:"Trottinette Freestyle", desc:"Skatepark 3D : whips, barspins, flips et grinds avec système de combos.", badge:"Simulation 3D", icon:"fas fa-person-skating", category:"simulation", tags:["JavaScript","Three.js","Gameplay"], links:repoLinks("trottinette-freestyle") },
  { title:"Tesla Roadster", desc:"Roadster 3D dans une ville procédurale : murs, plafonds, vol, boost et tonneaux, avec trafic et cycle jour/nuit.", badge:"Simulation 3D", icon:"fas fa-car", category:"simulation", tags:["JavaScript","Three.js","Physique"], links:repoLinks("tesla-roadster") },
  { title:"Monde Ouvert", desc:"Île 3D de 8 km (ville, aéroport, campagne, forêt, désert, montagnes, île) avec 11 véhicules à choisir sur une roue façon GTA : voitures, motos, trottinettes, hélicoptères, avions et drone.", badge:"Monde ouvert 3D", icon:"fas fa-earth-europe", category:"simulation", tags:["JavaScript","Three.js","Physique"], links:repoLinks("monde-ouvert") },
  { title:"QuickPlay", desc:"15 mini-jeux arcade dans le navigateur : 2048, snake, tower defense, blackjack…", badge:"Jeux", icon:"fas fa-gamepad", category:"simulation", tags:["JavaScript","Canvas","Jeux"], links:repoLinks("quick-play") },
  { title:"Radar de proximité", desc:"Circuit Arduino simulé avec capteurs ultrasoniques, avertisseurs sonores et LEDs.", badge:"Électronique", icon:"fas fa-satellite-dish", category:"arduino", tags:["Arduino","Tinkercad","Capteurs"], links:[{label:"Voir sur Tinkercad", url:"https://www.tinkercad.com/things/cdZFdnbTa4a-radar-de-recul", icon:"fas fa-microchip"}] },
];

/* --- State --- */
let currentMode = '3d';
let particlesRAF = null;
let particles = [];

/* --- Init --- */
document.addEventListener('DOMContentLoaded', () => {
  // Force 3D mode
  document.body.classList.add('mode-3d');
  initHamburger();
  initNavHighlight();
  initReveal();
  renderProjects();
  initFilters();
  initSkillRings();
  initSmoothScroll();
  initParticles();
  initTilt();
  initCardGlow();
  initTimeline();
  initOrDestroyHero3D('3d');
});



/* ------------- HAMBURGER ------------- */
function initHamburger() {
  const btn = document.getElementById('hamburger');
  const menu = document.getElementById('nav-menu');
  if (!btn || !menu) return;
  btn.addEventListener('click', () => menu.classList.toggle('active'));
  menu.querySelectorAll('.nav-link').forEach(a => {
    a.addEventListener('click', () => menu.classList.remove('active'));
  });
}

/* ------------- NAV HIGHLIGHT ------------- */
function initNavHighlight() {
  const links = document.querySelectorAll('.nav-link');
  const sections = [...document.querySelectorAll('section[id]')];
  if (!sections.length) return;
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        const id = e.target.id;
        links.forEach(l => l.classList.toggle('active', l.getAttribute('href') === '#' + id));
      }
    });
  }, { rootMargin: '-40% 0px -55% 0px' });
  sections.forEach(s => obs.observe(s));
}

/* ------------- SMOOTH SCROLL ------------- */
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const target = document.querySelector(a.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });
}

/* ------------- REVEAL ------------- */
function initReveal() {
  const items = document.querySelectorAll('.reveal:not(.is-visible)');
  if (!items.length) return;
  const obs = new IntersectionObserver(entries => {
    entries.forEach((e, i) => {
      if (e.isIntersecting) {
        setTimeout(() => e.target.classList.add('is-visible'), i * 80);
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.12 });
  items.forEach(el => obs.observe(el));
}

/* ------------- PROJECTS ------------- */
function renderProjects(filter) {
  const grid = document.getElementById('projects-grid');
  if (!grid) return;
  const list = (!filter || filter === 'all') ? PROJECTS : PROJECTS.filter(p => p.category === filter);
  grid.innerHTML = list.map((p, i) => `
    <article class="project-card reveal tilt-card" data-cat="${p.category}" onclick="openProjectModal(${PROJECTS.indexOf(p)})" style="cursor:pointer">
      <div class="project-topline">
        <span class="card-badge">${p.badge}</span>
        <i class="${p.icon}"></i>
      </div>
      <h3>${p.title}</h3>
      <p class="project-text">${p.desc}</p>
      <div class="project-tags tech-tags">
        ${p.tags.map(t => `<span class="tech-tag">${t}</span>`).join('')}
      </div>
      ${p.links ? `<div class="project-links">${p.links.map(l => `<a class="btn-outline-minimal" href="${l.url}" target="_blank" rel="noreferrer" onclick="event.stopPropagation()"><i class="${l.icon}"></i> ${l.label}</a>`).join('')}</div>` : ''}
    </article>
  `).join('');

  // re-init reveal + tilt + glow for new cards
  initReveal();
  attachTilt(grid.querySelectorAll('.tilt-card'));
  initCardGlow();
}

function initFilters() {
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderProjects(btn.dataset.filter);
    });
  });
}

/* ------------- SKILL RINGS (3D) ------------- */
function initSkillRings() {
  const orbs = document.querySelectorAll('.skill-orb[data-level]');
  if (!orbs.length) return;
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.style.setProperty('--percent', e.target.dataset.level);
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.3 });
  orbs.forEach(o => obs.observe(o));
}

/* ------------- PARTICLES (3D) ------------- */
function initParticles() {
  const canvas = document.getElementById('particles-canvas');
  if (!canvas) return;
  if (particlesRAF) return; // already running

  const ctx = canvas.getContext('2d');
  let W, H;

  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  if (particles.length === 0) {
    for (let i = 0; i < 70; i++) {
      particles.push({
        x: Math.random() * W,
        y: Math.random() * H,
        r: Math.random() * 1.8 + .6,
        dx: (Math.random() - .5) * .35,
        dy: (Math.random() - .5) * .35,
        a: Math.random() * .4 + .1
      });
    }
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    particles.forEach((p, i) => {
      p.x += p.dx; p.y += p.dy;
      if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
      if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(162,155,254,${p.a})`;
      ctx.fill();
      // connections
      for (let j = i + 1; j < particles.length; j++) {
        const q = particles[j];
        const d = Math.hypot(p.x - q.x, p.y - q.y);
        if (d < 150) {
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(q.x, q.y);
          ctx.strokeStyle = `rgba(162,155,254,${.08 * (1 - d / 150)})`;
          ctx.stroke();
        }
      }
    });
    particlesRAF = requestAnimationFrame(draw);
  }
  draw();
}

function stopParticles() {
  if (particlesRAF) {
    cancelAnimationFrame(particlesRAF);
    particlesRAF = null;
    const canvas = document.getElementById('particles-canvas');
    if (canvas) { const ctx = canvas.getContext('2d'); ctx.clearRect(0, 0, canvas.width, canvas.height); }
  }
}

/* ------------- TILT (3D) ------------- */
function attachTilt(cards) {
  cards.forEach(card => {
    if (card._tiltBound) return;
    card._tiltBound = true;
    card.addEventListener('mousemove', e => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - .5;
      const y = (e.clientY - r.top) / r.height - .5;
      card.style.transform = `perspective(600px) rotateY(${x * 8}deg) rotateX(${-y * 8}deg) scale(1.02)`;
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
    });
  });
}

function initTilt() {
  attachTilt(document.querySelectorAll('.tilt-card'));
}

function removeTilt() {
  document.querySelectorAll('.tilt-card').forEach(card => {
    card.style.transform = '';
  });
}

/* ------------- CARD GLOW (3D) ------------- */
function initCardGlow() {
  document.querySelectorAll('.project-card, .about-card, .contact-card').forEach(card => {
    if (card._glowBound) return;
    card._glowBound = true;
    card.addEventListener('mousemove', e => {
      const r = card.getBoundingClientRect();
      card.style.setProperty('--mouse-x', (e.clientX - r.left) + 'px');
      card.style.setProperty('--mouse-y', (e.clientY - r.top)  + 'px');
    });
  });
}

/* ------------- PROJECT MODAL ------------- */
const PROJECT_DETAILS = {
  "PC Builder Pro": "Configurateur interactif de composants PC avec vérification de compatibilité et estimation des performances.",
  "API Dashboard": "Tableau de bord connecté à plusieurs sources de données web et présentant des informations actualisées.",
  "Habit Tracker": "Suivi d'habitudes avec historique, séries et visualisations de progression.",
  "Game Tools Lab": "Collection modulaire de tests et calculateurs dédiés aux jeux et aux périphériques.",
  "Sky Pilot": "Projet de simulation avec vue cockpit, météo, terrain, commandes de vol et effets visuels.",
  "Kukirin": "Simulation interactive avec déplacements, téléphone en jeu, livraisons, missions et garage.",
  "CSS Animator": "Éditeur visuel d'animations CSS avec prévisualisation en direct et export du code."
};

function openProjectModal(index) {
  const p = PROJECTS[index];
  if (!p) return;
  const modal = document.getElementById('project-modal');
  document.getElementById('modal-icon').innerHTML = `<i class="${p.icon}"></i>`;
  document.getElementById('modal-badge').textContent = p.badge;
  document.getElementById('modal-title').textContent = p.title;
  document.getElementById('modal-desc').textContent = p.desc;
  document.getElementById('modal-tags').innerHTML = p.tags.map(t => `<span class="tech-tag">${t}</span>`).join('');
  document.getElementById('modal-links').innerHTML = p.links ? p.links.map(l => `<a class="btn-outline-minimal" href="${l.url}" target="_blank" rel="noreferrer"><i class="${l.icon}"></i> ${l.label}</a>`).join('') : '';
  const detail = PROJECT_DETAILS[p.title];
  document.getElementById('modal-details').innerHTML = detail ? `<strong>Details du projet :</strong><br>${detail}` : `<em>Categorie : ${p.category}</em>`;
  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeProjectModal() {
  document.getElementById('project-modal').classList.remove('open');
  document.body.style.overflow = '';
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeProjectModal();
});

/* ═══════════════════════════════════════
   TIMELINE — horizontal scroll with arrows
═══════════════════════════════════════ */
function initTimeline() {
  const track = document.getElementById('timeline-track');
  const prev  = document.getElementById('tl-prev');
  const next  = document.getElementById('tl-next');
  if (!track || !prev || !next) return;
  const step = 260;
  prev.addEventListener('click', () => { track.scrollBy({ left: -step, behavior: 'smooth' }); });
  next.addEventListener('click', () => { track.scrollBy({ left: step, behavior: 'smooth' }); });
}

/* ============================================================
   THREE.JS — Hero 3D Scene
   ============================================================ */
let hero3D = null;

function initHero3D() {
  const canvas = document.getElementById('hero-3d-canvas');
  if (!canvas || hero3D) return;
  if (typeof THREE === 'undefined') return;

  const scene = new THREE.Scene();
  const container = canvas.parentElement;

  // Renderer
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputEncoding = THREE.sRGBEncoding;

  // Camera
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
  camera.position.set(0, 0, 6);

  // Pointer interaction keeps the scene rotating even without input.
  const interaction = {
    dragging: false,
    lastX: 0,
    lastY: 0,
    rotationX: 0,
    rotationY: 0,
    velocityX: 0,
    velocityY: 0
  };

  // Materials
  const matPurple = new THREE.MeshStandardMaterial({ color: 0xa855f7, roughness: 0.3, metalness: 0.7 });
  const matCyan = new THREE.MeshStandardMaterial({ color: 0x00cec9, roughness: 0.3, metalness: 0.7 });
  const matWire1 = new THREE.MeshStandardMaterial({ color: 0xa29bfe, wireframe: true, transparent: true, opacity: 0.5 });
  const matWire2 = new THREE.MeshStandardMaterial({ color: 0x00cec9, wireframe: true, transparent: true, opacity: 0.4 });
  const matGlass = new THREE.MeshPhysicalMaterial({
    color: 0xa855f7, roughness: 0.05, metalness: 0.1,
    transmission: 0.9, thickness: 1.5, transparent: true, opacity: 0.6
  });

  // Group for all objects
  const group = new THREE.Group();
  scene.add(group);

  // Geometries
  const shapes = [];

  // Central Icosahedron (main piece)
  const icoGeo = new THREE.IcosahedronGeometry(1.1, 1);
  const icoMesh = new THREE.Mesh(icoGeo, matGlass);
  const icoWire = new THREE.Mesh(new THREE.IcosahedronGeometry(1.15, 1), matWire1);
  group.add(icoMesh);
  group.add(icoWire);
  shapes.push({ mesh: icoMesh, wire: icoWire, basePos: [0, 0, 0], speed: 0.4, phase: 0, floatAmp: 0.15, rotSpeed: [0.003, 0.005, 0.002] });

  // Torus (orbital ring)
  const torusGeo = new THREE.TorusGeometry(1.9, 0.04, 16, 100);
  const torusMesh = new THREE.Mesh(torusGeo, matPurple);
  torusMesh.rotation.x = Math.PI / 3;
  torusMesh.rotation.z = 0.3;
  group.add(torusMesh);
  shapes.push({ mesh: torusMesh, wire: null, basePos: [0, 0, 0], speed: 0.2, phase: 1, floatAmp: 0, rotSpeed: [0, 0.008, 0] });

  // Second ring
  const torus2Geo = new THREE.TorusGeometry(2.2, 0.025, 16, 100);
  const torus2Mat = new THREE.MeshStandardMaterial({ color: 0x00cec9, roughness: 0.3, metalness: 0.7, transparent: true, opacity: 0.5 });
  const torus2Mesh = new THREE.Mesh(torus2Geo, torus2Mat);
  torus2Mesh.rotation.x = -Math.PI / 5;
  torus2Mesh.rotation.z = -0.5;
  group.add(torus2Mesh);
  shapes.push({ mesh: torus2Mesh, wire: null, basePos: [0, 0, 0], speed: 0.15, phase: 2, floatAmp: 0, rotSpeed: [0, -0.006, 0] });

  // Small floating Octahedron
  const octGeo = new THREE.OctahedronGeometry(0.35, 0);
  const octMesh = new THREE.Mesh(octGeo, matCyan);
  octMesh.position.set(2.2, 1.3, -0.5);
  group.add(octMesh);
  shapes.push({ mesh: octMesh, wire: null, basePos: [2.2, 1.3, -0.5], speed: 0.7, phase: 0.5, floatAmp: 0.3, rotSpeed: [0.01, 0.015, 0.005] });

  // Small Dodecahedron
  const dodGeo = new THREE.DodecahedronGeometry(0.28, 0);
  const dodMesh = new THREE.Mesh(dodGeo, matPurple);
  dodMesh.position.set(-2.0, -1.2, 0.5);
  group.add(dodMesh);
  shapes.push({ mesh: dodMesh, wire: null, basePos: [-2.0, -1.2, 0.5], speed: 0.6, phase: 1.2, floatAmp: 0.25, rotSpeed: [0.008, 0.01, 0.012] });

  // Small Tetrahedron
  const tetGeo = new THREE.TetrahedronGeometry(0.25, 0);
  const tetMesh = new THREE.Mesh(tetGeo, matWire2.clone());
  tetMesh.material.wireframe = false;
  tetMesh.material.opacity = 0.8;
  tetMesh.position.set(-1.8, 1.6, -0.8);
  group.add(tetMesh);
  shapes.push({ mesh: tetMesh, wire: null, basePos: [-1.8, 1.6, -0.8], speed: 0.9, phase: 2.5, floatAmp: 0.2, rotSpeed: [0.012, 0.008, 0.01] });

  // Small sphere
  const sphGeo = new THREE.SphereGeometry(0.18, 16, 16);
  const sphMesh = new THREE.Mesh(sphGeo, matCyan);
  sphMesh.position.set(1.8, -1.5, 0.3);
  group.add(sphMesh);
  shapes.push({ mesh: sphMesh, wire: null, basePos: [1.8, -1.5, 0.3], speed: 0.5, phase: 3.1, floatAmp: 0.35, rotSpeed: [0.005, 0.007, 0.003] });

  // Additional wireframe ring
  const ring3Geo = new THREE.TorusGeometry(0.6, 0.015, 16, 64);
  const ring3Mesh = new THREE.Mesh(ring3Geo, matWire1.clone());
  ring3Mesh.material.wireframe = false;
  ring3Mesh.position.set(1.5, 0.8, 0.5);
  ring3Mesh.rotation.x = 1.2;
  group.add(ring3Mesh);
  shapes.push({ mesh: ring3Mesh, wire: null, basePos: [1.5, 0.8, 0.5], speed: 0.3, phase: 0.8, floatAmp: 0.15, rotSpeed: [0.01, 0, 0.008] });

  // Skill labels orbit the core so the 3D object reflects the actual stack.
  const skills = [
    ['HTML', '#f97316'], ['CSS', '#38bdf8'], ['JavaScript', '#facc15'],
    ['Python', '#4ade80'], ['React', '#22d3ee'], ['Node.js', '#a3e635'],
    ['Three.js', '#c084fc'], ['Git', '#fb7185']
  ];
  const skillLabels = [];
  function createSkillLabel(text, color) {
    const labelCanvas = document.createElement('canvas');
    labelCanvas.width = 512;
    labelCanvas.height = 128;
    const context = labelCanvas.getContext('2d');
    context.fillStyle = 'rgba(10, 14, 28, .88)';
    context.strokeStyle = color;
    context.lineWidth = 5;
    context.beginPath();
    context.roundRect(6, 6, 500, 116, 28);
    context.fill();
    context.stroke();
    context.fillStyle = '#f8fafc';
    context.font = '700 48px Inter, sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(text, 256, 64);
    const texture = new THREE.CanvasTexture(labelCanvas);
    texture.minFilter = THREE.LinearFilter;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }));
    sprite.scale.set(1.2, .3, 1);
    return sprite;
  }
  skills.forEach(([text, color], index) => {
    const angle = index / skills.length * Math.PI * 2;
    const sprite = createSkillLabel(text, color);
    const basePosition = [Math.cos(angle) * 2.15, Math.sin(angle * 1.7) * 1.1, Math.sin(angle) * .9];
    sprite.position.set(...basePosition);
    group.add(sprite);
    skillLabels.push({ sprite, basePosition, phase: index * .8 });
  });

  // Floating particles (small spheres)
  const particleGroup = new THREE.Group();
  const particleMat = new THREE.MeshBasicMaterial({ color: 0xa29bfe, transparent: true, opacity: 0.6 });
  const particleGeo = new THREE.SphereGeometry(0.03, 8, 8);
  const floatingParticles = [];
  for (let i = 0; i < 40; i++) {
    const p = new THREE.Mesh(particleGeo, particleMat.clone());
    p.material.opacity = Math.random() * 0.5 + 0.2;
    const r = 2 + Math.random() * 2;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI;
    p.position.set(
      r * Math.sin(phi) * Math.cos(theta),
      r * Math.sin(phi) * Math.sin(theta),
      r * Math.cos(phi)
    );
    particleGroup.add(p);
    floatingParticles.push({
      mesh: p,
      basePos: [p.position.x, p.position.y, p.position.z],
      speed: Math.random() * 0.3 + 0.1,
      phase: Math.random() * Math.PI * 2,
      amp: Math.random() * 0.3 + 0.1
    });
  }
  scene.add(particleGroup);

  // Lights
  const ambientLight = new THREE.AmbientLight(0x404060, 0.6);
  scene.add(ambientLight);

  const pointLight1 = new THREE.PointLight(0xa855f7, 2, 20);
  pointLight1.position.set(3, 3, 4);
  scene.add(pointLight1);

  const pointLight2 = new THREE.PointLight(0x00cec9, 1.5, 20);
  pointLight2.position.set(-3, -2, 3);
  scene.add(pointLight2);

  const pointLight3 = new THREE.PointLight(0xa29bfe, 1, 15);
  pointLight3.position.set(0, 4, -3);
  scene.add(pointLight3);

  // Resize handler
  function resize() {
    const w = container.clientWidth;
    const h = container.clientHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);

  // Dragging rotates the scene in any direction; wheel controls the distance.
  canvas.style.touchAction = 'none';
  canvas.style.cursor = 'grab';
  function onPointerDown(event) {
    interaction.dragging = true;
    interaction.lastX = event.clientX;
    interaction.lastY = event.clientY;
    canvas.style.cursor = 'grabbing';
    canvas.setPointerCapture(event.pointerId);
  }
  function onPointerMove(event) {
    if (!interaction.dragging) return;
    const deltaX = event.clientX - interaction.lastX;
    const deltaY = event.clientY - interaction.lastY;
    interaction.lastX = event.clientX;
    interaction.lastY = event.clientY;
    interaction.velocityY = deltaX * .008;
    interaction.velocityX = deltaY * .008;
    interaction.rotationY += interaction.velocityY;
    interaction.rotationX += interaction.velocityX;
  }
  function onPointerUp(event) {
    interaction.dragging = false;
    canvas.style.cursor = 'grab';
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
  }
  function onWheel(event) {
    event.preventDefault();
    camera.position.z = Math.max(4.2, Math.min(8, camera.position.z + event.deltaY * .004));
  }
  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerUp);
  canvas.addEventListener('wheel', onWheel, { passive: false });

  // Animation
  let raf;
  const clock = new THREE.Clock();

  function animate() {
    raf = requestAnimationFrame(animate);
    const t = clock.getElapsedTime();

    // Keep a slow idle rotation and preserve momentum after a drag.
    if (!interaction.dragging) {
      interaction.rotationY += .0025;
      interaction.rotationY += interaction.velocityY;
      interaction.rotationX += interaction.velocityX;
      interaction.velocityX *= .94;
      interaction.velocityY *= .94;
    }
    interaction.rotationX = Math.max(-1.35, Math.min(1.35, interaction.rotationX));
    group.rotation.y = interaction.rotationY;
    group.rotation.x = interaction.rotationX;

    // Animate each shape
    shapes.forEach(s => {
      const m = s.mesh;
      // Floating motion
      if (s.floatAmp > 0) {
        m.position.y = s.basePos[1] + Math.sin(t * s.speed + s.phase) * s.floatAmp;
        m.position.x = s.basePos[0] + Math.cos(t * s.speed * 0.7 + s.phase) * s.floatAmp * 0.5;
      }
      // Self rotation
      m.rotation.x += s.rotSpeed[0];
      m.rotation.y += s.rotSpeed[1];
      m.rotation.z += s.rotSpeed[2];
      // Sync wireframe
      if (s.wire) {
        s.wire.rotation.copy(m.rotation);
        s.wire.position.copy(m.position);
      }
    });

    // Floating particles orbit
    floatingParticles.forEach(fp => {
      fp.mesh.position.y = fp.basePos[1] + Math.sin(t * fp.speed + fp.phase) * fp.amp;
      fp.mesh.position.x = fp.basePos[0] + Math.cos(t * fp.speed * 0.6 + fp.phase) * fp.amp * 0.7;
    });
    skillLabels.forEach(label => {
      label.sprite.position.y = label.basePosition[1] + Math.sin(t * .7 + label.phase) * .08;
    });
    particleGroup.rotation.y = t * 0.05;

    // Light animation
    pointLight1.position.x = 3 + Math.sin(t * 0.5) * 1.5;
    pointLight2.position.z = 3 + Math.cos(t * 0.3) * 2;

    renderer.render(scene, camera);
  }
  animate();

  hero3D = {
    destroy() {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerUp);
      canvas.removeEventListener('wheel', onWheel);
      skillLabels.forEach(label => {
        label.sprite.material.map?.dispose();
        label.sprite.material.dispose();
      });
      renderer.dispose();
      hero3D = null;
    }
  };
}

// Initialize Three.js scene when in 3D mode
function initOrDestroyHero3D(mode) {
  if (mode === '3d') {
    // Slight delay to ensure the canvas is visible before init
    setTimeout(() => initHero3D(), 100);
  } else if (hero3D) {
    hero3D.destroy();
  }
}
