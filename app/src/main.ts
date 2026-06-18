// Entry point for the new typed layer. The legacy engine (public/legacy/game.js)
// boots itself as a classic script; this module is where the original, typed engine
// grows and gradually replaces it (the "strangler fig" migration).
import { neighbors } from './engine/hex';

declare global {
  interface Window {
    // typed engine surface, exposed for the console and for legacy interop during migration
    TW?: Record<string, unknown>;
  }
}

window.TW = { hex: { neighbors } };

console.info('[World at War] typed layer loaded — legacy engine running alongside.');
