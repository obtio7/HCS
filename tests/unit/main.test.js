import { describe, test, expect } from '@jest/globals';
import { CONFIG } from '../../js/config.js';

/**
 * Tests for the canvas dimension calculation logic in main.js.
 * Since main.js runs as a side-effect module (DOM-dependent), we test
 * the pure calculation logic extracted here.
 */

// Replicate the calculateDimensions logic from main.js for testability
function calculateDimensions(viewportWidth) {
  const width = Math.max(viewportWidth, 320, CONFIG.canvas.minWidth);
  const height = Math.max(width / CONFIG.canvas.aspectRatio, CONFIG.canvas.minHeight);
  return { width, height };
}

describe('Canvas dimension calculation', () => {
  test('uses viewport width when larger than minimums', () => {
    const dims = calculateDimensions(1200);
    expect(dims.width).toBe(1200);
    expect(dims.height).toBe(1200 / CONFIG.canvas.aspectRatio);
  });

  test('enforces minimum rendered width of 320px', () => {
    const dims = calculateDimensions(200);
    // 320 < 600 (minWidth), so minWidth wins
    expect(dims.width).toBeGreaterThanOrEqual(320);
  });

  test('enforces CONFIG.canvas.minWidth (600)', () => {
    const dims = calculateDimensions(400);
    expect(dims.width).toBe(CONFIG.canvas.minWidth);
    expect(dims.width).toBe(600);
  });

  test('enforces CONFIG.canvas.minHeight (150)', () => {
    const dims = calculateDimensions(600);
    expect(dims.height).toBeGreaterThanOrEqual(CONFIG.canvas.minHeight);
    expect(dims.height).toBe(150);
  });

  test('maintains aspect ratio (width / height = 4)', () => {
    const dims = calculateDimensions(800);
    expect(dims.width / dims.height).toBe(CONFIG.canvas.aspectRatio);
  });

  test('height is at least minHeight even for small widths', () => {
    const dims = calculateDimensions(320);
    // width becomes 600 (minWidth), height = 600/4 = 150 = minHeight
    expect(dims.height).toBeGreaterThanOrEqual(CONFIG.canvas.minHeight);
  });

  test('large viewport produces correct proportions', () => {
    const dims = calculateDimensions(1920);
    expect(dims.width).toBe(1920);
    expect(dims.height).toBe(480); // 1920 / 4
  });
});
