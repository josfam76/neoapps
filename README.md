# NeoApps site

A static, unlisted GitHub Pages site for Josef Familonidis’s Windows apps. There is no build step and no CDN. All paths are relative, so the site works at `https://<user>.github.io/neoapps/`.

The page is kept out of search with `<meta name="robots" content="noindex, nofollow">` and a `robots.txt` that disallows everything. Do not add a sitemap, and do not link this site from a public profile until you are ready to list it.

Builds are **not** committed here. Each app is published as a GitHub Release asset. Cleaned zips (source stripped) live in `../release-assets/` and should be uploaded to a release whose tag is `<app-id>-<version>`, for example `pulse-monitor-1.0.10`.

## GitHub owner

`data/site.json` holds `githubOwner` (currently `josfam76`) and `githubRepo` (`neoapps`). Download links in `data/apps.json` use this constant:

```
https://github.com/josfam76/neoapps/releases/download/<app-id>-<version>/<filename>
```

If the owner changes, update `githubOwner` and re-run `tools/add_release.py` for each app (or replace the owner segment in the `download` URLs). The JavaScript also substitutes `githubOwner` at runtime if a leftover placeholder remains.

## Preview locally

From the `neoapps` folder:

```
python tools/preview.py
```

Open http://127.0.0.1:8080/ — on localhost, Download buttons serve the cleaned zips from `release-assets/`. On GitHub Pages they use the Release URLs.

## Update an existing app

1. Get a zip of the new build (source inside the zip is fine; it will be stripped).
2. From the `neoapps` folder:

```
python tools/add_release.py pulse-monitor path/to/PulseMonitor-1.0.11.zip 1.0.11 \
  --date 2026-11-12 \
  --change "Fixed fan speed on some boards." \
  --change "Saved layouts survive a theme change."
```

`--notes notes.md` can be used instead of repeated `--change`. One bullet per line.

The script writes a cleaned zip to `release-assets/`, updates `version`, `filename`, `sizeBytes` and the GitHub Release `download` URL in `data/apps.json`, and prepends a changelog entry (newest first). Then upload that zip as a Release asset on the tag `<app-id>-<version>`.

A small **NEW** badge appears automatically on the home-page card and the app page header when the latest changelog entry's `date` (or a top-level `date` field) is within the last 7 days on the visitor's clock. The window is the single `NEW_BADGE_DAYS` constant in `js/site.js`. Future releases only need `--date` set; do not add the badge by hand. Apps with no date do not get a badge.

Home-page cards are also sorted by that same date, newest first, when the page is rendered. Apps with the same date (or no date) keep their order in `data/apps.json`, so a new release moves to the top automatically.

3. If you have a new screenshot, replace the file in `images/` yourself (or change the `screenshot` field in `apps.json`). `add_release.py` never touches `images/`. Edited screenshots already in `images/` stay as they are until you replace them on purpose.

### README overrides

To ship a public README that is different from the one in the original zip (generic example paths, no source-tree notes, and so on), put it in `tools/overrides/<app-id>/README.md` next to the script — for example `tools/overrides/nicebackup/README.md`. The same works for `README.txt`. On every release, `add_release.py` replaces the README already in the cleaned zip, or adds one next to the exe if the zip had none.

Existing overrides:

- `nicebackup` — official 2.0.0 README with generic example paths (from the 2.0.0 rebuild). The source zip is already clean; the override keeps that README if an older zip is packed later.
- `pulse-monitor`, `neograb`, `neocalc`, `neohealth` — user-facing READMEs with source-tree (`src/`) notes removed

### Safety scan

After packing, the script scans text files and also strings inside `.exe` and `.dll` files. It fails the release if a README mentions `src/`, or if personal strings appear (`deltabeast`, `josef` as a username, `JOFA`, `Foton`, `C:\Users\josef`, “Welcome to Numra”). The author credit “Josef Familonidis” is allowed. Pass `--skip-scan` only if you have reviewed the hits and still want to write the zip.

```
python tools/add_release.py nicebackup path/to/NiceBackup-2.0.1-win-x64.zip 2.0.1 --change "…"
```

## Add a new app

Add an object to the `apps` array in `data/apps.json` (copy an existing one), drop a screenshot into `images/`, then run `tools/add_release.py` with the new id, zip and version. A screenshot field is already reserved; set `placeholder` to `false` when you have one.

## Add a new section or page

The header and footer are rendered from `data/site.json` on every page.

1. Create a new HTML file (for example `forum.html`) that includes `css/style.css` and `js/site.js`, with empty `#site-header` and `#site-footer` elements like `index.html`.
2. Add a nav item to `data/site.json`:

```json
{ "id": "forum", "label": "Forum", "href": "forum.html" }
```

3. That is all. Do not add Forum, Donations or Feedback items to the nav until those pages exist.

To add a section on the home page instead, give it an `id`, reuse the `.section` / `.section-title` / `.card` styles, and point a nav `href` at `index.html#that-id`.

Per-app pages live at `app.html?id=<app-id>` and read everything from `apps.json` (features, requirements, changelog). Home cards already link there.

## Publishing

Publish the contents of this `site/` folder as the GitHub Pages root (repo root, `/docs`, or a GitHub Action that deploys `site/`). Include `.nojekyll`. Upload zips from `release-assets/` to Releases; do not commit them into this folder.
