/* ═══════════════════════════════════════════════════════════
   MES PROJETS — NAVIGATION COMMUNE
   Injecte la barre du haut (retour au hub, fil d'Ariane,
   projet précédent/suivant, menu de tous les projets) et
   mémorise les projets récemment ouverts pour le hub.
   ═══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const CATEGORIES = {
    outils:  { label: 'Outils',        icon: '🛠️' },
    dev:     { label: 'Développement', icon: '💻' },
    loisirs: { label: 'Loisirs',       icon: '🎮' },
    educ:    { label: 'Éducation',     icon: '📚' },
  };

  // Chemins relatifs à la racine du site
  const PROJECTS = [
    { cat: 'outils',  path: 'outils/agenda/',               name: 'Agenda Semaine A/B',     desc: 'Planning interactif semaines alternées' },
    { cat: 'outils',  path: 'outils/pc-builder/',           name: 'PC Builder Pro',         desc: 'Configurateur avec profils, budget & benchmarks' },
    { cat: 'outils',  path: 'outils/conjugator/',           name: 'Conjugator',             desc: 'Analyseur de formes verbales françaises' },
    { cat: 'outils',  path: 'outils/generateur-cv/',        name: 'Générateur de CV',       desc: 'Formulaire live – export PDF' },
    { cat: 'outils',  path: 'outils/unit-converter/',       name: 'Unit Converter',         desc: "Convertisseur universel d'unités" },
    { cat: 'outils',  path: 'outils/lieux-proches/',        name: 'Lieux Proches',          desc: 'Découverte de lieux avec carte & favoris' },
    { cat: 'outils',  path: 'outils/game-tools-lab/',       name: 'Game Tools Lab',         desc: 'Suite multi-outils gaming' },
    { cat: 'outils',  path: 'outils/css-animator/',         name: 'CSS Animator',           desc: 'Éditeur visuel de @keyframes' },
    { cat: 'outils',  path: 'outils/habit-tracker/',        name: 'Habit Tracker',          desc: "Suivi d'habitudes, streaks & graphiques" },
    { cat: 'dev',     path: 'developpement/portfolio/',     name: 'Portfolio',              desc: 'Portfolio interactif 2D / 3D' },
    { cat: 'dev',     path: 'developpement/api-dashboard/', name: 'API Dashboard',          desc: 'Météo, crypto, NASA, ISS en temps réel' },
    { cat: 'educ',    path: 'education/tableau-periodique/',name: 'Tableau Périodique',     desc: '118 éléments interactifs' },
    { cat: 'educ',    path: 'education/revision/',          name: 'Révision Lycée',         desc: 'Fiches, quiz & flashcards' },
    { cat: 'loisirs', path: 'loisirs/univers/',             name: 'Univers',                desc: 'Dragon et One Piece' },
    { cat: 'loisirs', path: 'loisirs/tier-list/',           name: 'Tier List Maker',        desc: 'Classement drag-and-drop' },
    { cat: 'loisirs', path: 'loisirs/quick-play/',          name: 'QuickPlay',              desc: '15 mini-jeux arcade' },
    { cat: 'loisirs', path: 'loisirs/banc-essai-moteur/',   name: 'Banc d'essai moteur',          desc: "Banc d'essai moteur, boîte et pédales" },
    { cat: 'loisirs', path: 'loisirs/drift-king/', mini: true,      name: 'Drift King',             desc: 'Drift sur une route de montagne' },
    { cat: 'loisirs', path: 'loisirs/sky-pilot/', mini: true, pos: 'tr',name: 'Sky Pilot',       desc: 'F-35B et PV-40 à aile basculante, vol libre' },
    { cat: 'loisirs', path: 'loisirs/moto-rider/', mini: true, name: 'Moto Rider',        desc: 'Moto sur route de col' },
    { cat: 'loisirs', path: 'loisirs/tesla-roadster/', mini: true, name: 'Tesla Roadster',  desc: 'Roadster 3D : murs, plafonds, vol, boost et tonneaux en ville' },
    { cat: 'loisirs', path: 'loisirs/monde-ouvert/', mini: true, name: 'Monde Ouvert',  desc: 'Île 3D : 11 véhicules à choisir avec la roue (Tab)' },
    { cat: 'loisirs', path: 'loisirs/kukirin/', mini: true,         name: 'Kukirin',                desc: 'Trottinette, livraisons et quêtes' },
    { cat: 'loisirs', path: 'loisirs/trottinette-freestyle/', mini: true, name: 'Trottinette Freestyle', desc: 'Skatepark 3D : whips, barspins, flips et grinds' },
    { cat: 'loisirs', path: 'loisirs/rail-express/', mini: true, name: 'Rail Express',      desc: 'Conduite ferroviaire : signalisation, gares et procédures' },
    { cat: 'loisirs', path: 'loisirs/fpv-racer/', mini: true, pos: 'tr', name: 'FPV Racer',  desc: 'Drone FPV acro : tunnels, bando, course et suivi de voitures en drift' },
    { cat: 'loisirs', path: 'loisirs/truck-france-simulator/', mini: true, pos: 'tr', name: 'Truck France Simulator', desc: 'Camion en France : contrats, carte, météo, trafic et stations' },
    { cat: 'loisirs', path: 'loisirs/sport-live/',          name: 'Sport Live',             desc: 'Scores en direct, compos, stats et simulation 3D' },
    { cat: 'loisirs', path: 'loisirs/music-player/',        name: 'Music Player',           desc: 'Lecteur audio & playlists' },
    { cat: 'loisirs', path: 'loisirs/pokedex/',             name: 'Pokédex Complet',        desc: '1025 Pokémon' },
  ];

  const RECENT_KEY = 'mesprojets:recent';

  const script = document.currentScript;
  // Copie autonome (dépôt GitHub d'un seul projet) : data-project indique le projet,
  // et la navigation renvoie vers le site complet en ligne.
  const standalone = script && script.dataset.project;
  const root = standalone ? new URL('https://yoannservices.github.io/')
    : script ? new URL('../', script.src) : new URL('../../', location.href);
  const here = location.href.split(/[?#]/)[0];
  const rel = standalone ? script.dataset.project
    : decodeURIComponent(here.startsWith(root.href) ? here.slice(root.href.length) : '');
  const current = PROJECTS.find(p => rel.startsWith(p.path));

  // Jeux plein écran : bouton compact au lieu de la barre (appliqué tout de suite)
  if (current && current.mini) document.documentElement.classList.add('ui-mini');
  if (current && current.pos) document.documentElement.dataset.uiPos = current.pos;
  if (current) document.documentElement.dataset.cat = current.cat;

  function url(p) { return new URL(p.path.endsWith('.html') ? p.path : p.path + 'index.html', root).href; }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  // ── Projets récents (partagés avec le hub) ──
  if (current) {
    try {
      const list = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]').filter(x => x !== current.path);
      list.unshift(current.path);
      localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, 6)));
    } catch (e) { /* stockage indisponible : on ignore */ }
  }

  function buildBar() {
    // Le hub a sa propre en-tête : pas de barre
    if (document.documentElement.classList.contains('ui-hub') || document.querySelector('.ui-bar')) return;
    const cat = current ? current.cat : document.documentElement.dataset.cat;
    if (cat && !document.documentElement.dataset.cat) document.documentElement.dataset.cat = cat;
    const catInfo = CATEGORIES[cat];

    const siblings = current ? PROJECTS.filter(p => p.cat === current.cat) : [];
    const idx = siblings.indexOf(current);
    const prev = idx >= 0 ? siblings[(idx - 1 + siblings.length) % siblings.length] : null;
    const next = idx >= 0 ? siblings[(idx + 1) % siblings.length] : null;

    const arrow = d => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"/></svg>`;

    const bar = document.createElement('nav');
    bar.className = 'ui-bar';
    bar.setAttribute('aria-label', 'Navigation Mes Projets');
    bar.innerHTML = `
      <a class="ui-home" href="${root.href}index.html" title="Retour à Mes Projets">
        <span class="ui-logo" aria-hidden="true"><i></i><i></i><i></i><i></i></span>
        <span class="ui-home-label">Mes Projets</span>
      </a>
      <div class="ui-crumbs">
        ${catInfo ? `<span class="ui-sep">/</span>
        <a class="ui-cat" href="${root.href}index.html#${cat}" title="${esc(catInfo.label)}"><span class="ui-dot"></span><span class="ui-cat-label">${esc(catInfo.label)}</span></a>` : ''}
        ${current ? `<span class="ui-sep">/</span><span class="ui-current">${esc(current.name)}</span>` : ''}
      </div>
      <div class="ui-actions">
        ${prev && siblings.length > 1 ? `<a class="ui-btn" href="${url(prev)}" title="Précédent : ${esc(prev.name)}" aria-label="Projet précédent">${arrow('M15 18l-6-6 6-6')}</a>
        <a class="ui-btn" href="${url(next)}" title="Suivant : ${esc(next.name)}" aria-label="Projet suivant">${arrow('M9 18l6-6-6-6')}</a>` : ''}
        <button class="ui-btn" type="button" aria-expanded="false" aria-haspopup="true" title="Tous les projets (Ctrl+K)">
          ${arrow('M4 6h16M4 12h16M4 18h10')}<span class="ui-btn-label">Projets</span><span class="ui-kbd">Ctrl K</span>
        </button>
      </div>
      <div class="ui-menu" hidden>
        <input type="search" placeholder="Aller à un projet…" aria-label="Rechercher un projet" />
        <div class="ui-menu-list"></div>
      </div>`;
    document.body.prepend(bar);

    const toggle = bar.querySelector('button.ui-btn');
    const menu = bar.querySelector('.ui-menu');
    const input = menu.querySelector('input');
    const listEl = menu.querySelector('.ui-menu-list');
    let focusIdx = 0;

    function render(q) {
      q = (q || '').toLowerCase().trim();
      const match = p => !q || (p.name + ' ' + p.desc + ' ' + CATEGORIES[p.cat].label).toLowerCase().includes(q);
      let html = '';
      Object.keys(CATEGORIES).forEach(c => {
        const items = PROJECTS.filter(p => p.cat === c && match(p));
        if (!items.length) return;
        html += `<div class="ui-menu-group"><span class="ui-dot" style="background:var(--cat-${c})"></span>${esc(CATEGORIES[c].label)}</div>`;
        html += items.map(p => `
          <a class="ui-menu-item${p === current ? ' is-current' : ''}" href="${url(p)}">
            <span class="ui-dot" style="background:var(--cat-${p.cat})"></span>
            <div><strong>${esc(p.name)}</strong><span>${esc(p.desc)}</span></div>
          </a>`).join('');
      });
      listEl.innerHTML = html || '<div class="ui-menu-empty">Aucun projet trouvé</div>';
      focusIdx = 0;
      highlight();
    }
    function items() { return [...listEl.querySelectorAll('.ui-menu-item')]; }
    function highlight() {
      items().forEach((el, i) => el.classList.toggle('is-focus', i === focusIdx));
    }
    function open(state) {
      menu.hidden = !state;
      toggle.setAttribute('aria-expanded', String(state));
      if (state) { input.value = ''; render(''); input.focus(); }
    }

    toggle.addEventListener('click', () => open(menu.hidden));
    input.addEventListener('input', () => render(input.value));
    // Les jeux écoutent le clavier : la saisie dans le menu ne doit pas les piloter
    ['keydown', 'keyup', 'keypress'].forEach(t => input.addEventListener(t, e => e.stopPropagation()));
    input.addEventListener('keydown', e => {
      const all = items();
      if (e.key === 'ArrowDown') { e.preventDefault(); focusIdx = Math.min(focusIdx + 1, all.length - 1); highlight(); all[focusIdx] && all[focusIdx].scrollIntoView({ block: 'nearest' }); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); focusIdx = Math.max(focusIdx - 1, 0); highlight(); all[focusIdx] && all[focusIdx].scrollIntoView({ block: 'nearest' }); }
      else if (e.key === 'Enter' && all[focusIdx]) { location.href = all[focusIdx].href; }
    });
    document.addEventListener('click', e => { if (!menu.hidden && !bar.contains(e.target)) open(false); });
    document.addEventListener('keydown', e => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); open(menu.hidden); }
      else if (e.key === 'Escape' && !menu.hidden) { open(false); toggle.focus(); }
    });
  }

  if (document.body) buildBar();
  else document.addEventListener('DOMContentLoaded', buildBar);

  window.MesProjets = { projects: PROJECTS, categories: CATEGORIES, root: root.href, recentKey: RECENT_KEY };
})();
