# Fix: CSS double-minify — `.min.css` re-minified into `.min.min.css`

**Status:** IMPLEMENTED
**Branch:** `release/2.34.4` (already checked out — this is a release blocker, fix in place)
**Priority:** Release-blocking build/artifact bug.

---

## Root cause (confirmed)

`build-config.js` (~line 50) declares the CSS source glob as:

```js
css: {
    src: [
        'css/**/*.css',
    ],
},
```

The `minifyCss` gulp task (`build/gulpfile.js:140–149`) does:

```js
gulp.src( config.css.src, { base: '.' } )
    .pipe( rename( { suffix: '.min' } ) )   // appends ".min"
    .pipe( cssnano( ... ) )
```

`css/**/*.css` **matches the already-built `*.min.css` files**, so `admin.min.css`
gets `.min` appended → `admin.min.min.css`, re-minified, for every CSS file. These
double-min artifacts were then:
- built into `dist/siteorigin-panels/css/*.min.min.css` (6 files),
- zipped into `dist/siteorigin-panels.2.34.4.zip`,
- copied into the SVN trunk `/Users/misplon/Sites/svn/siteorigin-panels/trunk/css/*.min.min.css` (6 files).

They never showed in `git status` because `.gitignore` ignores `css/admin.min.min.css`;
they are purely a build/release artifact, not source.

**Confirmed present in working tree:**
- `dist/siteorigin-panels/css/{admin,dashboard,live-editor-preview,front-legacy,front-flex,live-editor-front}.min.min.css`
- `dist/siteorigin-panels.2.34.4.zip`
- trunk: `admin.min.min.css`, `dashboard.min.min.css`, `front-flex.min.min.css`,
  `front-legacy.min.min.css`, `live-editor-front.min.min.css`, `live-editor-preview.min.min.css`

---

## The fix (one line, source)

`build-config.js`, exclude already-minified files from the css src glob:

```js
css: {
    src: [
        'css/**/*.css',
        '!css/**/*.min.css',   // Don't re-minify already-built .min.css into .min.min.css
    ],
},
```

This is the ONLY source change. cssnano/rename wiring in `build/gulpfile.js` is correct
and untouched.

---

## Implementation Steps

### Step 1 — Exclude `*.min.css` from the CSS minify glob
**File:** `build-config.js` (the `css.src` array, ~line 50–53).

Add `'!css/**/*.min.css'` as a second entry in `css.src`.

**Commit:** `Step 1: Exclude already-minified CSS from minify glob`
(stage `build-config.js` ONLY — do NOT stage `docs/plans/*`, `dist/*`, or the SVN trunk).

---

## Release housekeeping (NOT commits — manual, run by human/reviewer)

These purge the stray artifacts so the release can be rebuilt clean. They touch only
ignored build artifacts and the external SVN trunk — nothing committable in this repo.

1. Purge double-min build artifacts from `dist/`:
   ```
   find /Users/misplon/Sites/siteorigin/wp-content/plugins/siteorigin-panels/dist -name '*.min.min.*' -delete
   ```
2. Remove the stray trunk copies (all six, not just admin):
   ```
   rm -f /Users/misplon/Sites/svn/siteorigin-panels/trunk/css/*.min.min.css
   ```
   (Reviewer's one-liner only named `admin.min.min.css`; six exist — glob removes all.)
3. Remove the bad zip so it is regenerated:
   ```
   rm -f /Users/misplon/Sites/siteorigin/wp-content/plugins/siteorigin-panels/dist/siteorigin-panels.2.34.4.zip
   ```
4. Rebuild after Step 1's glob fix is in place, producing a clean
   `siteorigin-panels.2.34.4.zip` and a clean trunk with no `.min.min` files.

---

## Verification (not a commit step)

- After the glob fix + rebuild, confirm `find dist -name '*.min.min.*'` returns nothing.
- Confirm the rebuilt `dist/siteorigin-panels.2.34.4.zip` contains no `*.min.min.css`
  (`unzip -l dist/siteorigin-panels.2.34.4.zip | grep min.min` → empty).
- Confirm the SVN trunk `css/` has the normal `*.min.css` set and zero `*.min.min.css`.
- Spot-check one rebuilt `*.min.css` (e.g. `css/admin.min.css`) is valid minified CSS,
  not double-processed.

## Out of scope
- No change to `build/gulpfile.js` (rename/cssnano logic is correct).
- No `.gitignore` change. The `css/admin.min.min.css` ignore line can be removed as
  later cleanup, but it is harmless and not release-blocking — leave it for now.
- The stored-XSS fix is a separate branch (`fix/panels-data-stored-xss`); unrelated.

## Open decisions for coder
- None. Single one-line source edit; everything else is non-committed release housekeeping.

---

## Implementation Notes

Single step implemented and committed (source only):
- `05e61c2e` Step 1: `build-config.js`

### Step 1 — `build-config.js` `css.src`
Added `'!css/**/*.min.css'` as a second entry in the `css.src` glob. The previous
`'css/**/*.css'` matched the already-built `*.min.css` files, so `minifyCss`
(`rename( suffix: '.min' )` → `cssnano`) appended another `.min` and re-minified them
into `*.min.min.css`. The exclusion makes each source `.css` minify exactly once.

**Verified (no build run needed for the glob itself):**
- `build-config.js` loads cleanly under Node 10.
- Resolved the `css.src` globs programmatically: now matches the **7 source files**
  (`admin, dashboard, front-flex, front-legacy, lib/select2, live-editor-front,
  live-editor-preview` `.css`) and matches **zero** `*.min.css` — confirming no file will
  be double-minified.
- `build/gulpfile.js` rename/cssnano wiring untouched, per plan.

### Scope notes
- Staged `build-config.js` ONLY. Pre-existing working-tree edits to `changelog.txt` and
  `readme.txt` (release-version prep) were present before this task and were intentionally
  left untouched/unstaged — not part of this plan.
- The branch `release/2.34.4` is current with `develop` (contains the full XSS fix, i18n
  glob fixes, `.gitignore`, overlay + color-picker merges).

### Release housekeeping — NOT done by coder (per plan: manual, run by human/reviewer)
The plan's "Release housekeeping" section deletes stray `*.min.min.*` artifacts from
`dist/`, the bad zip, and the external SVN trunk, then rebuilds. These touch only ignored
build artifacts and the external SVN tree — nothing committable here — and the plan assigns
them to the human/reviewer, so the coder did NOT run them. They must be done (then a clean
rebuild) before the release ships. See the Verification section for the post-rebuild checks.
