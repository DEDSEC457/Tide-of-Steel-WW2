import { defineConfig } from 'vite';

// app/ is the Vite root; index.html is the entry. The legacy engine is served
// untouched from public/legacy/game.js; new typed modules live in src/.
export default defineConfig({
  build: { target: 'es2020', outDir: 'dist' },
});
