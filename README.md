# FocusForge

A personal daily productivity dashboard for IT job-prep (AI Engineering / DSA / Development),
built as a single-page vanilla-JS app — no build step required.

## Run it locally

Just open `index.html` in a browser, or serve the folder statically:

```bash
npx serve .
# or
python3 -m http.server 8000
```

`app.js` must be served alongside `index.html` (not opened via `file://` in some browsers,
since fetch/module rules can block local file access — a static server avoids that).

## Stack

- Vanilla JS (no framework, no build step) — see note below on why.
- Tailwind-free hand-written CSS with light/dark theme tokens.
- React + Lucide + IBM Plex / Sora via Google Fonts (no bundler needed).
- Data persists in `localStorage` under the key `focusforge:v1`.

### Why vanilla JS instead of React + TypeScript + Vite

The original spec asked for React/TS/Tailwind. This was built inside an environment with no
access to the npm registry, so a Vite/React toolchain couldn't be scaffolded. The app was
hand-written in vanilla JS with the same data model and persistence approach (localStorage,
stable IDs, separated collections for templates/instances/timers/settings) so the behavior
matches the spec exactly. If you have Node + npm locally, porting this to React + TS is
straightforward — the render functions in `app.js` are organized one-per-view and map cleanly
to components (Dashboard, Today, Timetable, History, Analytics, Settings).

## Structure

- `index.html` — page shell, design tokens, all CSS.
- `app.js` — everything else: data model, storage, checklist generation, timers, all views,
  event delegation. Organized into numbered sections (see comments at the top of each section).

## Backup

Settings → Backup & restore → Download backup (.json). Data lives only in the browser it was
created in — there's no account or server.
