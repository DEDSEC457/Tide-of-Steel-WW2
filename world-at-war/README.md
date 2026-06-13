# ⚙ The World at War — WebGL build

A large-scale WWII grand-strategy hex game for **Europe & the Mediterranean**,
built to run in any browser on any computer (GPU-accelerated, so it scales to
thousands of hexes and hundreds of units that the single-file HTML build never
could).

This is a **separate, in-progress project** from the original single-file game
(`../index.html`), which still works on its own. The World at War is being
rebuilt here on **PixiJS (WebGL) + Vite + TypeScript** for scale and looks.

## Run it locally
```bash
cd world-at-war
npm install
npm run dev      # http://localhost:5173  — live dev server
npm run build    # production build into dist/
npm run preview  # serve the production build
```

## Play from anywhere
Pushing to `main` triggers `.github/workflows/deploy-waw.yml`, which builds this
folder and publishes it to **GitHub Pages** — a URL you can open from any
computer. (One-time setup: repo **Settings → Pages → Source = "GitHub Actions"**.)

## Status
- ✅ WebGL foundation: smooth painted Europe terrain baked to a GPU texture
  (coastal shading, depth-graded sea, mountains/forests, rivers), a faint hex
  overlay, all 35 capitals & cities, and fluid pan/zoom.
- ⏳ Next: the gameplay layer — selectable hexes, army counters, movement,
  supply & fronts, production, and the war itself.

## Layout
- `src/geography.ts` — Europe coastline polygons, terrain, rivers, cities.
- `src/terrain.ts` — bakes the smooth terrain (+ hex grid) to a canvas texture.
- `src/main.ts` — PixiJS app: terrain, cities, pan/zoom.
