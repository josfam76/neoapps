/* Shared chrome, helpers, and lightbox. */
(function () {
  "use strict";

  // Days after a release that the "NEW" badge stays visible. Change this one number.
  var NEW_BADGE_DAYS = 7;

  var SITE_CACHE = null;
  var APPS_CACHE = null;

  function loadJSON(url) {
    return fetch(url, { cache: "no-store" }).then(function (res) {
      if (!res.ok) throw new Error("Failed to load " + url + " (" + res.status + ")");
      return res.json();
    });
  }

  function loadSite() {
    if (SITE_CACHE) return Promise.resolve(SITE_CACHE);
    return loadJSON("data/site.json").then(function (data) {
      SITE_CACHE = data;
      return data;
    });
  }

  function loadApps() {
    if (APPS_CACHE) return Promise.resolve(APPS_CACHE);
    return loadJSON("data/apps.json").then(function (data) {
      APPS_CACHE = data.apps || data;
      return APPS_CACHE;
    });
  }

  function findApp(apps, id) {
    for (var i = 0; i < apps.length; i++) {
      if (apps[i].id === id) return apps[i];
    }
    return null;
  }

  function isLocalPreview() {
    var h = location.hostname;
    return h === "localhost" || h === "127.0.0.1" || h === "[::1]" || h === "::1";
  }

  function downloadUrl(app, site, item) {
    if (!app || app.comingSoon) return null;
    var filename = app.filename;
    var direct = app.download;
    if (item) {
      if (typeof item === "string") {
        filename = item;
        direct = null;
      } else {
        filename = item.filename || filename;
        direct = item.download || null;
      }
    }
    if (!direct && !filename) return null;
    if (isLocalPreview() && filename) {
      return "release-assets/" + filename;
    }
    var owner = (site && site.githubOwner) || "OWNER";
    if (direct) return String(direct).split("OWNER").join(owner);
    var repo = (site && site.githubRepo) || "neoapps";
    var version = (item && item.version) || app.version;
    return "https://github.com/" + owner + "/" + repo + "/releases/download/" +
      app.id + "-" + version + "/" + filename;
  }

  function formatSize(bytes) {
    if (!bytes || bytes <= 0) return "";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + " KB";
    var mb = bytes / (1024 * 1024);
    var rounded = mb >= 10 ? mb.toFixed(1) : mb.toFixed(2);
    return rounded.replace(/\.?0+$/, "") + " MB";
  }

  function formatDate(iso) {
    if (!iso) return "";
    var parts = String(iso).split("-");
    if (parts.length < 3) return iso;
    var months = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    var y = parts[0], m = parseInt(parts[1], 10), d = parseInt(parts[2], 10);
    if (!m || m < 1 || m > 12) return iso;
    return d + " " + months[m - 1] + " " + y;
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function inlineCode(str) {
    return escapeHtml(str).replace(/`([^`]+)`/g, "<code>$1</code>");
  }

  function latestChangelog(app) {
    var log = (app && app.changelog) || [];
    return log.length ? log[0] : null;
  }

  function parseISODate(iso) {
    var parts = String(iso || "").split("-");
    if (parts.length < 3) return null;
    var y = parseInt(parts[0], 10), m = parseInt(parts[1], 10), d = parseInt(parts[2], 10);
    if (!y || !m || !d) return null;
    var date = new Date(y, m - 1, d);
    if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null;
    return date;
  }

  function releaseDate(app) {
    var latest = latestChangelog(app);
    var iso = ((latest && latest.date) || (app && app.date) || "").toString().trim();
    return iso;
  }

  function nowDate() {
    if (typeof window !== "undefined" && window.__NEOAPPS_TODAY) {
      var forced = parseISODate(window.__NEOAPPS_TODAY);
      if (forced) return forced;
    }
    return new Date();
  }

  // True when the latest changelog/release date is within NEW_BADGE_DAYS of today.
  // Apps with no date never get a badge. Future dates are ignored.
  function isNewRelease(app, now) {
    var released = parseISODate(releaseDate(app));
    if (!released) return false;
    now = now || nowDate();
    var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var days = Math.round((today - released) / 86400000);
    return days >= 0 && days <= NEW_BADGE_DAYS;
  }

  function badgesHtml(app) {
    var html = "";
    if (isNewRelease(app)) {
      html += '<span class="badge badge-new" title="Released within the last ' +
        NEW_BADGE_DAYS + ' days">NEW</span>';
    }
    if (app.version) html += '<span class="badge badge-version">' + escapeHtml(app.version) + "</span>";
    if (app.prerelease) html += '<span class="badge badge-pre">Pre-release</span>';
    if (app.comingSoon) html += '<span class="badge badge-soon">Coming soon</span>';
    return html;
  }

  // Home-page cards are sorted newest-first by release date at render time.
  // Apps with no date go last. Ties keep the order in apps.json.
  function sortAppsByReleaseDate(apps) {
    return (apps || []).map(function (app, index) {
      return { app: app, index: index };
    }).sort(function (a, b) {
      var da = parseISODate(releaseDate(a.app));
      var db = parseISODate(releaseDate(b.app));
      var ta = da ? da.getTime() : 0;
      var tb = db ? db.getTime() : 0;
      if (ta !== tb) return tb - ta;
      return a.index - b.index;
    }).map(function (item) {
      return item.app;
    });
  }

  function shortReqs(app) {
    var bits = ["Windows x64"];
    var reqs = app.requirements || [];
    var hasNet8 = false, hasNoNet = false;
    for (var i = 0; i < reqs.length; i++) {
      if (/\.NET 8/i.test(reqs[i])) hasNet8 = true;
      if (/no \.NET|self-contained/i.test(reqs[i])) hasNoNet = true;
    }
    if (hasNoNet) bits.push("No .NET install");
    else if (hasNet8) bits.push(".NET 8");
    var size = formatSize(app.sizeBytes);
    if (size) bits.push(size);
    if (app.prerelease) bits.push("Pre-release");
    return bits.join(" · ");
  }

  function brandSvg() {
    return (
      '<svg class="brand-mark" viewBox="0 0 32 32" aria-hidden="true">' +
        '<defs><linearGradient id="brandG" x1="0" y1="0" x2="1" y2="1">' +
          '<stop offset="0" stop-color="#00D4FF"/>' +
          '<stop offset="0.55" stop-color="#7A5CFF"/>' +
          '<stop offset="1" stop-color="#FF40A0"/>' +
        '</linearGradient></defs>' +
        '<rect width="32" height="32" rx="8" fill="#0B0D1A"/>' +
        '<rect x="1" y="1" width="30" height="30" rx="7" fill="none" stroke="url(#brandG)" stroke-width="1.5"/>' +
        '<path fill="url(#brandG)" d="M9.2 8h3.3l5.3 9.2V8H21V24h-3.3L12.4 14.8V24H9.2V8z"/>' +
      "</svg>"
    );
  }

  function currentNavId() {
    var file = (location.pathname.split("/").pop() || "index.html");
    if (file === "" || file === "/") file = "index.html";
    if (file === "app.html") return "apps";
    var hash = (location.hash || "").replace("#", "");
    if (hash) return hash;
    return "apps";
  }

  function renderHeader(site) {
    var host = document.getElementById("site-header");
    if (!host) return;
    var nav = site.nav || [];
    var active = currentNavId();
    var links = nav.map(function (item) {
      var isActive = item.id === active;
      return (
        '<li><a href="' + escapeHtml(item.href) + '"' +
        (isActive ? ' class="is-active" aria-current="page"' : "") +
        ">" + escapeHtml(item.label) + "</a></li>"
      );
    }).join("");

    host.className = "site-header";
    host.innerHTML =
      '<div class="wrap nav-inner">' +
        '<a class="brand" href="index.html">' + brandSvg() +
          '<span class="brand-name">' + escapeHtml(site.name || "NeoApps") + "</span></a>" +
        '<button type="button" class="nav-toggle" aria-label="Open menu" aria-expanded="false" aria-controls="site-nav">' +
          '<span class="nav-toggle-bars"></span></button>' +
        '<ul class="nav-links" id="site-nav">' + links + "</ul>" +
      "</div>";

    var toggle = host.querySelector(".nav-toggle");
    var panel = host.querySelector(".nav-links");

    function setOpen(open) {
      host.classList.toggle("is-open", open);
      document.body.classList.toggle("nav-open", open);
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    }

    toggle.addEventListener("click", function () {
      setOpen(!host.classList.contains("is-open"));
    });

    panel.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () { setOpen(false); });
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && host.classList.contains("is-open")) setOpen(false);
    });

    window.addEventListener("resize", function () {
      if (window.innerWidth >= 700) setOpen(false);
    });
  }

  function renderFooter(site) {
    var host = document.getElementById("site-footer");
    if (!host) return;
    host.className = "site-footer";
    host.innerHTML =
      '<div class="wrap">' +
        "<p>" + escapeHtml(site.copyright || "© 2026 Josef Familonidis") + "</p>" +
        "<p>This page is unlisted — only people with the link can find it.</p>" +
      "</div>" +
      '<p class="footer-built">Built on the xAI platform by very hard-working Grok Bots 🤖</p>';
  }

  function initLightbox() {
    var box = document.getElementById("lightbox");
    if (!box) return;
    var img = box.querySelector("img");
    var closeBtn = box.querySelector(".lightbox-close");
    var lastFocus = null;

    function close() {
      box.hidden = true;
      document.body.classList.remove("lightbox-open");
      img.removeAttribute("src");
      img.removeAttribute("alt");
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    function open(src, alt) {
      lastFocus = document.activeElement;
      img.src = src;
      img.alt = alt || "";
      box.hidden = false;
      document.body.classList.add("lightbox-open");
      closeBtn.focus();
    }

    box.addEventListener("click", function (e) {
      if (e.target === box || e.target === closeBtn) close();
    });

    closeBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      close();
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !box.hidden) close();
    });

    document.addEventListener("click", function (e) {
      var t = e.target.closest("[data-lightbox]");
      if (!t) return;
      e.preventDefault();
      open(t.getAttribute("data-full") || t.src, t.alt);
    });

    var startY = 0;
    box.addEventListener("touchstart", function (e) {
      if (e.changedTouches[0]) startY = e.changedTouches[0].clientY;
    }, { passive: true });
    box.addEventListener("touchend", function (e) {
      if (!e.changedTouches[0]) return;
      var dy = e.changedTouches[0].clientY - startY;
      if (Math.abs(dy) > 80 && e.target !== closeBtn) close();
    }, { passive: true });
  }

  function bootChrome() {
    return loadSite().then(function (site) {
      renderHeader(site);
      renderFooter(site);
      var sub = document.getElementById("hero-sub");
      if (sub) sub.textContent = site.description || site.tagline || "";
      document.title = document.body.getAttribute("data-title") || site.name || "NeoApps";
      return site;
    });
  }

  window.NeoApps = {
    loadSite: loadSite,
    loadApps: loadApps,
    findApp: findApp,
    isLocalPreview: isLocalPreview,
    downloadUrl: downloadUrl,
    formatSize: formatSize,
    formatDate: formatDate,
    escapeHtml: escapeHtml,
    inlineCode: inlineCode,
    latestChangelog: latestChangelog,
    isNewRelease: isNewRelease,
    badgesHtml: badgesHtml,
    sortAppsByReleaseDate: sortAppsByReleaseDate,
    NEW_BADGE_DAYS: NEW_BADGE_DAYS,
    shortReqs: shortReqs,
    bootChrome: bootChrome,
    initLightbox: initLightbox
  };

  document.addEventListener("DOMContentLoaded", function () {
    bootChrome().catch(function (err) {
      console.error(err);
    });
    initLightbox();
  });
})();
