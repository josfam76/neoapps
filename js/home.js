(function () {
  "use strict";

  function shotHtml(app) {
    var N = window.NeoApps;
    if (app.screenshot && !app.placeholder) {
      var label = app.mockup ? '<span class="shot-label">Preview mockup</span>' : "";
      return (
        '<div class="card-shot">' +
          '<img src="' + N.escapeHtml(app.screenshot) + '" alt="' +
            N.escapeHtml(app.name) + ' screenshot" data-lightbox>' +
          label +
        "</div>"
      );
    }
    var icon = app.icon
      ? '<img src="' + N.escapeHtml(app.icon) + '" alt="" width="96" height="96">'
      : '<span class="ph-icon" aria-hidden="true"></span>';
    var label = app.comingSoon ? "Details coming soon" : (app.screenshotCaption || "Screenshot coming soon");
    return '<div class="card-shot"><div class="shot-placeholder">' + icon + "<span>" + N.escapeHtml(label) + "</span></div></div>";
  }

  function highlightsHtml(app) {
    var N = window.NeoApps;
    var entry = N.latestChangelog(app);
    if (!entry || !entry.changes || !entry.changes.length) return "";
    var items = entry.changes.slice(0, 2).map(function (c) {
      return "<li>" + N.escapeHtml(c) + "</li>";
    }).join("");
    var more = entry.changes.length > 2 || (app.changelog && app.changelog.length > 1)
      ? '<a class="more" href="app.html?id=' + encodeURIComponent(app.id) + '#changelog">All release notes</a>'
      : '<a class="more" href="app.html?id=' + encodeURIComponent(app.id) + '#changelog">Release notes</a>';
    return (
      '<div class="whats-new">' +
        "<h4>What's new in " + N.escapeHtml(entry.version) + "</h4>" +
        "<ul>" + items + "</ul>" + more +
      "</div>"
    );
  }

  function cardHtml(app, site) {
    var N = window.NeoApps;
    var badges = N.badgesHtml(app);

    var tagline = app.tagline
      ? '<p class="tagline">' + N.escapeHtml(app.tagline) + "</p>"
      : (app.comingSoon ? '<p class="tagline">Details coming soon</p>' : "");
    var desc = app.description ? '<p class="desc">' + N.inlineCode(app.description) + "</p>" : "";
    var meta = !app.comingSoon && (app.requirements || []).length
      ? '<p class="meta">' + N.escapeHtml(N.shortReqs(app)) + "</p>"
      : "";

    var href = N.downloadUrl(app, site);
    var actions = '<div class="card-actions">';
    if (href) {
      actions += '<a class="btn btn-primary" href="' + N.escapeHtml(href) + '">Download</a>';
    }
    actions += '<a class="btn" href="app.html?id=' + encodeURIComponent(app.id) + '">Details</a>';
    actions += "</div>";

    return (
      '<article class="card app-card" id="card-' + N.escapeHtml(app.id) + '">' +
        shotHtml(app) +
        '<div class="card-body">' +
          '<div class="card-head"><h3><a href="app.html?id=' + encodeURIComponent(app.id) + '">' +
            N.escapeHtml(app.name) + "</a></h3>" + badges + "</div>" +
          tagline + desc + meta + highlightsHtml(app) + actions +
        "</div>" +
      "</article>"
    );
  }

  document.addEventListener("DOMContentLoaded", function () {
    var N = window.NeoApps;
    var grid = document.getElementById("app-grid");
    if (!grid) return;
    Promise.all([N.loadSite(), N.loadApps()]).then(function (results) {
      var site = results[0], apps = N.sortAppsByReleaseDate(results[1]);
      grid.innerHTML = apps.map(function (app) { return cardHtml(app, site); }).join("");
    }).catch(function (err) {
      grid.innerHTML = '<p class="empty-note">Could not load the app list.</p>';
      console.error(err);
    });
  });
})();
