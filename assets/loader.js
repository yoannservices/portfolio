/* Écran de chargement réel : suit les fetch, XHR et images (textures, .glb, données) jusqu'à ce qu'il n'en reste aucun. */
(function () {
  const name = document.currentScript.dataset.name || document.title;
  const pending = new Map(); // id -> nom de la ressource
  let total = 0, done = 0, nextId = 0, quiet = 0, removal = 0, loaded = document.readyState === 'complete', gameReady = false, hidden = false;
  let currentStage = 'Chargement des scripts et du moteur 3D…';

  const el = document.createElement('div');
  el.id = 'game-loader';
  el.innerHTML = '<div class="gl-head"><span>INITIALISATION DU SYSTÈME</span><h1></h1></div><div class="gl-animation" aria-hidden="true"><i></i><b></b><em></em></div><div class="gl-progress"><div class="gl-status"><span class="gl-stage"></span><strong class="gl-percent">0%</strong></div><div class="gl-bar"><i></i></div><p class="gl-resource" aria-live="polite"></p><p class="gl-count"></p><div class="gl-error" hidden><span></span><button type="button">Réessayer</button></div></div>';
  el.querySelector('h1').textContent = name;
  const css = document.createElement('style');
  css.textContent = `
    #game-loader{--gl-cyan:#65e8d1;--gl-amber:#f3bd72;position:fixed;inset:0;z-index:99999;display:grid;grid-template-rows:auto 1fr auto;justify-items:center;align-items:center;overflow:hidden;padding:clamp(28px,7vh,72px) 24px clamp(24px,6vh,60px);box-sizing:border-box;color:#edf5f2;background:radial-gradient(ellipse at 50% 48%,#172b31 0,#0c171c 42%,#080d11 100%);font-family:'Chakra Petch','Segoe UI',sans-serif;transition:opacity .55s ease,visibility .55s ease}
    #game-loader:before{content:'';position:absolute;inset:0;pointer-events:none;opacity:.18;background-image:linear-gradient(rgba(140,224,210,.08) 1px,transparent 1px),linear-gradient(90deg,rgba(140,224,210,.08) 1px,transparent 1px);background-size:42px 42px;mask-image:linear-gradient(transparent,#000 22%,#000 82%,transparent)}
    #game-loader.gl-done{opacity:0;visibility:hidden;pointer-events:none}
    #game-loader .gl-head,#game-loader .gl-progress{position:relative;width:min(560px,100%);z-index:1}
    #game-loader .gl-head{align-self:start;text-align:center}
    #game-loader .gl-head>span{font:500 10px 'IBM Plex Mono',Consolas,monospace;letter-spacing:.2em;color:var(--gl-cyan)}
    #game-loader h1{margin:12px 0 0;font-size:clamp(30px,6vw,58px);font-weight:600;line-height:1.04;letter-spacing:.04em;text-wrap:balance}
    #game-loader .gl-animation{position:relative;display:grid;place-items:center;width:min(48vw,230px);aspect-ratio:1;align-self:center}
    #game-loader .gl-animation:before,#game-loader .gl-animation:after{content:'';position:absolute;inset:8%;border:1px solid rgba(101,232,209,.16);border-radius:50%}
    #game-loader .gl-animation:after{inset:22%;border-color:rgba(243,189,114,.22);animation:gl-pulse 2.4s ease-in-out infinite}
    #game-loader .gl-animation i{position:absolute;inset:0;border:1px solid transparent;border-top-color:var(--gl-cyan);border-right-color:rgba(101,232,209,.2);border-radius:50%;animation:gl-orbit 2.8s linear infinite}
    #game-loader .gl-animation b{width:24%;aspect-ratio:1;border:1px solid var(--gl-cyan);border-radius:50%;box-shadow:0 0 28px rgba(101,232,209,.3),inset 0 0 20px rgba(101,232,209,.16);animation:gl-core 1.8s ease-in-out infinite}
    #game-loader .gl-animation em{position:absolute;width:8px;height:8px;top:5%;left:50%;border-radius:50%;background:var(--gl-amber);box-shadow:0 0 18px var(--gl-amber)}
    #game-loader .gl-progress{align-self:end}
    #game-loader .gl-status{display:flex;justify-content:space-between;align-items:baseline;gap:12px;margin-bottom:10px}
    #game-loader .gl-stage{font-size:14px;color:#c5d8d5}
    #game-loader .gl-percent{font:500 13px 'IBM Plex Mono',Consolas,monospace;color:var(--gl-cyan)}
    #game-loader .gl-bar{height:3px;background:rgba(221,244,238,.14);overflow:hidden}
    #game-loader .gl-bar i{display:block;width:0;height:100%;background:linear-gradient(90deg,var(--gl-cyan),var(--gl-amber));box-shadow:0 0 12px rgba(101,232,209,.55);transition:width .25s ease}
    #game-loader .gl-resource,#game-loader .gl-count{position:static;margin:10px 0 0;text-align:left;font:11px 'IBM Plex Mono',Consolas,monospace;color:#91aaa7;overflow-wrap:anywhere}
    #game-loader .gl-count{margin-top:5px;color:#66807d}
    #game-loader .gl-error{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-top:18px;padding:12px;border:1px solid rgba(243,189,114,.5);color:#f3d9b2;font-size:13px}
    #game-loader .gl-error[hidden]{display:none}
    #game-loader .gl-error button{border:1px solid var(--gl-amber);background:transparent;color:inherit;padding:8px 12px;font:inherit;cursor:pointer}
    @keyframes gl-orbit{to{transform:rotate(360deg)}}@keyframes gl-pulse{50%{transform:scale(1.08);opacity:.45}}@keyframes gl-core{50%{transform:scale(.82);box-shadow:0 0 46px rgba(101,232,209,.5),inset 0 0 24px rgba(101,232,209,.28)}}
    @media(prefers-reduced-motion:reduce){#game-loader *,#game-loader:before,#game-loader:after{animation-duration:8s!important;transition-duration:.01ms!important}}`;
  document.head.append(css);
  (document.body || document.documentElement).append(el);
  const bar = el.querySelector('.gl-bar i'), stageLabel = el.querySelector('.gl-stage'), resourceLabel = el.querySelector('.gl-resource');
  const percentLabel = el.querySelector('.gl-percent'), countLabel = el.querySelector('.gl-count'), errorBox = el.querySelector('.gl-error');
  const failures = new Set();
  errorBox.querySelector('button').addEventListener('click', () => location.reload());

  function update() {
    const first = pending.values().next().value;
    const percent = gameReady && !pending.size && !failures.size ? 100 : total ? Math.min(99, Math.round(done / total * 100)) : 0;
    bar.style.width = percent + '%';
    percentLabel.textContent = percent + '%';
    stageLabel.textContent = first ? 'Chargement des ressources' : currentStage;
    resourceLabel.textContent = first ? 'En cours : ' + first : (failures.size ? 'Des ressources n’ont pas pu être chargées.' : 'Vérification de la scène et des commandes…');
    countLabel.textContent = `${done} ressource${done > 1 ? 's' : ''} terminée${done > 1 ? 's' : ''} · ${pending.size} en cours`;
    if (failures.size) {
      errorBox.hidden = false;
      errorBox.querySelector('span').textContent = 'Échec : ' + [...failures].slice(0, 2).join(', ');
    }
  }
  function hide() {
    if (hidden) return;
    hidden = true;
    el.classList.add('gl-done');
    window.dispatchEvent(new CustomEvent('game-ready'));
    removal = setTimeout(() => { if (hidden) el.remove(); }, 600);
  }
  function check() {
    update();
    clearTimeout(quiet);
    if (!loaded || !gameReady || pending.size || failures.size) return;
    quiet = setTimeout(hide, 450);
  }
  // Démarre le suivi d'une ressource ; renvoie la fonction qui la termine
  function track(url) {
    const id = nextId++;
    const short = (() => { try { return decodeURIComponent(new URL(url, location.href).pathname.split('/').pop() || url); } catch (e) { return url; } })();
    total++;
    pending.set(id, short);
    clearTimeout(quiet);
    update();
    let ended = false;
    return error => {
      if (ended) return;
      ended = true;
      pending.delete(id);
      done++;
      if (error) failures.add(short);
      check();
    };
  }

  window.GameLoader = {
    stage(label) { currentStage = String(label || 'Préparation du jeu…'); update(); },
    start(label) {
      clearTimeout(removal);
      hidden = false;
      gameReady = false;
      currentStage = String(label || 'Préparation du jeu…');
      total = 0;
      done = 0;
      failures.clear();
      errorBox.hidden = true;
      el.classList.remove('gl-done');
      (document.body || document.documentElement).append(el);
      update();
    },
    ready() { gameReady = true; currentStage = 'Finalisation de la scène…'; check(); },
    fail(error) { failures.add(String(error && error.message || error || 'Erreur au démarrage')); update(); },
    begin: track,
    trackPromise(label, promise) {
      const end = track(label);
      return Promise.resolve(promise).then(value => { end(); return value; }, error => { end(error); throw error; });
    }
  };

  // fetch : le corps doit être lu en entier pour compter la ressource comme chargée
  const realFetch = window.fetch;
  window.fetch = function (input, init) {
    const end = track(String(input && input.url || input));
    return realFetch.apply(this, arguments).then(r => {
      const error = r.ok ? null : `${r.status} ${r.statusText}`;
      try {
        const body = r.clone().body;
        if (!body) { end(error); return r; }
        const reader = body.getReader();
        (async () => {
          try { while (!(await reader.read()).done) {} end(error); }
          catch (readError) { end(readError); }
        })();
      } catch (cloneError) { end(cloneError); }
      return r;
    }, err => { end(err); throw err; });
  };

  // XMLHttpRequest (three.js r128 : FileLoader, GLTFLoader)
  const xhrSend = XMLHttpRequest.prototype.send, xhrOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method, url) { this._glUrl = url; return xhrOpen.apply(this, arguments); };
  XMLHttpRequest.prototype.send = function () {
    const end = track(this._glUrl);
    this.addEventListener('loadend', () => end(this.status >= 400 ? `${this.status} ${this.statusText}` : null), { once: true });
    return xhrSend.apply(this, arguments);
  };

  // Images et textures : src posé par le jeu ou par THREE.TextureLoader
  const srcDesc = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src');
  Object.defineProperty(HTMLImageElement.prototype, 'src', {
    configurable: true, enumerable: srcDesc.enumerable,
    get() { return srcDesc.get.call(this); },
    set(v) {
      const end = track(String(v));
      this.addEventListener('load', () => end(), { once: true });
      this.addEventListener('error', () => end('image error'), { once: true });
      srcDesc.set.call(this, v);
    }
  });

  // Fin du chargement de la page : les modules et scripts initiaux sont exécutés
  addEventListener('load', () => { loaded = true; check(); });
  addEventListener('error', event => { if (!gameReady) window.GameLoader.fail(event.message || 'Erreur au démarrage'); });
  addEventListener('unhandledrejection', event => { if (!gameReady) window.GameLoader.fail(event.reason); });
  check();
})();
