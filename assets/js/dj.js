/* Phoxy : visuels DJ interactifs.
   - Cabine (accueil) : deux platines à scratcher, écran de waveforms 3 bandes,
     mixeur (EQ, faders, crossfader, vumètres), pads de performance.
   - Studio (méthode) : séquenceur multipiste avec tête de lecture, mute et solo.
   - Catalogue : le vinyle sort de sa pochette au survol et tourne pendant l'écoute.
   Aucun son n'est joué : tout est visuel. */
(function () {
  'use strict';

  var reduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  var borne = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var graine = function (s) { return function () { s = (s * 16807) % 2147483647; return s / 2147483647; }; };
  var visibleQuand = function (el, rappel) {
    if (!('IntersectionObserver' in window)) { rappel(true); return; }
    new IntersectionObserver(function (e) { rappel(e[0].isIntersecting); }, { rootMargin: '120px' }).observe(el);
  };
  var temps = function (s) {
    s = Math.max(0, s);
    var m = Math.floor(s / 60), r = s - m * 60;
    return String(m).padStart(2, '0') + ':' + r.toFixed(1).padStart(4, '0');
  };

  /* =====================================================================
     1. Cabine DJ
     ===================================================================== */
  var cabine = document.querySelector('[data-cabine]');
  if (cabine) (function () {
    var PAR_S = 20;                       // échantillons de waveform par seconde
    var TOUR = 60 / 33.333;               // secondes de musique par tour de plateau
    var VITESSE = Math.PI * 2 / TOUR;     // radians par seconde à vitesse normale

    function genererOnde(duree, bpm, s) {
      var r = graine(s), n = Math.floor(duree * PAR_S), basse = new Float32Array(n), med = new Float32Array(n), aigu = new Float32Array(n);
      var temps1 = 60 / bpm;
      for (var i = 0; i < n; i++) {
        var t = i / PAR_S, mesure = Math.floor(t / (4 * temps1)), phrase = Math.floor(mesure / 16) % 4;
        var energie = [0.55, 1, 0.42, 1][phrase] * (t < 4 ? t / 4 : 1) * (t > duree - 6 ? (duree - t) / 6 : 1);
        var phase = (t % temps1) / temps1, kick = Math.exp(-phase * 7), charley = Math.exp(-Math.abs(phase - 0.5) * 12);
        var avecKick = phrase !== 2;
        basse[i] = borne(energie * (avecKick ? 0.3 + 0.7 * kick : 0.14 + 0.1 * Math.sin(t * 3)) * (0.85 + 0.15 * r()), 0, 1);
        med[i] = borne(energie * (0.3 + 0.28 * Math.abs(Math.sin(t * 2.1 + s)) + 0.18 * r()), 0, 1);
        aigu[i] = borne(energie * (0.16 + 0.32 * charley + 0.14 * r()), 0, 1);
      }
      return { basse: basse, med: med, aigu: aigu, n: n };
    }

    var decks = Array.prototype.map.call(cabine.querySelectorAll('[data-deck]'), function (el) {
      var bpm = parseFloat(el.getAttribute('data-bpm')), duree = parseFloat(el.getAttribute('data-duree'));
      var d = {
        el: el, cle: el.getAttribute('data-deck'), bpm: bpm, duree: duree,
        onde: genererOnde(duree, bpm, parseInt(el.getAttribute('data-graine'), 10)),
        pos: parseFloat(el.getAttribute('data-depart')) || 0, angle: 0, vitesse: 0, lecture: el.getAttribute('data-lecture') === 'oui',
        tient: false, dernierAngle: 0, boucle: null, turbo: 0, eq: { aigu: 0, med: 0, basse: 0 }, volume: 0.85, niveau: 0, crete: 0,
        cues: [8, 46, 92, 150].map(function (c) { return c * 60 / bpm / 2; })
      };
      d.disque = el.querySelector('.jog__disque');
      d.jog = el.querySelector('.jog');
      d.toile = cabine.querySelector('[data-onde="' + d.cle + '"]');
      d.apercu = cabine.querySelector('[data-apercu-onde="' + d.cle + '"]');
      d.restant = cabine.querySelector('[data-restant="' + d.cle + '"]');
      d.vu = cabine.querySelectorAll('[data-vu="' + d.cle + '"] i');
      d.boutonLecture = el.querySelector('[data-lecture-bouton]');
      majLecture(d);
      return d;
    });

    function majLecture(d) {
      d.el.classList.toggle('en-lecture', d.lecture);
      if (d.boutonLecture) d.boutonLecture.setAttribute('aria-pressed', d.lecture ? 'true' : 'false');
    }

    /* ---- Gain d'une bande d'EQ : -1 coupe, +1 pousse ---- */
    var gainEq = function (v) { return v < 0 ? 1 + v : 1 + v * 0.6; };
    var xfader = 0;
    var gainCanal = function (d) {
      var g = d.cle === 'a' ? Math.min(1, 1 - xfader) : Math.min(1, 1 + xfader);
      return d.volume * g;
    };

    /* ---- Dessin de la waveform défilante (3 bandes) ---- */
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var COULEURS = { basse: '#2f6bff', med: '#ff9b2f', aigu: '#f4f8ff' };
    function dimensionner(toile) {
      if (!toile) return;
      var L = toile.offsetWidth, H = toile.offsetHeight;
      toile.width = Math.max(1, L * dpr); toile.height = Math.max(1, H * dpr);
      toile.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function dessinerApercu(d) {
      var c = d.apercu; if (!c) return;
      dimensionner(c);
      var ctx = c.getContext('2d'), L = c.offsetWidth, H = c.offsetHeight, o = d.onde;
      ctx.clearRect(0, 0, L, H);
      for (var x = 0; x < L; x++) {
        var a = Math.floor(x / L * o.n), b = Math.floor((x + 1) / L * o.n), mb = 0, mm = 0, ma = 0;
        for (var i = a; i < b; i++) { mb = Math.max(mb, o.basse[i]); mm = Math.max(mm, o.med[i]); ma = Math.max(ma, o.aigu[i]); }
        ctx.fillStyle = COULEURS.basse; ctx.fillRect(x, H / 2 - mb * H / 2, 1, mb * H);
        ctx.fillStyle = COULEURS.med; ctx.fillRect(x, H / 2 - mm * H * 0.32, 1, mm * H * 0.64);
        ctx.fillStyle = COULEURS.aigu; ctx.fillRect(x, H / 2 - ma * H * 0.16, 1, ma * H * 0.32);
      }
      d.apercuImage = ctx.getImageData(0, 0, c.width, c.height);
    }
    function dessinerOnde(d) {
      var c = d.toile; if (!c) return;
      var ctx = c.getContext('2d'), L = c.offsetWidth, H = c.offsetHeight, o = d.onde, centre = L / 2, pps = 70;
      var gb = gainEq(d.eq.basse), gm = gainEq(d.eq.med), ga = gainEq(d.eq.aigu);
      ctx.clearRect(0, 0, L, H);
      for (var x = 0; x < L; x++) {
        var t = d.pos + (x - centre) / pps, i = Math.floor(t * PAR_S);
        if (i < 0 || i >= o.n) continue;
        ctx.globalAlpha = x < centre ? 0.5 : 1;
        var hb = o.basse[i] * gb * H * 0.46, hm = o.med[i] * gm * H * 0.3, ha = o.aigu[i] * ga * H * 0.15;
        ctx.fillStyle = COULEURS.basse; ctx.fillRect(x, H / 2 - hb, 1, hb * 2);
        ctx.fillStyle = COULEURS.med; ctx.fillRect(x, H / 2 - hm, 1, hm * 2);
        ctx.fillStyle = COULEURS.aigu; ctx.fillRect(x, H / 2 - ha, 1, ha * 2);
      }
      ctx.globalAlpha = 1;
      // Grille de temps : un trait par temps, un repère rouge par mesure
      var temps1 = 60 / d.bpm, debut = Math.floor((d.pos - centre / pps) / temps1), fin = Math.ceil((d.pos + centre / pps) / temps1);
      for (var k = debut; k <= fin; k++) {
        if (k < 0) continue;
        var bx = Math.round(centre + (k * temps1 - d.pos) * pps) + 0.5, mesure = k % 4 === 0;
        ctx.fillStyle = mesure ? 'rgba(255,72,96,.9)' : 'rgba(255,255,255,.28)';
        ctx.fillRect(bx, 0, 1, mesure ? 7 : 4); ctx.fillRect(bx, H - (mesure ? 7 : 4), 1, mesure ? 7 : 4);
      }
      // Hot cues
      var COUL_CUES = ['#2ee86a', '#5be8ff', '#ff9b2f', '#ff4f8b'];
      d.cues.forEach(function (cue, n) {
        var cx = centre + (cue - d.pos) * pps;
        if (cx < -10 || cx > L + 10) return;
        ctx.fillStyle = COUL_CUES[n];
        ctx.beginPath(); ctx.moveTo(cx - 5, 0); ctx.lineTo(cx + 5, 0); ctx.lineTo(cx, 7); ctx.fill();
        ctx.fillRect(cx, 0, 1, H);
      });
      // Boucle active
      if (d.boucle) {
        var lx = centre + (d.boucle.debut - d.pos) * pps;
        ctx.fillStyle = 'rgba(46,232,106,.16)'; ctx.fillRect(lx, 0, d.boucle.duree * pps, H);
      }
      // Tête de lecture
      ctx.fillStyle = '#ff4860'; ctx.shadowColor = '#ff4860'; ctx.shadowBlur = 8;
      ctx.fillRect(centre - 1, 0, 2, H); ctx.shadowBlur = 0;

      // Aperçu du morceau entier
      if (d.apercu && d.apercuImage) {
        var ac = d.apercu.getContext('2d'), AL = d.apercu.offsetWidth, AH = d.apercu.offsetHeight;
        ac.setTransform(1, 0, 0, 1, 0, 0); ac.putImageData(d.apercuImage, 0, 0); ac.setTransform(dpr, 0, 0, dpr, 0, 0);
        var px = d.pos / d.duree * AL;
        ac.fillStyle = 'rgba(6,12,20,.55)'; ac.fillRect(0, 0, px, AH);
        ac.fillStyle = '#ff4860'; ac.fillRect(px - 1, 0, 2, AH);
      }
    }
    function toutDimensionner() {
      decks.forEach(function (d) { dimensionner(d.toile); dessinerApercu(d); dessinerOnde(d); });
    }

    /* ---- Plateaux : on attrape le disque pour scratcher ---- */
    decks.forEach(function (d) {
      if (!d.jog) return;
      var angleDe = function (e) {
        var r = d.jog.getBoundingClientRect();
        return Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2));
      };
      d.jog.addEventListener('pointerdown', function (e) {
        e.preventDefault();
        d.tient = true; d.dernierAngle = angleDe(e); d.jog.setPointerCapture(e.pointerId);
        d.el.classList.add('scratch'); demarrer();
      });
      d.jog.addEventListener('pointermove', function (e) {
        if (!d.tient) return;
        var a = angleDe(e), delta = a - d.dernierAngle;
        if (delta > Math.PI) delta -= Math.PI * 2; if (delta < -Math.PI) delta += Math.PI * 2;
        d.dernierAngle = a; d.angle += delta;
        d.pos = borne(d.pos + delta / (Math.PI * 2) * TOUR, 0, d.duree);
        d.vitesse = delta * 60; d.scratchEnergie = Math.min(1, Math.abs(delta) * 6);
      });
      var lacher = function () { if (!d.tient) return; d.tient = false; d.el.classList.remove('scratch'); };
      d.jog.addEventListener('pointerup', lacher); d.jog.addEventListener('pointercancel', lacher);
      d.jog.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); d.pos = borne(d.pos + (e.key === 'ArrowRight' ? 0.5 : -0.5), 0, d.duree); d.angle += (e.key === 'ArrowRight' ? 1 : -1) * 0.5 / TOUR * Math.PI * 2; demarrer(); }
      });
    });

    /* ---- Boutons de transport et pads ---- */
    cabine.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      var d = decks.filter(function (x) { return x.el.contains(b); })[0];
      if (b.hasAttribute('data-lecture-bouton') && d) { d.lecture = !d.lecture; majLecture(d); }
      else if (b.hasAttribute('data-cue') && d) { d.lecture = false; d.pos = d.cues[0]; majLecture(d); }
      else if (b.hasAttribute('data-sync') && d) { b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') === 'true' ? 'false' : 'true'); }
      else if (b.hasAttribute('data-pad') && d) {
        var n = parseInt(b.getAttribute('data-pad'), 10);
        b.classList.remove('flash'); void b.offsetWidth; b.classList.add('flash');
        if (n < 4) { d.pos = d.cues[n]; if (!d.lecture) { d.lecture = true; majLecture(d); } }
        else if (n === 4) {
          var t1 = 60 / d.bpm;
          d.boucle = d.boucle ? null : { debut: Math.floor(d.pos / t1) * t1, duree: t1 };
          b.setAttribute('aria-pressed', d.boucle ? 'true' : 'false');
        }
        else if (n === 5) { d.lecture = false; majLecture(d); }
        else if (n === 6) { d.turbo = 1.2; if (!d.lecture) { d.lecture = true; majLecture(d); } }
        else if (n === 7) {
          var coupe = d.eq.basse > -1;
          d.eq.basse = coupe ? -1 : 0; b.setAttribute('aria-pressed', coupe ? 'true' : 'false');
          var bouton = cabine.querySelector('[data-bouton-eq="' + d.cle + '-basse"]'); if (bouton) poserBouton(bouton, d.eq.basse);
        }
      }
      demarrer();
    });

    /* ---- Boutons rotatifs d'EQ ---- */
    function poserBouton(el, v) {
      el.setAttribute('data-valeur', v);
      el.setAttribute('aria-valuenow', Math.round(v * 100));
      el.style.setProperty('--r', (v * 135).toFixed(1) + 'deg');
      var p = el.getAttribute('data-bouton-eq').split('-'), d = decks.filter(function (x) { return x.cle === p[0]; })[0];
      if (d) d.eq[p[1]] = v;
    }
    cabine.querySelectorAll('[data-bouton-eq]').forEach(function (el) {
      poserBouton(el, 0);
      var y0 = 0, v0 = 0, tient = false;
      el.addEventListener('pointerdown', function (e) { e.preventDefault(); tient = true; y0 = e.clientY; v0 = parseFloat(el.getAttribute('data-valeur')); el.setPointerCapture(e.pointerId); });
      el.addEventListener('pointermove', function (e) { if (tient) { poserBouton(el, borne(v0 - (e.clientY - y0) / 90, -1, 1)); demarrer(); } });
      el.addEventListener('pointerup', function () { tient = false; });
      el.addEventListener('pointercancel', function () { tient = false; });
      el.addEventListener('dblclick', function () { poserBouton(el, 0); demarrer(); });
      el.addEventListener('wheel', function (e) { e.preventDefault(); poserBouton(el, borne(parseFloat(el.getAttribute('data-valeur')) - Math.sign(e.deltaY) * 0.1, -1, 1)); demarrer(); }, { passive: false });
      el.addEventListener('keydown', function (e) {
        var v = parseFloat(el.getAttribute('data-valeur'));
        if (e.key === 'ArrowUp' || e.key === 'ArrowRight') { e.preventDefault(); poserBouton(el, borne(v + 0.1, -1, 1)); }
        if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') { e.preventDefault(); poserBouton(el, borne(v - 0.1, -1, 1)); }
        if (e.key === 'Home') poserBouton(el, 0);
        demarrer();
      });
    });

    /* ---- Faders ---- */
    cabine.querySelectorAll('[data-volume]').forEach(function (inp) {
      var d = decks.filter(function (x) { return x.cle === inp.getAttribute('data-volume'); })[0];
      var maj = function () { if (d) d.volume = inp.value / 100; demarrer(); };
      inp.addEventListener('input', maj); maj();
    });
    var xf = cabine.querySelector('[data-crossfader]');
    if (xf) { var majX = function () { xfader = xf.value / 100; demarrer(); }; xf.addEventListener('input', majX); majX(); }

    /* ---- Boucle d'animation ---- */
    var visible = false, enCours = false, avant = 0, horloge = 0;
    var bpmMaitre = cabine.querySelector('[data-bpm-maitre]');
    function image(t) {
      var dt = Math.min(0.05, (t - (avant || t)) / 1000); avant = t; horloge += dt;
      var calme = true;
      decks.forEach(function (d) {
        if (!d.tient) {
          var cible = d.lecture ? VITESSE * (1 + d.turbo) : 0;
          d.vitesse = lerp(d.vitesse, cible, d.lecture ? 0.12 : 0.045);
          d.turbo = Math.max(0, d.turbo - dt * 1.4);
          d.angle += d.vitesse * dt;
          d.pos += d.vitesse / VITESSE * dt;
          d.scratchEnergie = lerp(d.scratchEnergie || 0, 0, 0.1);
        }
        if (d.boucle && d.pos >= d.boucle.debut + d.boucle.duree) d.pos -= d.boucle.duree;
        if (d.pos >= d.duree) { d.pos = 0; }
        d.pos = borne(d.pos, 0, d.duree);
        if (d.disque) d.disque.style.transform = 'rotate(' + (d.angle * 180 / Math.PI).toFixed(2) + 'deg)';
        if (d.jog) d.jog.style.setProperty('--p', (d.pos / d.duree * 360).toFixed(1) + 'deg');
        if (d.restant) d.restant.textContent = '-' + temps(d.duree - d.pos);

        // Niveau du canal : énergie à la tête de lecture, EQ, fader, crossfader
        var i = Math.floor(d.pos * PAR_S), o = d.onde;
        var bouge = Math.min(1, Math.abs(d.vitesse) / VITESSE);
        var e = i < o.n ? (o.basse[i] * gainEq(d.eq.basse) * 0.55 + o.med[i] * gainEq(d.eq.med) * 0.3 + o.aigu[i] * gainEq(d.eq.aigu) * 0.2) : 0;
        var niv = borne(e * gainCanal(d) * Math.max(bouge, d.scratchEnergie || 0) * 1.15, 0, 1);
        d.niveau = lerp(d.niveau, niv, niv > d.niveau ? 0.5 : 0.12);
        d.crete = Math.max(d.crete - dt * 0.6, d.niveau);
        var allumes = Math.round(d.niveau * d.vu.length), crete = Math.min(d.vu.length - 1, Math.round(d.crete * d.vu.length));
        for (var k = 0; k < d.vu.length; k++) d.vu[k].className = k < allumes || k === crete ? 'on' : '';
        dessinerOnde(d);
        if (d.lecture || d.tient || Math.abs(d.vitesse) > 0.01 || d.niveau > 0.01) calme = false;
      });
      if (bpmMaitre) bpmMaitre.textContent = (124 + Math.sin(horloge * 0.7) * 0.02).toFixed(2);
      if (visible && !calme) requestAnimationFrame(image); else enCours = false;
    }
    function demarrer() { if (!enCours && visible) { enCours = true; avant = 0; requestAnimationFrame(image); } }

    toutDimensionner();
    addEventListener('resize', toutDimensionner);
    if (reduit) decks.forEach(function (d) { d.lecture = false; majLecture(d); });
    visibleQuand(cabine, function (v) { visible = v; if (v) demarrer(); });
  })();

  /* =====================================================================
     2. Studio (séquenceur multipiste)
     ===================================================================== */
  var studio = document.querySelector('[data-studio]');
  if (studio) (function () {
    var MESURES = 16, BPM = 124, DUREE = MESURES * 4 * 60 / BPM;
    var tete = studio.querySelector('.studio__tete');
    var zone = studio.querySelector('.studio__lignes');
    var affichage = studio.querySelector('[data-position]');
    var bouton = studio.querySelector('[data-studio-lecture]');
    var pistes = Array.prototype.map.call(studio.querySelectorAll('[data-piste]'), function (p) {
      return { el: p, ligne: studio.querySelector('[data-ligne="' + p.getAttribute('data-piste') + '"]'), mute: false, solo: false, niveau: 0,
        vu: p.querySelector('.piste__vu i'), clips: [] };
    });
    pistes.forEach(function (p) {
      if (!p.ligne) return;
      p.clips = Array.prototype.map.call(p.ligne.querySelectorAll('.clip'), function (c) {
        return { el: c, debut: parseFloat(c.getAttribute('data-debut')), fin: parseFloat(c.getAttribute('data-debut')) + parseFloat(c.getAttribute('data-longueur')) };
      });
    });
    var pos = 0, lecture = !reduit, visible = false, enCours = false, avant = 0;

    var etatPistes = function () {
      var unSolo = pistes.some(function (p) { return p.solo; });
      pistes.forEach(function (p) {
        var audible = !p.mute && (!unSolo || p.solo);
        p.audible = audible;
        p.el.classList.toggle('muette', !audible);
        if (p.ligne) p.ligne.classList.toggle('muette', !audible);
      });
    };
    studio.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      var p = pistes.filter(function (x) { return x.el.contains(b); })[0];
      if (b.hasAttribute('data-mute') && p) { p.mute = !p.mute; b.setAttribute('aria-pressed', p.mute); etatPistes(); }
      if (b.hasAttribute('data-solo') && p) { p.solo = !p.solo; b.setAttribute('aria-pressed', p.solo); etatPistes(); }
      if (b.hasAttribute('data-studio-lecture')) { lecture = !lecture; }
      if (b.hasAttribute('data-studio-debut')) { pos = 0; }
      bouton.setAttribute('aria-pressed', lecture ? 'true' : 'false');
      bouton.setAttribute('aria-label', lecture ? 'Pause' : 'Lecture');
      demarrer(true);
    });
    // Cliquer dans la règle ou les lignes déplace la tête de lecture
    var deplacer = function (e) {
      var r = zone.getBoundingClientRect();
      pos = borne((e.clientX - r.left) / r.width, 0, 0.9999) * DUREE; demarrer(true);
    };
    var regle = studio.querySelector('.studio__regle');
    var glisse = false;
    [regle, zone].forEach(function (z) {
      if (!z) return;
      z.addEventListener('pointerdown', function (e) { if (e.target.closest('button')) return; glisse = true; z.setPointerCapture(e.pointerId); deplacer(e); });
      z.addEventListener('pointermove', function (e) { if (glisse) deplacer(e); });
      z.addEventListener('pointerup', function () { glisse = false; });
    });
    etatPistes();

    function image(t) {
      var dt = Math.min(0.05, (t - (avant || t)) / 1000); avant = t;
      if (lecture) pos = (pos + dt) % DUREE;
      var mesure = pos / DUREE * MESURES, frac = mesure / MESURES;
      tete.style.left = (frac * 100).toFixed(3) + '%';
      var m = Math.floor(mesure), temps1 = Math.floor((mesure - m) * 4), sous = Math.floor(((mesure - m) * 4 - temps1) * 4);
      if (affichage) affichage.textContent = String(m + 1).padStart(2, '0') + '.' + (temps1 + 1) + '.' + (sous + 1);
      var phase = (mesure * 4) % 1;
      pistes.forEach(function (p) {
        var actif = null;
        p.clips.forEach(function (c) { var dedans = mesure >= c.debut && mesure < c.fin; c.el.classList.toggle('joue', dedans && lecture); if (dedans) actif = c; });
        var cible = actif && p.audible && lecture ? 0.45 + 0.5 * Math.exp(-phase * 4) * (0.7 + 0.3 * Math.random()) : 0;
        p.niveau = lerp(p.niveau, cible, cible > p.niveau ? 0.5 : 0.15);
        if (p.vu) p.vu.style.transform = 'scaleY(' + p.niveau.toFixed(3) + ')';
      });
      if (visible && (lecture || pistes.some(function (p) { return p.niveau > 0.01; }))) requestAnimationFrame(image); else enCours = false;
    }
    function demarrer(force) { if ((!enCours && visible) || force) { if (enCours) return; enCours = true; avant = 0; requestAnimationFrame(image); } }
    bouton.setAttribute('aria-pressed', lecture ? 'true' : 'false');
    visibleQuand(studio, function (v) { visible = v; if (v) demarrer(); });
  })();

  /* =====================================================================
     3. Catalogue : vinyles dans les pochettes
     ===================================================================== */
  document.querySelectorAll('.sortie').forEach(function (sortie) {
    var pochette = sortie.querySelector('.sortie__pochette');
    if (!pochette || pochette.parentElement.classList.contains('sortie__bac')) return;
    var bac = document.createElement('div'); bac.className = 'sortie__bac';
    var vinyle = document.createElement('span'); vinyle.className = 'sortie__vinyle'; vinyle.setAttribute('aria-hidden', 'true');
    var img = pochette.querySelector('img');
    if (img && !pochette.classList.contains('sortie__pochette--marque')) vinyle.style.setProperty('--rond', 'url("' + img.src + '")');
    pochette.parentElement.insertBefore(bac, pochette);
    bac.appendChild(vinyle); bac.appendChild(pochette);
    var lecteur = sortie.querySelector('[data-sc-lecteur]');
    if (lecteur && 'MutationObserver' in window) {
      new MutationObserver(function () { sortie.classList.toggle('en-ecoute', !lecteur.hidden); })
        .observe(lecteur, { attributes: true, attributeFilter: ['hidden'] });
    }
  });
})();
