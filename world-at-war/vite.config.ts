import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Bundle EVERYTHING (JS, CSS) inline into one self-contained index.html — a
// single file you can double-click to play offline, or email to anyone. No
// install, no server, works from any computer. (The map is generated at
// runtime, so there are no external image assets to worry about.)
export default defineConfig({
  base: './',
  plugins: [viteSingleFile()],
  build: {
    target: 'es2020',
    outDir: 'dist',
    cssCodeSplit: false,
    assetsInlineLimit: 100_000_000,
    chunkSizeWarningLimit: 5000,
  },
});
