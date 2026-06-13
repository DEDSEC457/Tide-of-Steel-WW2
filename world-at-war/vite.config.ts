import { defineConfig } from 'vite';

// Relative base so the build runs from any URL/sub-path (GitHub Pages, a local
// folder, anywhere) — exactly the "play from any computer" goal.
export default defineConfig({
  base: './',
  build: {
    target: 'es2020',
    outDir: 'dist',
  },
});
