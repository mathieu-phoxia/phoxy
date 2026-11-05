/* Phoxy : menu mobile, apparitions au scroll, formulaire de contact. Sans dépendance. */
(function () {
  "use strict";

  /* Menu mobile */
  var bouton = document.querySelector("[data-bascule-menu]");
  var menu = document.querySelector("[data-menu-mobile]");
  if (bouton && menu) {
    bouton.addEventListener("click", function () {
      var ouvert = menu.getAttribute("data-ouvert") === "true";
      menu.setAttribute("data-ouvert", String(!ouvert));
      bouton.setAttribute("aria-expanded", String(!ouvert));
      document.body.style.overflow = ouvert ? "" : "hidden";
    });
    menu.querySelectorAll("a").forEach(function (lien) {
      lien.addEventListener("click", function () {
        menu.setAttribute("data-ouvert", "false");
        bouton.setAttribute("aria-expanded", "false");
        document.body.style.overflow = "";
      });
    });
  }

  /* Apparitions au scroll */
  var elements = document.querySelectorAll("[data-apparait]");
  if (elements.length) {
    if ("IntersectionObserver" in window) {
      var observateur = new IntersectionObserver(
        function (entrees) {
          entrees.forEach(function (entree) {
            if (entree.isIntersecting) {
              entree.target.setAttribute("data-visible", "true");
              observateur.unobserve(entree.target);
            }
          });
        },
        { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
      );
      elements.forEach(function (el) { observateur.observe(el); });
    } else {
      elements.forEach(function (el) { el.setAttribute("data-visible", "true"); });
    }
  }

  /* Catalogue : le lecteur SoundCloud ne se charge qu'au clic, un seul à la fois */
  var sorties = document.querySelectorAll("[data-sc-id]");
  function fermerLecteur(sortie) {
    var lecteur = sortie.querySelector("[data-sc-lecteur]");
    lecteur.innerHTML = "";
    lecteur.hidden = true;
    sortie.querySelector("[data-sc-ecouter]").textContent = "Écouter ici";
  }
  sorties.forEach(function (sortie) {
    sortie.querySelector("[data-sc-ecouter]").addEventListener("click", function () {
      var lecteur = sortie.querySelector("[data-sc-lecteur]");
      var ouvert = !lecteur.hidden;
      sorties.forEach(fermerLecteur);
      if (ouvert) return;
      var cadre = document.createElement("iframe");
      cadre.title = "Lecteur SoundCloud : " + sortie.getAttribute("data-sc-titre");
      cadre.allow = "autoplay; encrypted-media";
      cadre.src = "https://w.soundcloud.com/player/?url=" +
        encodeURIComponent("https://api.soundcloud.com/tracks/" + sortie.getAttribute("data-sc-id")) +
        "&color=%235be8ff&auto_play=true&hide_related=true&show_comments=false&show_reposts=false&show_teaser=false";
      lecteur.appendChild(cadre);
      lecteur.hidden = false;
      this.textContent = "Fermer le lecteur";
    });
  });

  /* Lieux : scènes qui suivent la souris */
  var calme = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.querySelectorAll("[data-lieu]").forEach(function (lieu) {
    var couches = lieu.querySelectorAll("[data-profondeur]");
    var onde = lieu.querySelector("[data-onde]");
    var base = onde ? parseFloat(onde.getAttribute("data-onde")) : 0;
    var e = { x: 0, y: 0, cx: 0, cy: 0, px: 200, a: 0, actif: false, visible: false, boucle: false, t: 0 };

    function dessinerOnde() {
      if (!onde) return;
      var d = "";
      for (var x = -30; x <= 430; x += 6) {
        var proche = Math.exp(-Math.pow(x - e.px, 2) / 5000);
        var amp = 2.5 + e.a * 18 * proche;
        var y = base + Math.sin(x * 0.07 + e.t * 3) * amp + Math.sin(x * 0.19 - e.t * 5) * amp * 0.35;
        d += (x === -30 ? "M" : " L") + x + " " + y.toFixed(1);
      }
      onde.setAttribute("d", d);
    }

    function image() {
      e.t += 0.016;
      e.cx += (e.x - e.cx) * 0.08;
      e.cy += (e.y - e.cy) * 0.08;
      e.a += ((e.actif ? 1 : 0) - e.a) * 0.06;
      couches.forEach(function (c) {
        var p = parseFloat(c.getAttribute("data-profondeur"));
        c.style.transform = "translate(" + (-e.cx * p).toFixed(2) + "px," + (-e.cy * p * 0.6).toFixed(2) + "px)";
      });
      lieu.style.transform = "perspective(1100px) rotateX(" + (-e.cy * 3).toFixed(2) + "deg) rotateY(" + (e.cx * 4).toFixed(2) + "deg)";
      dessinerOnde();
      var repos = !e.actif && Math.abs(e.cx) < 0.002 && Math.abs(e.cy) < 0.002 && e.a < 0.01;
      if (e.visible && !(repos && document.hidden)) requestAnimationFrame(image);
      else e.boucle = false;
    }
    function demarrer() {
      if (calme || e.boucle) return;
      e.boucle = true;
      requestAnimationFrame(image);
    }

    dessinerOnde();
    if (calme) return;

    lieu.addEventListener("pointermove", function (ev) {
      var r = lieu.getBoundingClientRect();
      var nx = Math.min(Math.max((ev.clientX - r.left) / r.width, 0), 1);
      var ny = Math.min(Math.max((ev.clientY - r.top) / r.height, 0), 1);
      e.x = nx * 2 - 1;
      e.y = ny * 2 - 1;
      e.px = nx * 400;
      e.actif = true;
      lieu.style.setProperty("--x", (nx * 100).toFixed(1) + "%");
      lieu.style.setProperty("--y", (ny * 100).toFixed(1) + "%");
      demarrer();
    });
    lieu.addEventListener("pointerleave", function () { e.actif = false; e.x = 0; e.y = 0; });
    lieu.addEventListener("pointercancel", function () { e.actif = false; e.x = 0; e.y = 0; });

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entrees) {
        e.visible = entrees[0].isIntersecting;
        if (e.visible) demarrer();
      }).observe(lieu);
    } else {
      e.visible = true;
      demarrer();
    }
  });

  /* Année courante dans le pied de page */
  document.querySelectorAll("[data-annee]").forEach(function (el) {
    el.textContent = String(new Date().getFullYear());
  });

  /* Formulaire de contact : AJAX vers Formspree, repli mailto si l'endpoint n'est pas configuré */
  var formulaire = document.querySelector("[data-formulaire]");
  if (formulaire) {
    var etat = formulaire.querySelector("[data-etat]");
    var action = formulaire.getAttribute("action") || "";
    var configure = action.indexOf("REMPLACER_") === -1 && action.indexOf("formspree.io") !== -1;

    formulaire.addEventListener("submit", function (evenement) {
      if (formulaire.querySelector(".piege input") && formulaire.querySelector(".piege input").value) {
        evenement.preventDefault();
        return;
      }

      if (!configure) {
        evenement.preventDefault();
        var donnees = new FormData(formulaire);
        var sujet = encodeURIComponent("Nouveau contact via phoxy : " + (donnees.get("nom") || ""));
        var corps = encodeURIComponent(
          "Nom : " + (donnees.get("nom") || "") + "\n" +
          "Email : " + (donnees.get("email") || "") + "\n" +
          "Sujet : " + (donnees.get("sujet") || "") + "\n\n" +
          (donnees.get("message") || "")
        );
        window.location.href = "mailto:phoxy.music13@gmail.com?subject=" + sujet + "&body=" + corps;
        afficherEtat("ok", "Votre messagerie va s'ouvrir avec le message pré-rempli : il ne reste qu'à l'envoyer.");
        return;
      }

      evenement.preventDefault();
      var corpsAjax = new FormData(formulaire);
      afficherEtat(null, "Envoi en cours…");

      fetch(action, {
        method: "POST",
        body: corpsAjax,
        headers: { Accept: "application/json" },
      })
        .then(function (reponse) {
          if (reponse.ok) {
            afficherEtat("ok", "Message envoyé. Réponse sous 10 jours ouvrés.");
            formulaire.reset();
          } else {
            afficherEtat("erreur", "L'envoi a échoué. Réessayez ou écrivez directement à phoxy.music13@gmail.com.");
          }
        })
        .catch(function () {
          afficherEtat("erreur", "L'envoi a échoué. Réessayez ou écrivez directement à phoxy.music13@gmail.com.");
        });
    });

    function afficherEtat(type, texte) {
      if (!etat) return;
      etat.textContent = texte;
      etat.setAttribute("data-visible", "true");
      etat.classList.remove("formulaire__etat--ok", "formulaire__etat--erreur");
      if (type === "ok") etat.classList.add("formulaire__etat--ok");
      if (type === "erreur") etat.classList.add("formulaire__etat--erreur");
    }
  }
})();
