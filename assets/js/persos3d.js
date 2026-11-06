/* Phoxy : petits personnages 3D (DJ, chanteuse, rappeur) en costume de soirée velours noir. Three.js r128. */
(function () {
  "use strict";
  var toiles = document.querySelectorAll("[data-perso]");
  if (!toiles.length) return;
  var reduit = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var webgl = (function () { try { var c = document.createElement("canvas"); return !!(window.WebGLRenderingContext && (c.getContext("webgl") || c.getContext("experimental-webgl"))); } catch (e) { return false; } })();
  if (!window.THREE || !webgl || reduit) return;
  var THREE = window.THREE;
  var BPM = 124, BATTEMENT = 60 / BPM;
  var lerp = function (a, b, t) { return a + (b - a) * t; };

  /* ---- Matériaux partagés ---- */
  function lumiere(m) { m.blending = THREE.CustomBlending; m.blendEquation = THREE.AddEquation; m.blendSrc = THREE.SrcAlphaFactor; m.blendDst = THREE.OneFactor; m.blendSrcAlpha = THREE.ZeroFactor; m.blendDstAlpha = THREE.OneFactor; m.transparent = true; m.depthWrite = false; return m; }
  var M = {
    velours: new THREE.MeshStandardMaterial({ color: 0x0c1018, roughness: 0.38, metalness: 0.55 }),
    revers: new THREE.MeshStandardMaterial({ color: 0x05070b, roughness: 0.15, metalness: 0.8, emissive: 0x062a33, emissiveIntensity: 0.6 }),
    chemise: new THREE.MeshStandardMaterial({ color: 0xe9f6fb, roughness: 0.6 }),
    peau: new THREE.MeshStandardMaterial({ color: 0xd8a27c, roughness: 0.65 }),
    cheveux: new THREE.MeshStandardMaterial({ color: 0x17110d, roughness: 0.5, metalness: 0.1 }),
    neon: new THREE.MeshStandardMaterial({ color: 0x8ff0ff, emissive: 0x19c6e8, emissiveIntensity: 1.1, roughness: 0.3 }),
    rose: new THREE.MeshStandardMaterial({ color: 0xff8fb4, emissive: 0xff2f7a, emissiveIntensity: 0.9 }),
    noir: new THREE.MeshStandardMaterial({ color: 0x06080c, roughness: 0.3, metalness: 0.6 }),
    oeil: new THREE.MeshBasicMaterial({ color: 0x05070b }),
    meuble: new THREE.MeshStandardMaterial({ color: 0x0d1822, roughness: 0.35, metalness: 0.6 }),
    halo: lumiere(new THREE.MeshBasicMaterial({ color: 0x5be8ff, opacity: 0.16, side: THREE.DoubleSide }))
  };
  function maille(geo, mat, x, y, z, parent) { var m = new THREE.Mesh(geo, mat); m.position.set(x || 0, y || 0, z || 0); if (parent) parent.add(m); return m; }

  /* ---- Le personnage : grosse tête, smoking velours, nœud papillon néon ---- */
  function bras(cote, parent) {
    var epaule = new THREE.Group(); epaule.position.set(cote * 17, 18, 0); parent.add(epaule);
    maille(new THREE.SphereGeometry(6, 16, 12), M.velours, 0, 0, 0, epaule);
    maille(new THREE.CylinderGeometry(5, 4.5, 20, 14), M.velours, 0, -10, 0, epaule);
    var coude = new THREE.Group(); coude.position.y = -20; epaule.add(coude);
    maille(new THREE.SphereGeometry(4.6, 12, 10), M.velours, 0, 0, 0, coude);
    maille(new THREE.CylinderGeometry(4.4, 3.8, 17, 14), M.velours, 0, -8.5, 0, coude);
    maille(new THREE.CylinderGeometry(4, 4, 2.4, 14), M.chemise, 0, -17, 0, coude);
    var main = maille(new THREE.SphereGeometry(4.6, 14, 12), M.peau, 0, -21, 0, coude);
    return { epaule: epaule, coude: coude, main: main };
  }
  function personnage(opts) {
    var racine = new THREE.Group();
    var corps = new THREE.Group(); racine.add(corps);
    // Jambes et chaussures vernies
    [-1, 1].forEach(function (c) {
      maille(new THREE.CylinderGeometry(5.5, 5, 26, 14), M.velours, c * 7, -18, 0, corps);
      var ch = maille(new THREE.BoxGeometry(10, 5, 15), M.noir, c * 7, -32, 3, corps);
      ch.geometry.translate(0, 0, 0);
    });
    // Veste
    var buste = new THREE.Group(); buste.position.y = 0; corps.add(buste);
    maille(new THREE.CylinderGeometry(15, 13.5, 34, 22), M.velours, 0, 10, 0, buste);
    maille(new THREE.CylinderGeometry(13.6, 14, 6, 22), M.velours, 0, -8, 0, buste);
    // Plastron de chemise et revers satinés
    var plastron = maille(new THREE.CylinderGeometry(0.1, 6.5, 24, 3, 1, false, -Math.PI / 2 - Math.PI / 3, Math.PI * 2 / 3), M.chemise, 0, 16, 9.8, buste);
    plastron.rotation.x = 0.04;
    [-1, 1].forEach(function (c) {
      var r = maille(new THREE.BoxGeometry(3.2, 22, 1.2), M.revers, c * 6, 15, 13.6, buste);
      r.rotation.z = c * 0.32; r.rotation.y = c * 0.25;
    });
    for (var b = 0; b < 2; b++) maille(new THREE.SphereGeometry(1.1, 8, 6), M.noir, 0, 3 + b * 5, 14.3, buste);
    // Nœud papillon néon
    var noeud = new THREE.Group(); noeud.position.set(0, 26.5, 13.5); buste.add(noeud);
    [-1, 1].forEach(function (c) { var a = maille(new THREE.ConeGeometry(3.2, 6, 4), opts.accent || M.neon, c * 3.2, 0, 0, noeud); a.rotation.z = c * Math.PI / 2; });
    maille(new THREE.SphereGeometry(1.5, 8, 6), opts.accent || M.neon, 0, 0, 0.6, noeud);
    // Pochette
    maille(new THREE.BoxGeometry(4, 2.5, 1), opts.accent || M.neon, -8.5, 20, 13.2, buste);
    // Bras
    var bg = bras(-1, buste), bd = bras(1, buste);
    // Tête
    var cou = new THREE.Group(); cou.position.y = 30; buste.add(cou);
    maille(new THREE.CylinderGeometry(4.2, 4.6, 6, 12), M.peau, 0, 1, 0, cou);
    var tete = new THREE.Group(); tete.position.y = 18; cou.add(tete);
    maille(new THREE.SphereGeometry(16, 28, 22), M.peau, 0, 0, 0, tete);
    [-1, 1].forEach(function (c) {
      maille(new THREE.SphereGeometry(1.8, 10, 8), M.oeil, c * 5.6, 1.5, 14.6, tete);
      maille(new THREE.SphereGeometry(3, 10, 8), M.peau, c * 15.6, 0, 0, tete);
      var s = maille(new THREE.BoxGeometry(4.6, 1, 1), M.cheveux, c * 5.6, 6, 14.6, tete); s.rotation.z = c * -0.12;
    });
    var bouche = maille(new THREE.TorusGeometry(2.4, 0.6, 6, 16, Math.PI), M.oeil, 0, -5.5, 14.8, tete); bouche.rotation.z = Math.PI;
    // Cheveux
    var coiffe = new THREE.Group(); tete.add(coiffe);
    var calotte = maille(new THREE.SphereGeometry(17, 26, 18, 0, Math.PI * 2, 0, Math.PI * 0.52), M.cheveux, 0, 1.2, -1, coiffe);
    calotte.rotation.x = -0.18;
    if (opts.cheveuxLongs) {
      maille(new THREE.CylinderGeometry(16.5, 18, 26, 22, 1, true, Math.PI * 0.62, Math.PI * 1.76), M.cheveux, 0, -8, -1.5, coiffe).material.side = THREE.DoubleSide;
    } else {
      var meche = maille(new THREE.SphereGeometry(8, 14, 10), M.cheveux, 6, 12, 8, coiffe); meche.scale.set(1.4, 0.55, 0.8);
    }
    return { racine: racine, corps: corps, buste: buste, tete: tete, cou: cou, bg: bg, bd: bd, bouche: bouche, coiffe: coiffe };
  }

  /* ---- Accessoires de scène ---- */
  function faisceau(x, couleur) {
    var g = new THREE.Group(); g.position.set(x, 150, -40);
    var cone = maille(new THREE.ConeGeometry(42, 220, 32, 1, true), lumiere(new THREE.MeshBasicMaterial({ color: couleur || 0x5be8ff, opacity: 0.09, side: THREE.DoubleSide })), 0, -110, 0, g);
    cone.rotation.x = Math.PI;
    return g;
  }
  function sol(parent) {
    var grille = new THREE.GridHelper(400, 20, 0x1c7d94, 0x0f3b48); grille.position.y = -35; grille.material.transparent = true; grille.material.opacity = 0.5; parent.add(grille);
    var disque = maille(new THREE.CircleGeometry(70, 48), lumiere(new THREE.MeshBasicMaterial({ color: 0x5be8ff, opacity: 0.12 })), 0, -34.6, 0, parent);
    disque.rotation.x = -Math.PI / 2;
  }
  function anneaux(parent, n) {
    var l = [];
    for (var i = 0; i < n; i++) {
      var a = maille(new THREE.TorusGeometry(1, 0.05, 6, 48), lumiere(new THREE.MeshBasicMaterial({ color: 0xa4f4ff, opacity: 0 })), 0, 0, 0, parent);
      a.userData.d = i / n; l.push(a);
    }
    return l;
  }

  /* ---- Les trois scènes ---- */
  var SCENES = {
    dj: function (monde) {
      sol(monde);
      var p = personnage({}); p.racine.position.set(0, 8, -14); monde.add(p.racine);
      // Casque néon
      var casque = new THREE.Group(); p.tete.add(casque);
      var arc = maille(new THREE.TorusGeometry(17.5, 1.6, 8, 32, Math.PI), M.neon, 0, 0, 0, casque);
      [-1, 1].forEach(function (c) { var e = maille(new THREE.CylinderGeometry(5.5, 5.5, 4, 18), M.noir, c * 17.5, 0, 0, casque); e.rotation.z = Math.PI / 2; maille(new THREE.TorusGeometry(5.2, 0.7, 6, 20), M.neon, c * 19.6, 0, 0, casque).rotation.y = Math.PI / 2; });
      // Cabine : deux platines et une table de mixage
      var cabine = new THREE.Group(); cabine.position.set(0, -10, 26); monde.add(cabine);
      maille(new THREE.BoxGeometry(120, 44, 34), M.meuble, 0, -10, 0, cabine);
      maille(new THREE.BoxGeometry(122, 1.2, 1.2), M.neon, 0, 2, 17.2, cabine);
      maille(new THREE.PlaneGeometry(40, 10), lumiere(new THREE.MeshBasicMaterial({ color: 0x5be8ff, opacity: 0.5 })), 0, -10, 17.2, cabine);
      var plateaux = [-1, 1].map(function (c) {
        var pl = new THREE.Group(); pl.position.set(c * 36, 13, 0); cabine.add(pl);
        maille(new THREE.BoxGeometry(40, 3, 30), M.noir, 0, -1.5, 0, pl);
        var vinyle = new THREE.Group(); vinyle.position.y = 1.2; pl.add(vinyle);
        maille(new THREE.CylinderGeometry(13, 13, 1.2, 40), M.noir, 0, 0, 0, vinyle);
        maille(new THREE.CylinderGeometry(4.5, 4.5, 1.4, 24), M.neon, 0, 0.2, 0, vinyle);
        maille(new THREE.BoxGeometry(1, 1.6, 11), M.chemise, 0, 0.3, -6, vinyle);
        return vinyle;
      });
      var faders = [];
      for (var f = 0; f < 3; f++) { maille(new THREE.BoxGeometry(1.2, 0.6, 14), M.noir, -6 + f * 6, 12.6, 0, cabine); faders.push(maille(new THREE.BoxGeometry(3.4, 2, 2.6), f === 1 ? M.rose : M.neon, -6 + f * 6, 13.4, 0, cabine)); }
      var f1 = faisceau(-80), f2 = faisceau(80, 0x8b5cf6); monde.add(f1, f2);
      var special = 0;
      return {
        clic: function () { special = 1; },
        anim: function (t, dt) {
          var b = (t % BATTEMENT) / BATTEMENT, pulse = Math.pow(1 - b, 3);
          special = Math.max(0, special - dt * 0.7);
          var s = Math.sin(Math.min(1, special * 1.4) * Math.PI);
          p.tete.rotation.x = 0.12 + Math.sin(t * Math.PI * 2 / BATTEMENT) * 0.12;
          p.corps.position.y = -Math.abs(Math.sin(t * Math.PI / BATTEMENT)) * 1.6;
          // Main gauche sur le casque, main droite qui scratche
          p.bg.epaule.rotation.set(-0.3 * (1 - s), 0, -2.3 + s * -0.5); p.bg.coude.rotation.set(0, 0, -1.9 * (1 - s));
          var scratch = Math.sin(t * 9) * 0.22;
          p.bd.epaule.rotation.set(-1.05 * (1 - s), 0, 0.25 + s * 2.6); p.bd.coude.rotation.set(-0.8 * (1 - s) + scratch, 0, 0);
          plateaux[0].rotation.y -= dt * 3.4;
          plateaux[1].rotation.y += -dt * 3.4 + Math.cos(t * 9) * 0.12;
          faders.forEach(function (fd, i) { fd.position.z = Math.sin(t * 0.9 + i * 2) * 5; });
          f1.rotation.z = Math.sin(t * 0.8) * 0.35; f2.rotation.z = -Math.sin(t * 0.8) * 0.35;
          f1.children[0].material.opacity = 0.06 + pulse * 0.08 + s * 0.15;
          f2.children[0].material.opacity = 0.06 + pulse * 0.06 + s * 0.15;
          M.neon.emissiveIntensity = 0.9 + pulse * 0.6 + s;
        }
      };
    },
    chant: function (monde) {
      sol(monde);
      var p = personnage({ cheveuxLongs: true, accent: M.rose }); p.racine.position.set(-4, 8, 0); monde.add(p.racine);
      // Pied de micro
      var pied = new THREE.Group(); pied.position.set(16, -35, 26); monde.add(pied);
      maille(new THREE.CylinderGeometry(9, 9, 1.4, 24), M.noir, 0, 0.7, 0, pied);
      maille(new THREE.CylinderGeometry(0.9, 0.9, 62, 10), M.noir, 0, 31, 0, pied);
      var micro = new THREE.Group(); micro.position.set(-4, 64, 2); pied.add(micro);
      var tige = maille(new THREE.CylinderGeometry(0.8, 0.8, 16, 8), M.noir, 0, 0, 0, micro); tige.rotation.z = 0.9;
      maille(new THREE.SphereGeometry(3.4, 14, 12), M.neon, -7, 4.5, 0, micro);
      var ondes = anneaux(monde, 6);
      var spot = faisceau(0); spot.position.set(0, 160, -10); monde.add(spot);
      var notes = [];
      for (var n = 0; n < 5; n++) {
        var note = new THREE.Group(); monde.add(note);
        maille(new THREE.SphereGeometry(2.6, 10, 8), M.neon, 0, 0, 0, note).scale.set(1.3, 1, 1);
        maille(new THREE.CylinderGeometry(0.5, 0.5, 9, 6), M.neon, 2.8, 4.5, 0, note);
        note.userData = { d: n / 5, x: (n % 2 ? 1 : -1) * (40 + n * 9) };
        notes.push(note);
      }
      var special = 0;
      return {
        clic: function () { special = 1; },
        anim: function (t, dt) {
          special = Math.max(0, special - dt * 0.6);
          var s = Math.sin(Math.min(1, special * 1.3) * Math.PI);
          var balance = Math.sin(t * Math.PI / BATTEMENT / 2);
          p.racine.rotation.z = balance * 0.06;
          p.racine.position.x = -4 + balance * 3;
          p.tete.rotation.set(-0.15 - s * 0.35, 0.25, balance * 0.08);
          // Main droite au micro, main gauche expressive
          p.bd.epaule.rotation.set(-1.5, 0.2, 0.55); p.bd.coude.rotation.set(-1.4, 0, 0);
          p.bg.epaule.rotation.set(-0.6 - s * 1.6 + Math.sin(t * 1.3) * 0.25, 0, -0.5 - Math.sin(t * 1.3) * 0.3 - s * 0.6);
          p.bg.coude.rotation.set(-0.5 + Math.sin(t * 1.7) * 0.3, 0, 0);
          p.bouche.scale.setScalar(1 + Math.abs(Math.sin(t * 6)) * 0.6 + s);
          ondes.forEach(function (o) {
            var k = (t * 0.7 + o.userData.d) % 1;
            o.position.set(14 + k * 70, 58 + k * 14, 14);
            o.rotation.set(0, Math.PI / 2 - 0.5, 0);
            o.scale.setScalar(4 + k * (20 + s * 24));
            o.material.opacity = (1 - k) * (0.55 + s * 0.4);
          });
          notes.forEach(function (nt) {
            var k = (t * 0.25 + nt.userData.d) % 1;
            nt.position.set(nt.userData.x + Math.sin(k * 6) * 6, 10 + k * 90, -10);
            nt.rotation.z = Math.sin(t + nt.userData.d * 6) * 0.3;
            nt.scale.setScalar(Math.sin(k * Math.PI) * (1 + s));
          });
          spot.rotation.z = Math.sin(t * 0.5) * 0.12;
          spot.children[0].material.opacity = 0.11 + s * 0.15;
          M.rose.emissiveIntensity = 0.8 + Math.abs(Math.sin(t * 3)) * 0.5 + s;
        }
      };
    },
    rap: function (monde) {
      sol(monde);
      var p = personnage({}); p.racine.position.set(0, 8, 0); monde.add(p.racine);
      // Casquette néon portée à l'envers
      var casquette = new THREE.Group(); casquette.position.y = 5; p.tete.add(casquette);
      maille(new THREE.SphereGeometry(17.4, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.42), M.noir, 0, 0, 0, casquette);
      var visiere = maille(new THREE.CylinderGeometry(11, 11, 1.2, 24, 1, false, 0, Math.PI), M.neon, 0, 5.5, -12, casquette);
      visiere.rotation.y = Math.PI / 2; visiere.scale.set(1, 1, 0.9);
      p.coiffe.visible = false;
      // Chaîne néon
      var chaine = maille(new THREE.TorusGeometry(9, 0.9, 8, 32, Math.PI), M.neon, 0, 26, 12.5, p.buste); chaine.rotation.z = Math.PI; chaine.rotation.x = 0.35;
      maille(new THREE.OctahedronGeometry(2.6), M.neon, 0, 16.5, 15, p.buste);
      // Micro dans la main droite
      var mic = new THREE.Group(); mic.position.y = -24; p.bd.coude.add(mic);
      maille(new THREE.CylinderGeometry(1.6, 1.2, 12, 10), M.noir, 0, 4, 2, mic);
      maille(new THREE.SphereGeometry(3, 12, 10), M.neon, 0, 11, 2, mic);
      // Enceintes
      var enceintes = [-1, 1].map(function (c) {
        var e = new THREE.Group(); e.position.set(c * 72, -5, -20); monde.add(e);
        maille(new THREE.BoxGeometry(30, 60, 26), M.meuble, 0, 0, 0, e);
        var hp = maille(new THREE.CylinderGeometry(10, 10, 2, 28), M.noir, 0, -10, 13.2, e); hp.rotation.x = Math.PI / 2;
        var anneau = maille(new THREE.TorusGeometry(10.5, 0.8, 6, 32), M.neon, 0, -10, 14, e);
        maille(new THREE.TorusGeometry(5, 0.6, 6, 24), M.neon, 0, 16, 14, e);
        return { hp: hp, anneau: anneau };
      });
      var f1 = faisceau(-60, 0x8b5cf6), f2 = faisceau(60); monde.add(f1, f2);
      var special = 0, saut = 0;
      return {
        clic: function () { special = 1; },
        anim: function (t, dt) {
          var phase = t / BATTEMENT, b = phase % 1, pulse = Math.pow(1 - b, 3);
          special = Math.max(0, special - dt * 0.8);
          saut = Math.sin(Math.min(1, special * 1.25) * Math.PI);
          p.racine.position.y = 8 + Math.abs(Math.sin(phase * Math.PI)) * 3 + saut * 30;
          p.racine.rotation.y = (1 - special) * 0 + special * Math.PI * 2;
          p.tete.rotation.x = 0.1 + Math.sin(phase * Math.PI * 2) * 0.16;
          p.buste.rotation.y = Math.sin(phase * Math.PI) * 0.15;
          // Gestes de flow : main gauche qui tranche l'air, micro près de la bouche
          var geste = Math.sin(phase * Math.PI);
          p.bg.epaule.rotation.set(-1.1 - geste * 0.5 - saut, 0.2, -0.35 - saut * 0.8);
          p.bg.coude.rotation.set(-0.7 + geste * 0.4, 0, 0);
          p.bd.epaule.rotation.set(-1.45, -0.1, 0.5); p.bd.coude.rotation.set(-1.55, 0, 0);
          enceintes.forEach(function (e) { var k = 1 + pulse * 0.18; e.hp.scale.set(k, 1, k); e.anneau.scale.setScalar(k); });
          f1.rotation.z = Math.sin(t * 1.1) * 0.4; f2.rotation.z = -Math.sin(t * 1.1) * 0.4;
          f1.children[0].material.opacity = f2.children[0].material.opacity = 0.05 + pulse * 0.1 + saut * 0.15;
          M.neon.emissiveIntensity = 0.9 + pulse * 0.6 + saut;
        }
      };
    }
  };

  /* ---- Une scène Three.js par carte ---- */
  toiles.forEach(function (toile) {
    var type = toile.getAttribute("data-perso"), carte = toile.closest(".profil");
    if (!SCENES[type]) return;
    var rendu;
    try { rendu = new THREE.WebGLRenderer({ canvas: toile, antialias: true, alpha: true }); } catch (e) { return; }
    rendu.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    rendu.outputEncoding = THREE.sRGBEncoding;
    rendu.toneMapping = THREE.ACESFilmicToneMapping;
    var monde = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(30, 320 / 210, 1, 2000);
    camera.position.set(0, 40, 300); camera.lookAt(0, 22, 0);
    monde.add(new THREE.HemisphereLight(0x9fdfff, 0x0b0f16, 0.55));
    var cle = new THREE.DirectionalLight(0xffffff, 0.9); cle.position.set(120, 200, 220); monde.add(cle);
    var contre = new THREE.PointLight(0x5be8ff, 3.2, 600); contre.position.set(-120, 120, -140); monde.add(contre);
    var violet = new THREE.PointLight(0x8b5cf6, 1.6, 600); violet.position.set(160, 40, 120); monde.add(violet);
    var pivot = new THREE.Group(); monde.add(pivot);
    var ctrl = SCENES[type](pivot);

    var cible = { x: 0, y: 0 }, pos = { x: 0, y: 0 }, glisse = null, angleGlisse = 0;
    carte.addEventListener("pointermove", function (e) {
      var r = toile.getBoundingClientRect();
      cible.x = (e.clientX - r.left) / r.width * 2 - 1;
      cible.y = (e.clientY - r.top) / r.height * 2 - 1;
      if (glisse !== null) angleGlisse = glisse.a + (e.clientX - glisse.x) / r.width * Math.PI * 2;
    });
    carte.addEventListener("pointerleave", function () { cible.x = 0; cible.y = 0; });
    toile.addEventListener("pointerdown", function (e) { glisse = { x: e.clientX, a: angleGlisse, t: performance.now() }; toile.style.cursor = "grabbing"; });
    window.addEventListener("pointerup", function (e) {
      if (glisse === null) return;
      if (performance.now() - glisse.t < 250 && Math.abs(e.clientX - glisse.x) < 6) ctrl.clic();
      glisse = null; toile.style.cursor = "";
    });

    function taille() {
      var w = toile.clientWidth, h = toile.clientHeight;
      if (!w || !h) return;
      rendu.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    }
    var visible = false, horloge = new THREE.Clock(), raf = 0;
    function boucle() {
      var dt = Math.min(0.05, horloge.getDelta()), t = horloge.elapsedTime;
      pos.x = lerp(pos.x, cible.x, 0.07); pos.y = lerp(pos.y, cible.y, 0.07);
      pivot.rotation.y = lerp(pivot.rotation.y, angleGlisse + pos.x * 0.7 + Math.sin(t * 0.3) * 0.15, 0.1);
      camera.position.y = 40 - pos.y * 30; camera.lookAt(0, 22, 0);
      contre.position.x = -120 + pos.x * 160;
      ctrl.anim(t, dt);
      rendu.render(monde, camera);
      raf = visible ? requestAnimationFrame(boucle) : 0;
    }
    carte.classList.add("en-3d");
    taille(); window.addEventListener("resize", taille);
    new IntersectionObserver(function (es) {
      visible = es[0].isIntersecting;
      if (visible && !raf) { taille(); raf = requestAnimationFrame(boucle); }
    }, { rootMargin: "100px" }).observe(toile);
  });
})();
