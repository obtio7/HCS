import { CONFIG } from './config.js';
import { Game } from './game.js';

// Canvas setup
const canvas = document.getElementById('game-canvas');

if (!canvas) {
  const errorEl = document.createElement('p');
  errorEl.textContent = 'Game canvas element not found. Please reload the page.';
  errorEl.style.cssText = 'color:red;text-align:center;margin-top:50px;font-family:sans-serif;';
  document.body.appendChild(errorEl);
  throw new Error('Canvas element not found');
}

const ctx = canvas.getContext('2d');

if (!ctx) {
  const errorEl = document.createElement('p');
  errorEl.textContent = 'Your browser does not support Canvas. Please use a modern browser.';
  errorEl.style.cssText = 'color:red;text-align:center;margin-top:50px;font-family:sans-serif;';
  document.body.appendChild(errorEl);
  throw new Error('Canvas 2D context not available');
}

/**
 * Calculate canvas dimensions based on viewport width and aspect ratio.
 * Uses high-DPI scaling for crisp rendering on modern screens.
 */
function calculateDimensions() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  return { width, height };
}

/**
 * Apply high-DPI (Retina) scaling for crisp images and text.
 */
function applyHiDPI(canvas, width, height) {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = width + 'px';
  canvas.style.height = height + 'px';

  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  // Enable smooth image rendering
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  return { width, height };
}

// Set initial canvas dimensions with HiDPI
const dims = calculateDimensions();
applyHiDPI(canvas, dims.width, dims.height);

// Initialize game (pass logical dimensions, not physical)
const game = new Game(canvas, dims.width, dims.height);

// Responsive resize with 200ms debounce
let resizeTimeout;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    const newDims = calculateDimensions();
    applyHiDPI(canvas, newDims.width, newDims.height);
    game.resize(newDims.width, newDims.height);
  }, 200);
});

// Start the game
game.init();
