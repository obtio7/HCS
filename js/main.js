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
 * Get the actual viewport dimensions, handling mobile browser quirks.
 * Uses visualViewport API when available for accurate mobile dimensions.
 */
function getViewportDimensions() {
  // Use visualViewport for accurate mobile dimensions (handles keyboard, zoom, etc.)
  if (window.visualViewport) {
    return {
      width: Math.round(window.visualViewport.width),
      height: Math.round(window.visualViewport.height)
    };
  }
  
  // Fallback for older browsers
  const width = Math.max(
    document.documentElement.clientWidth || 0,
    window.innerWidth || 0
  );
  const height = Math.max(
    document.documentElement.clientHeight || 0,
    window.innerHeight || 0
  );
  
  return { width, height };
}

/**
 * Calculate canvas dimensions based on viewport.
 * Ensures the game fills the entire screen on all devices.
 */
function calculateDimensions() {
  const { width, height } = getViewportDimensions();
  return { width, height };
}

/**
 * Apply high-DPI (Retina) scaling for crisp images and text.
 * Handles different device pixel ratios for sharp rendering.
 */
function applyHiDPI(canvas, width, height) {
  const dpr = Math.min(window.devicePixelRatio || 1, 3); // Cap at 3x for performance
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
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

/**
 * Handle resize events with debouncing.
 * Responds to window resize, orientation change, and visual viewport changes.
 */
let resizeTimeout;
function handleResize() {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    const newDims = calculateDimensions();
    applyHiDPI(canvas, newDims.width, newDims.height);
    game.resize(newDims.width, newDims.height);
  }, 100); // Reduced debounce for faster response
}

// Listen for various resize events
window.addEventListener('resize', handleResize);
window.addEventListener('orientationchange', () => {
  // Delay slightly for orientation change to complete
  setTimeout(handleResize, 150);
});

// Use visualViewport API for more accurate mobile resize detection
if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', handleResize);
}

// Handle fullscreen changes
document.addEventListener('fullscreenchange', handleResize);
document.addEventListener('webkitfullscreenchange', handleResize);

// Start the game
game.init();
