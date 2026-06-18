# World at War — TypeScript migration

This is the original strategy game, moving off the single-file `index.html` and onto
a real **Vite + TypeScript** foundation — multiple files, types, tests, tooling, and a
proper build — without throwing away anything we've already built.

It is an **original** game inspired by the design of HOI4 and mods like *Total War*.
No Paradox/mod files or assets are used; only our own code reimplements the *ideas*.

## How it works (the "strangler fig" approach)

The whole legacy engine keeps running, untouched, while we replace it piece by piece:

- `public/legacy/game.js` — the entire original engine + UI, extracted **verbatim** from
  `index.html`. It loads as a classic (sloppy-mode) script, so it behaves byte-identically
  to the original. It already exposes `window.wwStart`, `window.wwRender`, etc.
- `src/` — the **new typed engine**. Pure, tested TypeScript modules that we grow over time.
  As each system is ported, it moves out of the legacy blob and into `src/`, and the legacy
  code calls into it (via `window.TW`) until the blob is gone.

The original `../index.html` and `../devtest.js` at the repo root are **left intact** — the
single-file game and its 346-check suite stay green throughout the migration.

## Commands (run inside `app/`)

```bash
npm install        # one-time
npm run dev        # local dev server (hot reload) — the playable game
npm run build      # type-check (tsc --noEmit) + production build to dist/
npm run test       # vitest — the typed-engine unit tests
npm run typecheck  # type-check only
```

## Layout

```
app/
  index.html            entry (HTML + CSS, the original markup; script blob removed)
  public/legacy/game.js the legacy engine, served untouched (strangler base)
  src/
    main.ts             typed entry; exposes window.TW for interop
    engine/
      hex.ts            offset-hex grid math (first ported module)
      hex.test.ts
  MIGRATION.md
```

## Roadmap (port order — pure logic first, it's the easiest to type & test)

1. **Grid & map** — hex math (done: `hex.ts`), coordinate transforms, terrain.
2. **State & types** — typed `WW` state, nations, armies, cities (the data model).
3. **Rules** — supply/rail, combat (combined arms), movement, economy (fuel/mp/steel).
4. **AI** — postures, fronts, production.
5. **Rendering** — canvas draw layer (LOD, counters) as typed modules.
6. **UI** — panels (production, focus tree, research) as components.

Each step: port the logic to `src/`, add vitest coverage, then delete the legacy copy and
wire the legacy UI to the typed module. The game stays playable at every step.

## New-game features to build on this foundation (the "Total War feel")

- Naval / Pacific layer (fleets, carriers, island hopping)
- Support units & a light division designer (artillery, engineers, AA)
- National spirits + deeper per-major events
- Captured industry (conquest grows your factories)
