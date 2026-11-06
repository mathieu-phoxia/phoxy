/* Phoxy : scènes d'artistes interactives, portrait, réseau de partenaires, communauté. Sans dépendance. */
(function () {
  "use strict";
  var calme = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var NS = "http://www.w3.org/2000/svg";

  function el(nom, attrs, parent) {
    var n = document.createElementNS(NS, nom);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }

  /* ---- Pads MPC et clavier, générés pour garder le HTML lisible ---- */
  document.querySelectorAll(".pads-mpc").forEach(function (g) {
    var couleurs = ["#5be8ff", "#ff4f8b", "#8b5cf6", "#2ee86a"];
    for (var l = 0; l < 4; l++) for (var c = 0; c < 4; c++) {
      var i = l * 4 + c;
      var r = el("rect", { x: 186 + c * 25.5, y: 120 + l * 18.5, width: 20, height: 14, rx: 3, "class": "pad-mpc" }, g);
      r.style.setProperty("--i", ((i * 7) % 16).toString());
      r.style.setProperty("--pc", couleurs[(l + c) % 4]);
    }
  });
  document.querySelectorAll(".clavier").forEach(function (g) {
    for (var k = 1; k < 16; k++) el("path", { d: "M" + (56 + k * 13) + " 156 v38", "class": "trait trait--fin" }, g);
    [1, 2, 4, 5, 6, 8, 9, 11, 12, 13].forEach(function (k) {
      el("rect", { x: 56 + k * 13 - 4, y: 156, width: 8, height: 22, rx: 1.5, "class": "touche-noire" }, g);
    });
    [0, 3, 5, 9, 12].forEach(function (k, n) {
      var t = el("rect", { x: 56 + k * 13 + 1.5, y: 179, width: 10, height: 13, rx: 2, "class": "touche-jouee" }, g);
      t.style.setProperty("--i", n.toString());
    });
  });

  /* ---- Scènes qui suivent la souris ---- */
  var fin = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  document.querySelectorAll("[data-scene]").forEach(function (scene) {
    var couches = scene.querySelectorAll("[data-prof]");
    var vises = scene.querySelectorAll("[data-vise]");
    var cible = { x: 0, y: 0 }, pos = { x: 0, y: 0 }, actif = false, raf = 0;
    function boucle() {
      pos.x += (cible.x - pos.x) * 0.12;
      pos.y += (cible.y - pos.y) * 0.12;
      couches.forEach(function (c) {
        var p = parseFloat(c.getAttribute("data-prof")) || 0;
        c.setAttribute("transform", "translate(" + (pos.x * p).toFixed(2) + " " + (pos.y * p * 0.6).toFixed(2) + ")");
      });
      vises.forEach(function (v) { v.setAttribute("transform", "rotate(" + (-pos.x * 22).toFixed(2) + " 160 0)"); });
      scene.style.setProperty("--rx", (pos.y * -5).toFixed(2) + "deg");
      scene.style.setProperty("--ry", (pos.x * 7).toFixed(2) + "deg");
      if (actif || Math.abs(cible.x - pos.x) > 0.002 || Math.abs(cible.y - pos.y) > 0.002) raf = requestAnimationFrame(boucle);
      else raf = 0;
    }
    function lancer() { if (!raf) raf = requestAnimationFrame(boucle); }
    scene.addEventListener("pointermove", function (e) {
      var r = scene.getBoundingClientRect();
      cible.x = (e.clientX - r.left) / r.width * 2 - 1;
      cible.y = (e.clientY - r.top) / r.height * 2 - 1;
      scene.style.setProperty("--x", ((e.clientX - r.left) / r.width * 100).toFixed(1) + "%");
      scene.style.setProperty("--y", ((e.clientY - r.top) / r.height * 100).toFixed(1) + "%");
      actif = true; lancer();
    });
    scene.addEventListener("pointerleave", function () { cible.x = 0; cible.y = 0; actif = false; lancer(); });
    if (!fin) scene.addEventListener("click", function () { scene.classList.toggle("est-actif"); });
  });

  /* ---- Portrait du fondateur : inclinaison 3D ---- */
  document.querySelectorAll("[data-portrait]").forEach(function (p) {
    if (!fin || calme) return;
    p.addEventListener("pointermove", function (e) {
      var r = p.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      p.style.setProperty("--rx", (-y * 10).toFixed(2) + "deg");
      p.style.setProperty("--ry", (x * 12).toFixed(2) + "deg");
      p.style.setProperty("--x", ((x + 0.5) * 100).toFixed(1) + "%");
      p.style.setProperty("--y", ((y + 0.5) * 100).toFixed(1) + "%");
    });
    p.addEventListener("pointerleave", function () { p.style.setProperty("--rx", "0deg"); p.style.setProperty("--ry", "0deg"); });
  });

  /* ---- Tuiles : lueur sous le curseur ---- */
  document.querySelectorAll("[data-lueur]").forEach(function (t) {
    t.addEventListener("pointermove", function (e) {
      var r = t.getBoundingClientRect();
      t.style.setProperty("--x", (e.clientX - r.left).toFixed(0) + "px");
      t.style.setProperty("--y", (e.clientY - r.top).toFixed(0) + "px");
    });
  });

  /* ---- Réseau de partenaires (canvas) ---- */
  document.querySelectorAll("[data-reseau]").forEach(function (cv) {
    var ctx = cv.getContext("2d");
    var noeuds = [
      { nom: "PHOXY", fixe: true, rx: 0.5, ry: 0.5, taille: 30, principal: true },
      { nom: "Horizon Records", rx: 0.8, ry: 0.26, taille: 18, partenaire: true },
      { nom: "Votre label ?", rx: 0.18, ry: 0.22, taille: 11 },
      { nom: "Studios", rx: 0.16, ry: 0.7, taille: 11 },
      { nom: "Salles", rx: 0.5, ry: 0.8, taille: 11 },
      { nom: "Festivals", rx: 0.84, ry: 0.72, taille: 11 },
      { nom: "Artistes", rx: 0.32, ry: 0.42, taille: 13 },
      { nom: "DJs", rx: 0.68, ry: 0.52, taille: 12 },
      { nom: "Marques", rx: 0.88, ry: 0.5, taille: 10 },
      { nom: "Collectifs", rx: 0.44, ry: 0.14, taille: 10 }
    ];
    var liens = [[0,1],[0,2],[0,3],[0,4],[0,5],[0,6],[0,7],[0,8],[0,9],[1,7],[1,5],[6,3],[6,2],[7,4],[9,2],[8,5]];
    var logo = new Image(); logo.src = "assets/img/marque/phoxy-mark-neon.png";
    var L = 0, H = 0, dpr = 1, souris = { x: -999, y: -999 }, t0 = performance.now(), visible = false, raf = 0;
    function taille() {
      var r = cv.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      L = r.width; H = r.height;
      cv.width = L * dpr; cv.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      noeuds.forEach(function (n) { n.bx = n.rx * L; n.by = n.ry * H; if (n.x === undefined) { n.x = n.bx; n.y = n.by; } });
    }
    function dessin(t) {
      var s = (t - t0) / 1000;
      ctx.clearRect(0, 0, L, H);
      noeuds.forEach(function (n, i) {
        var cx = n.bx + Math.sin(s * 0.6 + i) * 6, cy = n.by + Math.cos(s * 0.5 + i * 1.7) * 6;
        if (!n.fixe) {
          var dx = souris.x - cx, dy = souris.y - cy, d = Math.sqrt(dx * dx + dy * dy);
          if (d < 160) { var f = (1 - d / 160) * 34; cx += dx / (d || 1) * f; cy += dy / (d || 1) * f; }
        }
        n.x += (cx - n.x) * 0.08; n.y += (cy - n.y) * 0.08;
      });
      liens.forEach(function (l, k) {
        var a = noeuds[l[0]], b = noeuds[l[1]];
        var vif = a.partenaire || b.partenaire;
        ctx.strokeStyle = vif ? "rgba(91,232,255,.55)" : "rgba(91,232,255,.18)";
        ctx.lineWidth = vif ? 1.6 : 1;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        var p = ((s * (vif ? 0.45 : 0.28)) + k * 0.37) % 1;
        var px = a.x + (b.x - a.x) * p, py = a.y + (b.y - a.y) * p;
        ctx.fillStyle = vif ? "#a4f4ff" : "rgba(164,244,255,.7)";
        ctx.shadowColor = "#5be8ff"; ctx.shadowBlur = 10;
        ctx.beginPath(); ctx.arc(px, py, vif ? 2.6 : 1.8, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
      });
      noeuds.forEach(function (n) {
        var proche = Math.hypot(souris.x - n.x, souris.y - n.y) < n.taille + 30;
        ctx.beginPath(); ctx.arc(n.x, n.y, n.taille + (proche ? 4 : 0), 0, Math.PI * 2);
        ctx.fillStyle = n.principal ? "rgba(6,12,20,.95)" : (n.partenaire ? "rgba(91,232,255,.16)" : "rgba(13,30,43,.95)");
        ctx.fill();
        ctx.strokeStyle = n.principal || n.partenaire || proche ? "#5be8ff" : "rgba(91,232,255,.35)";
        ctx.lineWidth = n.principal ? 2 : 1.2;
        ctx.shadowColor = "#5be8ff"; ctx.shadowBlur = n.principal || n.partenaire || proche ? 16 : 0;
        ctx.stroke(); ctx.shadowBlur = 0;
        if (n.principal) {
          if (logo.complete && logo.naturalWidth) { var h = n.taille * 1.3, w = h * 204 / 292; ctx.drawImage(logo, n.x - w / 2, n.y - h / 2, w, h); }
          var pulse = (s % 1.94) / 1.94;
          ctx.strokeStyle = "rgba(91,232,255," + (0.5 * (1 - pulse)).toFixed(3) + ")";
          ctx.beginPath(); ctx.arc(n.x, n.y, n.taille + pulse * 40, 0, Math.PI * 2); ctx.stroke();
        }
        ctx.font = (n.partenaire ? "600 13px " : "500 11px ") + "Inter, system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.fillStyle = n.partenaire ? "#eaf6fb" : (proche ? "#a4f4ff" : "#a9c3cf");
        if (!n.principal) ctx.fillText(n.nom, n.x, n.y + n.taille + 16);
      });
    }
    function boucle(t) { dessin(t); raf = visible && !calme ? requestAnimationFrame(boucle) : 0; }
    taille();
    window.addEventListener("resize", function () { taille(); if (calme) dessin(performance.now()); });
    cv.addEventListener("pointermove", function (e) { var r = cv.getBoundingClientRect(); souris.x = e.clientX - r.left; souris.y = e.clientY - r.top; });
    cv.addEventListener("pointerleave", function () { souris.x = -999; souris.y = -999; });
    logo.onload = function () { if (calme) dessin(performance.now()); };
    new IntersectionObserver(function (es) {
      visible = es[0].isIntersecting;
      if (calme) { dessin(performance.now()); return; }
      if (visible && !raf) raf = requestAnimationFrame(boucle);
    }).observe(cv);
  });

  /* ---- Communauté : opportunités selon le profil ---- */
  var profils = {
    dj: { titre: "En tant que DJ, la communauté vous ouvre :", liste: ["Des dates dans les événements Phoxy", "Les programmateurs du réseau à Marseille et ailleurs", "Des collabs et des edits avec les artistes du label", "La promotion de vos sets enregistrés"] },
    chant: { titre: "En tant que chanteur ou chanteuse, la communauté vous ouvre :", liste: ["Un retour argumenté sur vos maquettes", "Des mises en relation avec des beatmakers et producteurs", "Un accompagnement artistique jusqu'à la sortie", "Des scènes et premières parties"] },
    rap: { titre: "En tant que rappeur ou rappeuse, la communauté vous ouvre :", liste: ["Des prods et des beatmakers du réseau", "Des premières parties et des open mics", "La promotion auprès des médias, playlists et DJs", "Des collabs avec les artistes du label"] },
    prod: { titre: "En tant que producteur ou beatmaker, la communauté vous ouvre :", liste: ["Des interprètes pour poser sur vos prods", "Des remixes et des edits pour les artistes du label", "Du mastering quand le titre en a besoin", "La sortie sur les plateformes avec Phoxy"] },
    musicien: { titre: "En tant que musicien ou groupe, la communauté vous ouvre :", liste: ["Des dates et des salles du réseau", "Des sessions et des collabs avec d'autres artistes", "Un accompagnement sur vos sorties", "Des partenaires labels comme Horizon Records"] }
  };
  var puces = document.querySelector("[data-profils]");
  if (puces) {
    var titre = document.querySelector("[data-profil-titre]"), liste = document.querySelector("[data-profil-liste]"), lien = document.querySelector("[data-profil-lien]");
    function choisir(cle) {
      var p = profils[cle]; if (!p) return;
      puces.querySelectorAll("[data-profil]").forEach(function (b) { b.setAttribute("aria-selected", b.getAttribute("data-profil") === cle ? "true" : "false"); });
      titre.textContent = p.titre;
      liste.innerHTML = "";
      p.liste.forEach(function (txt, i) {
        var li = document.createElement("li");
        li.textContent = txt; li.style.setProperty("--i", i);
        liste.appendChild(li);
      });
      lien.setAttribute("href", "contact.html?sujet=communaute&profil=" + cle + "#formulaire");
    }
    puces.addEventListener("click", function (e) { var b = e.target.closest("[data-profil]"); if (b) choisir(b.getAttribute("data-profil")); });
    puces.addEventListener("keydown", function (e) {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      var bs = Array.prototype.slice.call(puces.querySelectorAll("[data-profil]"));
      var i = bs.indexOf(document.activeElement); if (i < 0) return;
      var n = bs[(i + (e.key === "ArrowRight" ? 1 : bs.length - 1)) % bs.length];
      n.focus(); choisir(n.getAttribute("data-profil"));
    });
    choisir("dj");
  }

  /* ---- Page contact : présélection du sujet et du profil depuis l'URL ---- */
  var params = new URLSearchParams(location.search);
  var sujet = document.getElementById("sujet"), profil = document.getElementById("profil");
  var sujets = { maquette: "Envoyer une maquette", communaute: "Rejoindre la communauté Phoxy", collab: "Proposition de collaboration ou de partenariat" };
  if (sujet && sujets[params.get("sujet")]) sujet.value = sujets[params.get("sujet")];
  if (profil && params.get("profil")) {
    var opt = profil.querySelector('option[value="' + params.get("profil") + '"]');
    if (opt) profil.value = params.get("profil");
  }
})();
