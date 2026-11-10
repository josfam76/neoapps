(function () {
  "use strict";

  function param(name) {
    var q = new URLSearchParams(location.search);
    return q.get(name);
  }

  function shotHtml(app) {
    var N = window.NeoApps;
    if (app.screenshot && !app.placeholder) {
      var capText = app.screenshotCaption || (app.mockup ? "Preview mockup" : "");
      var cap = capText ? '<p class="shot-caption">' + N.escapeHtml(capText) + "</p>" : "";
      return (
        '<div class="app-hero-shot"><img src="' + N.escapeHtml(app.screenshot) +
          '" alt="' + N.escapeHtml(app.name) + ' screenshot" data-lightbox></div>' + cap
      );
    }
    var icon = app.icon
      ? '<img src="' + N.escapeHtml(app.icon) + '" alt="" width="96" height="96">'
      : '<span class="ph-icon" aria-hidden="true"></span>';
    var label = app.comingSoon ? "Details coming soon" : (app.screenshotCaption || "Screenshot coming soon");
    return (
      '<div class="app-hero-shot"><div class="shot-placeholder">' + icon +
        "<span>" + N.escapeHtml(label) + "</span></div></div>"
    );
  }

  function list(items, cls) {
    var N = window.NeoApps;
    if (!items || !items.length) return "";
    return '<ul class="' + cls + '">' + items.map(function (item) {
      return "<li>" + N.inlineCode(item) + "</li>";
    }).join("") + "</ul>";
  }

  function changelogHtml(app) {
    var N = window.NeoApps;
    var log = app.changelog || [];
    if (!log.length) {
      return '<p class="empty-note">Release notes coming soon.</p>';
    }
    var hasAny = log.some(function (e) { return e.changes && e.changes.length; });
    if (!hasAny) {
      return '<p class="empty-note">Release notes coming soon.</p>';
    }
    return log.map(function (entry) {
      var date = N.formatDate(entry.date);
      var changes = (entry.changes && entry.changes.length)
        ? list(entry.changes, "changes-list")
        : '<p class="empty-note">Release notes coming soon.</p>';
      return (
        '<article class="changelog-entry">' +
          "<h3><span>" + N.escapeHtml(entry.version) + "</span>" +
          (date ? '<span class="changelog-date">' + N.escapeHtml(date) + "</span>" : "") +
          "</h3>" + changes +
        "</article>"
      );
    }).join("");
  }

  function render(app, site) {
    var N = window.NeoApps;
    var root = document.getElementById("app-page");
    var badges = "";
    if (app.version) badges += '<span class="badge badge-version">' + N.escapeHtml(app.version) + "</span>";
    if (app.prerelease) badges += '<span class="badge badge-pre">Pre-release</span>';
    if (app.comingSoon) badges += '<span class="badge badge-soon">Coming soon</span>';

    var href = N.downloadUrl(app, site);
    var actions = '<div class="card-actions">';
    if (href) actions += '<a class="btn btn-primary" href="' + N.escapeHtml(href) + '">Download</a>';
    actions += "</div>";
    var run = app.run ? '<p class="run-hint">' + N.escapeHtml(app.run) + "</p>" : "";
    var size = N.formatSize(app.sizeBytes);

    var features = (app.features && app.features.length)
      ? '<section class="app-block" id="features"><h2>Features</h2>' + list(app.features, "feature-list") + "</section>"
      : "";
    var reqs = (app.requirements && app.requirements.length)
      ? '<section class="app-block" id="requirements"><h2>Requirements</h2>' + list(app.requirements, "req-list") +
        (size ? '<p class="meta" style="margin-top:12px">Download size: ' + N.escapeHtml(size) + "</p>" : "") +
        "</section>"
      : "";

    var desc = app.description
      ? '<div class="prose"><p>' + N.inlineCode(app.description) + "</p></div>"
      : (app.comingSoon ? '<div class="prose"><p>Details coming soon.</p></div>' : "");

    root.innerHTML =
      '<a class="back-link" href="index.html#apps">← All apps</a>' +
      '<div class="app-hero">' +
        "<div>" + shotHtml(app) + "</div>" +
        '<div class="app-hero-info">' +
          '<div class="card-head"><h1>' + N.escapeHtml(app.name) + "</h1>" + badges + "</div>" +
          (app.tagline ? '<p class="tagline">' + N.escapeHtml(app.tagline) + "</p>" : "") +
          desc + actions + run +
        "</div>" +
      "</div>" +
      '<div class="app-blocks">' +
        features + reqs +
        '<section class="app-block" id="changelog"><h2>Release notes</h2>' + changelogHtml(app) + "</section>" +
      "</div>";

    document.title = app.name + " · " + (site.name || "NeoApps");
    document.body.setAttribute("data-title", document.title);

    if (location.hash === "#changelog") {
      var el = document.getElementById("changelog");
      if (el) el.scrollIntoView();
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    var N = window.NeoApps;
    var id = param("id");
    var root = document.getElementById("app-page");
    Promise.all([N.loadSite(), N.loadApps()]).then(function (results) {
      var site = results[0], apps = results[1];
      var app = id && N.findApp(apps, id);
      if (!app) {
        root.innerHTML =
          '<div class="page-status"><h1>App not found</h1>' +
          '<p class="empty-note">That app is not on this list.</p>' +
          '<p><a class="btn" href="index.html#apps">Back to apps</a></p></div>';
        return;
      }
      render(app, site);
    }).catch(function (err) {
      root.innerHTML = '<p class="empty-note">Could not load this app.</p>';
      console.error(err);
    });
  });
})();
