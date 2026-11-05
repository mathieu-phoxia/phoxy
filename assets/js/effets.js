/* Phoxy : effets et interactions.
   Écran de chargement, rideau entre les pages, défilement fluide (Lenis s'il est chargé),
   en-tête qui se cache, barre de progression, titres mot à mot, texte brouillé au survol,
   compteurs, curseur néon, boutons aimantés, spectre audio du hero, bandeau géant. */
(function () {
  'use strict';

  var doc = document.documentElement;
  var reduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fin = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  var stocker = function (k, v) { try { if (v === null) sessionStorage.removeItem(k); else sessionStorage.setItem(k, v); } catch (e) {} };
  var EGALISEUR = '<span class="egaliseur" aria-hidden="true">' +
    [0.9, 0.55, 1, 0.7, 0.45, 0.85, 0.6].map(function (h, i) { return '<i style="--h:' + h + ';--i:' + i + '"></i>'; }).join('') + '</span>';
  doc.classList.add('effets');

  /* ---------- Rideau de transition entre les pages ---------- */
  var rideau = document.createElement('div');
  rideau.className = 'rideau'; rideau.setAttribute('aria-hidden', 'true');
  var MARQUE = 'assets/img/marque/phoxy-mark-neon.png';
  rideau.innerHTML = '<span></span><span></span><span></span><div class="rideau__chargeur"><span class="logo-charge">' +
    '<img class="logo-charge__fond" src="' + MARQUE + '" alt=""><img class="logo-charge__plein" src="' + MARQUE + '" alt=""></span></div>';
  document.body.appendChild(rideau);
  if (doc.classList.contains('arrivee')) {
    stocker('phoxy-rideau', null);
    rideau.setAttribute('data-etat', 'sortie');
    doc.classList.remove('arrivee');
    setTimeout(function () { rideau.removeAttribute('data-etat'); }, 950);
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href]');
    if (!a || reduit || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    if (a.target === '_blank' || a.hasAttribute('download')) return;
    var url = new URL(a.href, location.href);
    if (url.origin !== location.origin || /^(mailto|tel):/.test(a.href)) return;
    if (url.pathname === location.pathname && url.hash) return;
    if (!/\.html$|\/$/.test(url.pathname)) return;
    e.preventDefault();
    stocker('phoxy-rideau', '1');
    rideau.setAttribute('data-etat', 'entree');
    setTimeout(function () { location.href = url.href; }, 480);
  });
  window.addEventListener('pageshow', function (e) { if (e.persisted) rideau.removeAttribute('data-etat'); });

  /* ---------- Défilement fluide ---------- */
  var lenis = null;
  if (!reduit && window.Lenis) {
    lenis = new window.Lenis({ duration: 1.15, easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); } });
    (function boucle(t) { lenis.raf(t); requestAnimationFrame(boucle); })(0);
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href*="#"]');
    if (!a) return;
    var url = new URL(a.href, location.href);
    if (url.pathname !== location.pathname || url.hash.length < 2) return;
    var cible = document.querySelector(url.hash);
    if (!cible) return;
    e.preventDefault();
    if (lenis) lenis.scrollTo(cible, { offset: -90 }); else cible.scrollIntoView({ behavior: reduit ? 'auto' : 'smooth' });
    history.replaceState(null, '', url.hash);
  });
  // Le menu mobile bloque le défilement fluide pendant qu'il est ouvert
  var menu = document.querySelector('[data-menu-mobile]');
  if (menu && lenis && 'MutationObserver' in window) {
    new MutationObserver(function () { if (menu.getAttribute('data-ouvert') === 'true') lenis.stop(); else lenis.start(); })
      .observe(menu, { attributes: true, attributeFilter: ['data-ouvert'] });
  }

  /* ---------- En-tête et barre de progression ---------- */
  var entete = document.querySelector('[data-entete]');
  var barre = document.createElement('div'); barre.className = 'progression'; barre.setAttribute('aria-hidden', 'true');
  document.body.appendChild(barre);
  var dernierY = window.scrollY;
  var surDefile = function () {
    var y = window.scrollY;
    var ouvert = menu && menu.getAttribute('data-ouvert') === 'true';
    if (entete) entete.setAttribute('data-etat', y < 40 ? 'haut' : (y > dernierY && y > 420 && !ouvert ? 'cache' : 'defile'));
    var m = doc.scrollHeight - innerHeight;
    barre.style.transform = 'scaleX(' + (m > 0 ? y / m : 0) + ')';
    dernierY = y;
  };
  addEventListener('scroll', surDefile, { passive: true }); surDefile();

  /* ---------- Titres mot à mot ---------- */
  var titres = document.querySelectorAll('main h1.display, main h2.display, .appel__titre');
  titres.forEach(function (titre) {
    var i = 0;
    titre.setAttribute('data-titre-anime', '');
    (function decouper(noeud) {
      Array.prototype.slice.call(noeud.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var f = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(function (m) {
            if (!m) return;
            if (/^\s+$/.test(m)) { f.appendChild(document.createTextNode(' ')); return; }
            var o = document.createElement('span'); o.className = 'mot';
            var s = document.createElement('span'); s.textContent = m; s.style.setProperty('--i', i++);
            o.appendChild(s); f.appendChild(o);
          });
          noeud.replaceChild(f, n);
        } else if (n.nodeType === 1 && n.tagName !== 'BR') decouper(n);
      });
    })(titre);
  });

  /* ---------- Texte brouillé au survol ---------- */
  var SIGNES = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#/+';
  var brouiller = function (el) {
    if (reduit || el._brouille || el.children.length) return;
    var final = el.getAttribute('data-texte') || el.textContent;
    el.setAttribute('data-texte', final); el._brouille = true;
    var n = 0, total = 14;
    (function pas() {
      n++;
      el.textContent = final.split('').map(function (c, i) {
        if (c === ' ' || i < (n / total) * final.length) return c;
        return SIGNES[Math.floor(Math.random() * SIGNES.length)];
      }).join('');
      if (n < total) requestAnimationFrame(pas); else { el.textContent = final; el._brouille = false; }
    })();
  };
  document.querySelectorAll('.nav__lien, .etiquette').forEach(function (el) {
    el.addEventListener('mouseenter', function () { brouiller(el); });
  });

  /* ---------- Compteurs ---------- */
  var compter = function (el) {
    var m = /^(\d+)(.*)$/.exec(el.textContent.trim());
    if (!m || reduit || m[1] === '0' || m[1].length >= 4) return; // pas d'animation sur les années
    var v = parseInt(m[1], 10), suf = m[2], t0 = performance.now(), d = 1600;
    (function pas(t) {
      var p = Math.min(1, (t - t0) / d), k = 1 - Math.pow(1 - p, 4);
      el.textContent = Math.round(v * k) + suf;
      if (p < 1) requestAnimationFrame(pas);
    })(t0);
  };

  /* ---------- Apparitions (lancées après l'écran de chargement) ---------- */
  var lancer = function () {
    document.body.classList.add('lancee');
    var obs = 'IntersectionObserver' in window ? new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = e.target;
        if (el.hasAttribute('data-titre-anime')) el.classList.add('titre-pret');
        if (el.classList.contains('repere__valeur')) compter(el);
        if (el.classList.contains('etiquette')) brouiller(el);
        obs.unobserve(el);
      });
    }, { threshold: 0.2, rootMargin: '0px 0px -6% 0px' }) : null;
    document.querySelectorAll('[data-titre-anime], .repere__valeur, .etiquette').forEach(function (el) {
      if (obs) obs.observe(el); else el.classList.add('titre-pret');
    });
  };

  /* ---------- Écran de chargement (première page de la visite) ---------- */
  var chargeur = document.querySelector('[data-chargeur]');
  if (chargeur && doc.classList.contains('avec-chargeur')) {
    stocker('phoxy-vu', '1');
    var compte = chargeur.querySelector('[data-compte]'), trait = chargeur.querySelector('.chargeur__ligne i');
    var plein = chargeur.querySelector('.chargeur__marque-plein');
    var t0 = performance.now(), duree = 1900;
    (function avancer(t) {
      var p = Math.min(1, (t - t0) / duree), k = 1 - Math.pow(1 - p, 3);
      compte.textContent = String(Math.round(k * 100)).padStart(3, '0') + ' %';
      trait.style.transform = 'scaleX(' + k + ')';
      if (plein) plein.style.clipPath = 'inset(' + ((1 - k) * 100).toFixed(1) + '% 0 0 0)';
      if (p < 1) return requestAnimationFrame(avancer);
      chargeur.classList.add('pret');
      setTimeout(function () { chargeur.classList.add('sortie'); }, 380);
      setTimeout(lancer, 680);
      setTimeout(function () { chargeur.hidden = true; doc.classList.remove('avec-chargeur'); }, 1500);
    })(t0);
  } else {
    if (chargeur) chargeur.hidden = true;
    doc.classList.remove('avec-chargeur');
    setTimeout(lancer, doc.classList.contains('arrivee') ? 300 : 60);
  }

  /* ---------- Entrée du hero ---------- */
  document.querySelectorAll('.hero .etiquette, .hero__chapeau, .hero__actions, .hero .fiche').forEach(function (el, i) {
    el.setAttribute('data-intro', '');
    el.style.setProperty('--delai', (0.25 + i * 0.12) + 's');
  });

  /* ---------- Étiquettes du curseur ---------- */
  document.querySelectorAll('[data-sc-ecouter]').forEach(function (el) { el.setAttribute('data-curseur', 'Écouter'); });
  document.querySelectorAll('.lieu').forEach(function (el) { el.setAttribute('data-curseur', 'Explorer'); });
  document.querySelectorAll('video').forEach(function (el) { el.setAttribute('data-curseur', 'Lecture'); });
  document.querySelectorAll('.bouton--plein').forEach(function (el) { el.setAttribute('data-aimant', ''); });

  /* ---------- Curseur néon et boutons aimantés (souris uniquement) ---------- */
  if (fin && !reduit) {
    doc.classList.add('curseur-actif');
    var anneau = document.createElement('div'); anneau.className = 'curseur';
    var point = document.createElement('div'); point.className = 'curseur-point';
    var etiquette = document.createElement('div'); etiquette.className = 'curseur-etiquette';
    [anneau, point, etiquette].forEach(function (el) { el.setAttribute('aria-hidden', 'true'); document.body.appendChild(el); });

    var mx = innerWidth / 2, my = innerHeight / 2, ax = mx, ay = my, taille = 1, tailleCible = 1;
    addEventListener('pointermove', function (e) {
      mx = e.clientX; my = e.clientY;
      point.style.transform = 'translate(' + mx + 'px,' + my + 'px)';
    }, { passive: true });
    document.addEventListener('pointerleave', function () { doc.classList.add('curseur-sorti'); });
    document.addEventListener('pointerenter', function () { doc.classList.remove('curseur-sorti'); });
    document.addEventListener('pointerover', function (e) {
      var lab = e.target.closest('[data-curseur]');
      var lien = e.target.closest('a, button, label, select, summary');
      if (lab) { etiquette.textContent = lab.getAttribute('data-curseur'); anneau.setAttribute('data-mode', 'etiquette'); tailleCible = 2.6; }
      else if (lien) { anneau.setAttribute('data-mode', 'lien'); tailleCible = 1.7; }
      else { anneau.removeAttribute('data-mode'); tailleCible = 1; }
    });
    addEventListener('pointerdown', function () { taille *= 0.75; });

    (function anim() {
      ax = lerp(ax, mx, 0.2); ay = lerp(ay, my, 0.2); taille = lerp(taille, tailleCible, 0.18);
      anneau.style.transform = 'translate(' + ax + 'px,' + ay + 'px) scale(' + taille.toFixed(3) + ')';
      etiquette.style.transform = 'translate(' + ax + 'px,' + ay + 'px)';
      requestAnimationFrame(anim);
    })();

    document.querySelectorAll('[data-aimant]').forEach(function (el) {
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        el.style.setProperty('--ax', ((e.clientX - r.left - r.width / 2) * 0.25).toFixed(1) + 'px');
        el.style.setProperty('--ay', ((e.clientY - r.top - r.height / 2) * 0.35).toFixed(1) + 'px');
      });
      el.addEventListener('pointerleave', function () { el.style.setProperty('--ax', '0px'); el.style.setProperty('--ay', '0px'); });
    });
  }

  /* ---------- Vitesse de défilement partagée ---------- */
  var vitesse = 0, yPrec = window.scrollY;
  (function mesurer() {
    var y = window.scrollY;
    vitesse = lerp(vitesse, y - yPrec, 0.15); yPrec = y;
    requestAnimationFrame(mesurer);
  })();

  /* ---------- Bandeau géant qui défile ---------- */
  var geant = document.querySelector('[data-geant]');
  if (geant) {
    var gx = 0, geantVisible = true;
    if ('IntersectionObserver' in window) new IntersectionObserver(function (e) { geantVisible = e[0].isIntersecting; }).observe(geant);
    (function boucle() {
      requestAnimationFrame(boucle);
      if (!geantVisible) return;
      var moitie = geant.scrollWidth / 2;
      if (!reduit) gx -= 0.7 + Math.abs(vitesse) * 0.4;
      if (gx <= -moitie) gx += moitie;
      var penche = reduit ? 0 : Math.max(-8, Math.min(8, vitesse * 0.3));
      geant.style.transform = 'translate3d(' + gx.toFixed(1) + 'px,0,0) skewX(' + (-penche).toFixed(2) + 'deg)';
    })();
  }

  /* ---------- Spectre audio du hero : suit la souris ---------- */
  var toile = document.querySelector('[data-spectre]');
  if (toile && !reduit) {
    var ctx = toile.getContext('2d'), L = 0, H = 0, dpr = Math.min(window.devicePixelRatio || 1, 2);
    var zone = toile.closest('.hero') || toile.parentElement;
    var souris = { x: -1, y: 0, f: 0 }, cibleF = 0, spectreVisible = true;
    var N = 72, hauteurs = new Array(N).fill(0);
    var dimensionner = function () {
      L = toile.offsetWidth; H = toile.offsetHeight;
      toile.width = L * dpr; toile.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    dimensionner(); addEventListener('resize', dimensionner);
    zone.addEventListener('pointermove', function (e) {
      var r = toile.getBoundingClientRect();
      souris.x = (e.clientX - r.left) / r.width; souris.y = (e.clientY - r.top) / r.height; cibleF = 1;
    });
    zone.addEventListener('pointerleave', function () { cibleF = 0; });
    if ('IntersectionObserver' in window) new IntersectionObserver(function (e) { spectreVisible = e[0].isIntersecting; }).observe(toile);

    (function dessiner(t) {
      requestAnimationFrame(dessiner);
      if (!spectreVisible) return;
      t = (t || 0) / 1000;
      souris.f = lerp(souris.f, cibleF, 0.05);
      ctx.clearRect(0, 0, L, H);
      var pas = L / N, base = H, maxH = H * 0.42;
      var beat = Math.pow(Math.max(0, Math.sin(t * Math.PI * 2 * (124 / 60) / 2)), 8); // pulsation à 124 BPM
      var grad = ctx.createLinearGradient(0, base - maxH, 0, base);
      grad.addColorStop(0, 'rgba(164,244,255,.9)'); grad.addColorStop(0.5, 'rgba(91,232,255,.45)'); grad.addColorStop(1, 'rgba(28,125,148,0)');
      for (var i = 0; i < N; i++) {
        var x = i / N;
        var musique = 0.18 + 0.22 * Math.abs(Math.sin(i * 0.31 + t * 1.7)) * Math.abs(Math.cos(i * 0.13 - t * 0.9)) + (i < N * 0.25 ? beat * 0.35 * (1 - i / (N * 0.25)) : 0);
        var proche = Math.exp(-Math.pow((x - souris.x) * 7, 2)) * souris.f;
        var cible = Math.min(1, musique + proche * (0.55 + 0.25 * Math.sin(t * 9 + i)));
        hauteurs[i] = lerp(hauteurs[i], cible, 0.18);
        var h = hauteurs[i] * maxH;
        ctx.fillStyle = grad;
        ctx.fillRect(i * pas + pas * 0.22, base - h, pas * 0.56, h);
        if (proche > 0.25) { ctx.fillStyle = 'rgba(234,246,251,' + (proche * 0.9).toFixed(2) + ')'; ctx.fillRect(i * pas + pas * 0.22, base - h - 3, pas * 0.56, 2); }
      }
      // Onde qui se déforme près du curseur
      ctx.beginPath();
      for (var k = 0; k <= 160; k++) {
        var px = k / 160, yy = H * 0.5;
        var amp = 10 + 60 * Math.exp(-Math.pow((px - souris.x) * 5, 2)) * souris.f + beat * 12;
        yy += Math.sin(px * 18 + t * 2.4) * amp * 0.6 + Math.sin(px * 41 - t * 3.1) * amp * 0.25;
        if (k) ctx.lineTo(px * L, yy); else ctx.moveTo(px * L, yy);
      }
      ctx.strokeStyle = 'rgba(91,232,255,.35)'; ctx.lineWidth = 1.5;
      ctx.shadowColor = '#5be8ff'; ctx.shadowBlur = 12; ctx.stroke(); ctx.shadowBlur = 0;
    })();
  }
})();
