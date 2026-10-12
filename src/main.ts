// main.ts - Rocket Rally Entry Point
import { Game } from './core/Game';

window.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('canvas-container');
  if (!container) {
    throw new Error('Canvas container element not found!');
  }

  // Initialize and start game
  const game = new Game(container);

  // Expose to window for debugging or extensions
  (window as unknown as { __ROCKET_RALLY_GAME__: Game }).__ROCKET_RALLY_GAME__ = game;
  console.log('🚀 Rocket Rally loaded successfully! Outer Wilds campfire awaits.');
});

