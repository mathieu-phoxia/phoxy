/* Phoxy : la cigale néon en 3D au premier plan du hero (Three.js r128). */
(function () {
  "use strict";
  var scene = document.querySelector("[data-cigale-scene]");
  var toile = document.querySelector("[data-cigale3d]");
  if (!scene || !toile) return;
  var reduit = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var webgl = (function () { try { var c = document.createElement("canvas"); return !!(window.WebGLRenderingContext && (c.getContext("webgl") || c.getContext("experimental-webgl"))); } catch (e) { return false; } })();
  if (!window.THREE || !webgl || reduit) { scene.classList.add("sans-3d"); return; }

  var THREE = window.THREE;
  var doc = document.documentElement;
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  var ease = function (t) { return 1 - Math.pow(1 - t, 4); };

  var rendu = new THREE.WebGLRenderer({ canvas: toile, antialias: true, alpha: true });
  rendu.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  rendu.outputEncoding = THREE.sRGBEncoding;
  rendu.toneMapping = THREE.ACESFilmicToneMapping;
  var monde = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(32, 1, 1, 4000);
  camera.position.set(0, 0, 620);

  monde.add(new THREE.AmbientLight(0x9fdfff, 0.35));
  var cle = new THREE.PointLight(0xffffff, 1.4, 1600); cle.position.set(260, 240, 380); monde.add(cle);
  var cyan = new THREE.PointLight(0x5be8ff, 2.4, 1600); cyan.position.set(-300, -120, 260); monde.add(cyan);
  var arriere = new THREE.PointLight(0x1c7d94, 2, 1600); arriere.position.set(0, 80, -300); monde.add(arriere);

  /* ---- Matériaux néon ---- */
  var matCoeur = new THREE.MeshStandardMaterial({ color: 0x8ff0ff, emissive: 0x16b8dc, emissiveIntensity: 0.75, roughness: 0.22, metalness: 0.25 });
  // Lumière additive qui n'ajoute pas d'opacité au canvas : le halo éclaire la page sans rectangle sombre
  function lumiere(m) { m.blending = THREE.CustomBlending; m.blendEquation = THREE.AddEquation; m.blendSrc = THREE.SrcAlphaFactor; m.blendDst = THREE.OneFactor; m.blendSrcAlpha = THREE.ZeroFactor; m.blendDstAlpha = THREE.OneFactor; m.transparent = true; m.depthWrite = false; return m; }
  function matHalo(op) { return lumiere(new THREE.MeshBasicMaterial({ color: 0x2bc8ff, opacity: op })); }
  var halo1 = matHalo(0.13), halo2 = matHalo(0.045);

  function neon(geoCoeur, geoH1, geoH2) {
    var g = new THREE.Group();
    g.add(new THREE.Mesh(geoCoeur, matCoeur));
    g.add(new THREE.Mesh(geoH1, halo1));
    g.add(new THREE.Mesh(geoH2, halo2));
    return g;
  }
  function tube(points, rayon, ferme) {
    var courbe = new THREE.CatmullRomCurve3(points.map(function (p) { return new THREE.Vector3(p[0], p[1], 0); }), ferme, "centripetal");
    return neon(new THREE.TubeGeometry(courbe, 160, rayon, 16, ferme),
                new THREE.TubeGeometry(courbe, 120, rayon * 2.1, 12, ferme),
                new THREE.TubeGeometry(courbe, 80, rayon * 3.8, 10, ferme));
  }

  /* ---- La cigale, d'après le logo (coordonnées du PNG, centrées) ---- */
  var cigale = new THREE.Group(); monde.add(cigale);

  var tete = new THREE.Group(); tete.position.set(0, 98, 0);
  tete.add(neon(new THREE.TorusGeometry(20, 6.2, 24, 80), new THREE.TorusGeometry(20, 12, 16, 60), new THREE.TorusGeometry(20, 22, 12, 48)));
  cigale.add(tete);

  var profil = [[0, 74], [4.5, 72], [5.5, 50], [7, 10], [9.5, -40], [11, -70], [10.5, -95], [8, -116], [4, -128], [0, -132]]
    .map(function (p) { return new THREE.Vector2(p[0], p[1]); });
  function lathe(k) { return new THREE.LatheGeometry(profil.map(function (p) { return new THREE.Vector2(p.x * k + (k > 1 ? 3 * k : 0), p.y); }), 40); }
  var corps = neon(lathe(1), lathe(1.9), lathe(3.2));
  cigale.add(corps);

  var AILE = [[-7, 70], [-20, 35], [-40, 5], [-58, -25], [-62, -50], [-52, -66], [-30, -72], [-10, -66], [-5, -30], [-5, 30]];
  function aile(signe) {
    var pivot = new THREE.Group();
    var pts = AILE.map(function (p) { return [p[0] * signe, p[1]]; });
    pivot.add(tube(pts, 5.2, true));
    var forme = new THREE.Shape();
    var courbe = new THREE.CatmullRomCurve3(pts.map(function (p) { return new THREE.Vector3(p[0], p[1], 0); }), true, "centripetal");
    courbe.getPoints(80).forEach(function (p, i) { if (i) forme.lineTo(p.x, p.y); else forme.moveTo(p.x, p.y); });
    var membrane = new THREE.Mesh(new THREE.ShapeGeometry(forme), lumiere(new THREE.MeshBasicMaterial({ color: 0x5be8ff, opacity: 0.12, side: THREE.DoubleSide })));
    pivot.add(membrane);
    cigale.add(pivot);
    return pivot;
  }
  var aileG = aile(1), aileD = aile(-1);

  /* Halo doux derrière la cigale */
  var c = document.createElement("canvas"); c.width = c.height = 256;
  var g2 = c.getContext("2d"), gr = g2.createRadialGradient(128, 128, 0, 128, 128, 128);
  gr.addColorStop(0, "rgba(91,232,255,.55)"); gr.addColorStop(0.4, "rgba(91,232,255,.12)"); gr.addColorStop(1, "rgba(91,232,255,0)");
  g2.fillStyle = gr; g2.fillRect(0, 0, 256, 256);
  var texHalo = new THREE.CanvasTexture(c);
  var fondHalo = new THREE.Sprite(lumiere(new THREE.SpriteMaterial({ map: texHalo, opacity: 0.8 })));
  fondHalo.scale.set(520, 520, 1); fondHalo.position.z = -80; cigale.add(fondHalo);

  /* Le chant : anneaux qui partent des ailes */
  var anneaux = [];
  for (var i = 0; i < 8; i++) {
    var a = new THREE.Mesh(new THREE.TorusGeometry(1, 0.035, 8, 64, Math.PI * 0.9), lumiere(new THREE.MeshBasicMaterial({ color: 0xa4f4ff, opacity: 0 })));
    a.userData = { cote: i % 2 ? 1 : -1, decal: i / 8 };
    a.rotation.z = a.userData.cote > 0 ? -Math.PI * 0.45 : Math.PI * 0.55;
    cigale.add(a); anneaux.push(a);
  }

  /* Poussière néon */
  var N = 160, pos = new Float32Array(N * 3), base = [];
  for (i = 0; i < N; i++) {
    var b = [(Math.random() - 0.5) * 900, (Math.random() - 0.5) * 600, (Math.random() - 0.5) * 400 - 60];
    base.push(b); pos[i * 3] = b[0]; pos[i * 3 + 1] = b[1]; pos[i * 3 + 2] = b[2];
  }
  var geoP = new THREE.BufferGeometry(); geoP.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  var poussiere = new THREE.Points(geoP, lumiere(new THREE.PointsMaterial({ color: 0x8ff0ff, size: 2.6, opacity: 0.8 })));
  monde.add(poussiere);

  /* Pièces qui s'assemblent à l'arrivée */
  var pieces = [
    { o: tete, dep: new THREE.Vector3(0, 420, 200), rot: 2.4 },
    { o: corps, dep: new THREE.Vector3(0, -520, 260), rot: -1.6 },
    { o: aileG, dep: new THREE.Vector3(-520, 60, 160), rot: 2.8 },
    { o: aileD, dep: new THREE.Vector3(520, 60, 160), rot: -2.8 }
  ];
  pieces.forEach(function (p) { p.base = p.o.position.clone(); });

  /* ---- Interactions ---- */
  var souris = { x: 0, y: 0, tx: 0, ty: 0 }, proche = 0, toupie = 0, toupieT = -1, intro = -1;
  window.addEventListener("pointermove", function (e) {
    souris.tx = e.clientX / window.innerWidth * 2 - 1;
    souris.ty = e.clientY / window.innerHeight * 2 - 1;
    var r = toile.getBoundingClientRect();
    var dx = (e.clientX - (r.left + r.width / 2)) / r.width, dy = (e.clientY - (r.top + r.height / 2)) / r.height;
    scene.__dist = Math.sqrt(dx * dx + dy * dy);
  }, { passive: true });
  scene.addEventListener("click", function () { toupieT = performance.now(); });

  var echelle = 1;
  function taille() {
    var w = toile.clientWidth, h = toile.clientHeight;
    if (!w || !h) return;
    rendu.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    var visH = 2 * camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)), visW = visH * camera.aspect;
    echelle = Math.min(visH * 0.62 / 265, visW * 0.62 / 150);
  }
  taille(); window.addEventListener("resize", taille);

  var actif = true;
  new IntersectionObserver(function (e) { actif = e[0].isIntersecting; }).observe(toile);
  var horloge = new THREE.Clock();

  (function rendre() {
    requestAnimationFrame(rendre);
    if (!actif) return;
    var t = horloge.getElapsedTime(), now = performance.now();
    if (intro < 0 && !doc.classList.contains("avec-chargeur")) intro = now + 150;

    souris.x = lerp(souris.x, souris.tx, 0.06); souris.y = lerp(souris.y, souris.ty, 0.06);
    proche = lerp(proche, scene.__dist !== undefined && scene.__dist < 0.45 ? 1 - scene.__dist / 0.45 : 0, 0.07);

    pieces.forEach(function (p, k) {
      var e = intro < 0 ? 0 : ease(Math.min(1, Math.max(0, (now - intro - k * 120) / 1500)));
      p.o.position.set(lerp(p.dep.x, p.base.x, e), lerp(p.dep.y, p.base.y, e), lerp(p.dep.z, p.base.z, e));
      p.o.rotation.z = (1 - e) * p.rot;
      p.o.__e = e;
    });

    // Battement d'ailes : rafales comme une vraie cigale, plus fort quand la souris approche
    var cycle = (t * (1 + proche * 1.6)) % 1.6, rafale = cycle < 0.7 ? Math.abs(Math.sin(cycle * Math.PI * 9)) : 0;
    var ouverture = 0.12 + proche * 0.35 + rafale * (0.35 + proche * 0.25);
    aileG.rotation.y = -ouverture * aileG.__e;
    aileD.rotation.y = ouverture * aileD.__e;
    aileG.rotation.x = aileD.rotation.x = Math.sin(t * 2) * 0.05;

    anneaux.forEach(function (a) {
      var k = ((t * 0.9 + a.userData.decal) % 1);
      var force = intro < 0 ? 0 : 0.35 + proche * 0.65;
      a.position.set(a.userData.cote * (70 + k * 120), -10 + Math.sin(k * 3) * 6, -10);
      a.scale.setScalar(16 + k * 70);
      a.material.opacity = (1 - k) * 0.75 * force * (rafale > 0 || proche > 0.2 ? 1 : 0.4);
    });

    var arr = geoP.attributes.position.array;
    for (var n = 0; n < N; n++) {
      arr[n * 3] = base[n][0] + Math.sin(t * 0.3 + n) * 14 - souris.x * 30 * (base[n][2] + 300) / 300;
      arr[n * 3 + 1] = base[n][1] + ((t * 12 + n * 37) % 600) - 300 + souris.y * 20;
    }
    geoP.attributes.position.needsUpdate = true;

    if (toupieT > 0) { var kt = Math.min(1, (now - toupieT) / 1300); toupie = ease(kt) * Math.PI * 2; if (kt >= 1) { toupieT = -1; toupie = 0; } }
    var defile = Math.min(1.4, window.scrollY / window.innerHeight);
    cigale.scale.setScalar(echelle * (1 + proche * 0.06) * (1 - defile * 0.3));
    cigale.position.y = Math.sin(t * 1.1) * 8 + defile * 160;
    cigale.rotation.y = souris.x * 0.6 + Math.sin(t * 0.4) * 0.22 + toupie + defile * 1.4;
    cigale.rotation.x = souris.y * 0.32 + defile * 0.5;
    cigale.rotation.z = -souris.x * 0.08 + Math.sin(t * 0.7) * 0.03;
    matCoeur.emissiveIntensity = 0.7 + rafale * 0.2 + proche * 0.25;
    cyan.position.x = -300 + souris.x * 200;
    toile.style.opacity = String(Math.max(0, 1 - defile * 0.9));
    rendu.render(monde, camera);
  })();
  scene.classList.add("en-3d");
})();
