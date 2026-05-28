import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { InputHandler } from '../../js/inputHandler.js';

/**
 * Unit tests for InputHandler keyboard support (task 3.1).
 * Tests key mapping, repeat filtering, jump/duck priority, and lifecycle methods.
 */

// Minimal canvas mock for constructor
function createMockCanvas() {
  return {
    addEventListener: () => {},
    removeEventListener: () => {}
  };
}

// Helper to create a KeyboardEvent-like object
function createKeyEvent(code, { repeat = false } = {}) {
  return {
    code,
    repeat,
    preventDefault: () => {}
  };
}

describe('InputHandler - Keyboard Support', () => {
  let handler;
  let mockCanvas;

  beforeEach(() => {
    mockCanvas = createMockCanvas();
    handler = new InputHandler(mockCanvas);
  });

  describe('Key mapping', () => {
    test('Space maps to jumpPressed and startPressed', () => {
      handler._onKeyDown(createKeyEvent('Space'));
      expect(handler.jumpPressed).toBe(true);
      expect(handler.startPressed).toBe(true);
    });

    test('ArrowUp maps to jumpPressed and startPressed', () => {
      handler._onKeyDown(createKeyEvent('ArrowUp'));
      expect(handler.jumpPressed).toBe(true);
      expect(handler.startPressed).toBe(true);
    });

    test('ArrowDown maps to duckHeld', () => {
      handler._onKeyDown(createKeyEvent('ArrowDown'));
      expect(handler.duckHeld).toBe(true);
    });

    test('Escape maps to pausePressed', () => {
      handler._onKeyDown(createKeyEvent('Escape'));
      expect(handler.pausePressed).toBe(true);
    });

    test('KeyP maps to pausePressed', () => {
      handler._onKeyDown(createKeyEvent('KeyP'));
      expect(handler.pausePressed).toBe(true);
    });

    test('unrelated keys produce no action', () => {
      handler._onKeyDown(createKeyEvent('KeyA'));
      expect(handler.jumpPressed).toBe(false);
      expect(handler.duckHeld).toBe(false);
      expect(handler.pausePressed).toBe(false);
      expect(handler.startPressed).toBe(false);
    });
  });

  describe('event.repeat filtering', () => {
    test('repeated Space keydown is ignored', () => {
      handler._onKeyDown(createKeyEvent('Space', { repeat: true }));
      expect(handler.jumpPressed).toBe(false);
    });

    test('repeated ArrowUp keydown is ignored', () => {
      handler._onKeyDown(createKeyEvent('ArrowUp', { repeat: true }));
      expect(handler.jumpPressed).toBe(false);
    });

    test('repeated ArrowDown keydown is ignored', () => {
      handler._onKeyDown(createKeyEvent('ArrowDown', { repeat: true }));
      expect(handler.duckHeld).toBe(false);
    });

    test('repeated Escape keydown is ignored', () => {
      handler._onKeyDown(createKeyEvent('Escape', { repeat: true }));
      expect(handler.pausePressed).toBe(false);
    });

    test('repeated KeyP keydown is ignored', () => {
      handler._onKeyDown(createKeyEvent('KeyP', { repeat: true }));
      expect(handler.pausePressed).toBe(false);
    });
  });

  describe('Jump priority over duck', () => {
    test('when jump and duck are both active, duckHeld returns false', () => {
      handler._onKeyDown(createKeyEvent('ArrowDown'));
      handler._onKeyDown(createKeyEvent('Space'));
      expect(handler.jumpPressed).toBe(true);
      expect(handler.duckHeld).toBe(false);
    });

    test('when only duck is active, duckHeld returns true', () => {
      handler._onKeyDown(createKeyEvent('ArrowDown'));
      expect(handler.duckHeld).toBe(true);
      expect(handler.jumpPressed).toBe(false);
    });

    test('after resetFrame clears jump, duckHeld returns true if still held', () => {
      handler._onKeyDown(createKeyEvent('ArrowDown'));
      handler._onKeyDown(createKeyEvent('Space'));
      expect(handler.duckHeld).toBe(false); // jump has priority
      handler.resetFrame();
      // jump cleared, but duck is still held
      expect(handler.duckHeld).toBe(true);
      expect(handler.jumpPressed).toBe(false);
    });
  });

  describe('Key release (keyup)', () => {
    test('releasing ArrowDown clears duckHeld', () => {
      handler._onKeyDown(createKeyEvent('ArrowDown'));
      expect(handler.duckHeld).toBe(true);
      handler._onKeyUp(createKeyEvent('ArrowDown'));
      expect(handler.duckHeld).toBe(false);
    });

    test('releasing other keys does not affect state', () => {
      handler._onKeyDown(createKeyEvent('Space'));
      handler._onKeyUp(createKeyEvent('Space'));
      // jumpPressed is a per-frame flag, not cleared by keyup
      expect(handler.jumpPressed).toBe(true);
    });
  });

  describe('resetFrame()', () => {
    test('clears jumpPressed', () => {
      handler._onKeyDown(createKeyEvent('Space'));
      handler.resetFrame();
      expect(handler.jumpPressed).toBe(false);
    });

    test('clears pausePressed', () => {
      handler._onKeyDown(createKeyEvent('Escape'));
      handler.resetFrame();
      expect(handler.pausePressed).toBe(false);
    });

    test('clears startPressed', () => {
      handler._onKeyDown(createKeyEvent('Space'));
      handler.resetFrame();
      expect(handler.startPressed).toBe(false);
    });

    test('does NOT clear duckHeld (it is a held state, not per-frame)', () => {
      handler._onKeyDown(createKeyEvent('ArrowDown'));
      handler.resetFrame();
      expect(handler.duckHeld).toBe(true);
    });
  });

  describe('enable() and disable()', () => {
    test('enable attaches keydown and keyup listeners to document', () => {
      const listeners = {};
      const origAdd = global.document?.addEventListener;
      const origRemove = global.document?.removeEventListener;

      // Mock document event listeners
      global.document = {
        addEventListener: (event, fn) => { listeners[event] = fn; },
        removeEventListener: (event, fn) => { 
          if (listeners[event] === fn) delete listeners[event]; 
        }
      };

      handler.enable();
      expect(listeners['keydown']).toBeDefined();
      expect(listeners['keyup']).toBeDefined();

      handler.disable();
      expect(listeners['keydown']).toBeUndefined();
      expect(listeners['keyup']).toBeUndefined();

      // Restore
      if (origAdd) global.document.addEventListener = origAdd;
      if (origRemove) global.document.removeEventListener = origRemove;
    });
  });

  describe('Initial state', () => {
    test('all getters return false initially', () => {
      expect(handler.jumpPressed).toBe(false);
      expect(handler.duckHeld).toBe(false);
      expect(handler.pausePressed).toBe(false);
      expect(handler.startPressed).toBe(false);
    });
  });
});


/**
 * Unit tests for InputHandler touch support (task 3.2).
 * Tests tap detection, swipe-down detection, touch end release, and preventDefault.
 */

// Helper to create a TouchEvent-like object for touchstart
function createTouchStartEvent(clientX, clientY) {
  return {
    touches: [{ clientX, clientY }],
    preventDefault: jest.fn()
  };
}

// Helper to create a TouchEvent-like object for touchmove
function createTouchMoveEvent(clientX, clientY) {
  return {
    touches: [{ clientX, clientY }],
    preventDefault: jest.fn()
  };
}

// Helper to create a TouchEvent-like object for touchend
function createTouchEndEvent(clientX, clientY) {
  return {
    changedTouches: [{ clientX, clientY }],
    preventDefault: jest.fn()
  };
}

describe('InputHandler - Touch Support', () => {
  let handler;
  let mockCanvas;

  beforeEach(() => {
    mockCanvas = createMockCanvas();
    handler = new InputHandler(mockCanvas);
    // Mock Date.now for timing control
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Tap detection (jump/start)', () => {
    test('tap within 200ms and < 20px displacement triggers jump and start', () => {
      jest.setSystemTime(1000);
      handler._onTouchStart(createTouchStartEvent(100, 200));

      jest.setSystemTime(1100); // 100ms elapsed
      handler._onTouchEnd(createTouchEndEvent(105, 205)); // ~7px displacement

      expect(handler.jumpPressed).toBe(true);
      expect(handler.startPressed).toBe(true);
    });

    test('tap at exactly 199ms triggers jump', () => {
      jest.setSystemTime(1000);
      handler._onTouchStart(createTouchStartEvent(100, 200));

      jest.setSystemTime(1199); // 199ms elapsed
      handler._onTouchEnd(createTouchEndEvent(100, 200)); // 0px displacement

      expect(handler.jumpPressed).toBe(true);
      expect(handler.startPressed).toBe(true);
    });

    test('touch held for 200ms or more does NOT trigger tap', () => {
      jest.setSystemTime(1000);
      handler._onTouchStart(createTouchStartEvent(100, 200));

      jest.setSystemTime(1200); // exactly 200ms
      handler._onTouchEnd(createTouchEndEvent(100, 200));

      expect(handler.jumpPressed).toBe(false);
      expect(handler.startPressed).toBe(false);
    });

    test('touch held for 500ms does NOT trigger tap', () => {
      jest.setSystemTime(1000);
      handler._onTouchStart(createTouchStartEvent(100, 200));

      jest.setSystemTime(1500); // 500ms elapsed
      handler._onTouchEnd(createTouchEndEvent(100, 200));

      expect(handler.jumpPressed).toBe(false);
      expect(handler.startPressed).toBe(false);
    });

    test('tap with displacement >= 20px does NOT trigger jump', () => {
      jest.setSystemTime(1000);
      handler._onTouchStart(createTouchStartEvent(100, 200));

      jest.setSystemTime(1100); // 100ms elapsed
      // 20px displacement (exactly at threshold)
      handler._onTouchEnd(createTouchEndEvent(120, 200));

      expect(handler.jumpPressed).toBe(false);
      expect(handler.startPressed).toBe(false);
    });

    test('tap with large displacement does NOT trigger jump even if fast', () => {
      jest.setSystemTime(1000);
      handler._onTouchStart(createTouchStartEvent(100, 200));

      jest.setSystemTime(1050); // 50ms elapsed
      // 25px displacement
      handler._onTouchEnd(createTouchEndEvent(100, 225));

      expect(handler.jumpPressed).toBe(false);
      expect(handler.startPressed).toBe(false);
    });
  });

  describe('Swipe-down detection (duck)', () => {
    test('vertical delta > 30px downward triggers duck', () => {
      handler._onTouchStart(createTouchStartEvent(100, 200));
      handler._onTouchMove(createTouchMoveEvent(100, 231)); // 31px down

      expect(handler.duckHeld).toBe(true);
    });

    test('vertical delta of exactly 30px does NOT trigger duck', () => {
      handler._onTouchStart(createTouchStartEvent(100, 200));
      handler._onTouchMove(createTouchMoveEvent(100, 230)); // exactly 30px

      expect(handler.duckHeld).toBe(false);
    });

    test('upward swipe does NOT trigger duck', () => {
      handler._onTouchStart(createTouchStartEvent(100, 200));
      handler._onTouchMove(createTouchMoveEvent(100, 150)); // -50px (upward)

      expect(handler.duckHeld).toBe(false);
    });

    test('swipe-down only triggers once even with continued movement', () => {
      handler._onTouchStart(createTouchStartEvent(100, 200));
      handler._onTouchMove(createTouchMoveEvent(100, 235)); // triggers duck
      handler._onTouchMove(createTouchMoveEvent(100, 270)); // further movement

      // duckHeld should still be true (not toggled)
      expect(handler.duckHeld).toBe(true);
    });
  });

  describe('Touch end after swipe releases duck', () => {
    test('touchend after swipe-down releases duckHeld', () => {
      jest.setSystemTime(1000);
      handler._onTouchStart(createTouchStartEvent(100, 200));
      handler._onTouchMove(createTouchMoveEvent(100, 235)); // triggers duck

      expect(handler.duckHeld).toBe(true);

      jest.setSystemTime(1300); // 300ms elapsed (not a tap)
      handler._onTouchEnd(createTouchEndEvent(100, 235));

      expect(handler.duckHeld).toBe(false);
    });

    test('touchend after swipe does NOT trigger jump', () => {
      jest.setSystemTime(1000);
      handler._onTouchStart(createTouchStartEvent(100, 200));
      handler._onTouchMove(createTouchMoveEvent(100, 235)); // triggers duck

      jest.setSystemTime(1050); // even if within 200ms
      handler._onTouchEnd(createTouchEndEvent(100, 235));

      expect(handler.jumpPressed).toBe(false);
      expect(handler.startPressed).toBe(false);
    });
  });

  describe('preventDefault on touch events', () => {
    test('touchstart calls preventDefault', () => {
      const event = createTouchStartEvent(100, 200);
      handler._onTouchStart(event);
      expect(event.preventDefault).toHaveBeenCalled();
    });

    test('touchmove calls preventDefault', () => {
      handler._onTouchStart(createTouchStartEvent(100, 200));
      const event = createTouchMoveEvent(100, 250);
      handler._onTouchMove(event);
      expect(event.preventDefault).toHaveBeenCalled();
    });

    test('touchend calls preventDefault', () => {
      jest.setSystemTime(1000);
      handler._onTouchStart(createTouchStartEvent(100, 200));
      jest.setSystemTime(1100);
      const event = createTouchEndEvent(100, 200);
      handler._onTouchEnd(event);
      expect(event.preventDefault).toHaveBeenCalled();
    });
  });

  describe('Simultaneous keyboard and touch support', () => {
    test('keyboard jump and touch duck can coexist', () => {
      handler._onKeyDown(createKeyEvent('Space'));
      handler._onTouchStart(createTouchStartEvent(100, 200));
      handler._onTouchMove(createTouchMoveEvent(100, 235));

      // Jump takes priority over duck in the getter
      expect(handler.jumpPressed).toBe(true);
      expect(handler.duckHeld).toBe(false); // jump priority
    });

    test('touch tap sets same flags as keyboard Space', () => {
      jest.setSystemTime(1000);
      handler._onTouchStart(createTouchStartEvent(100, 200));
      jest.setSystemTime(1050);
      handler._onTouchEnd(createTouchEndEvent(100, 200));

      expect(handler.jumpPressed).toBe(true);
      expect(handler.startPressed).toBe(true);
    });

    test('resetFrame clears touch-triggered jump flags', () => {
      jest.setSystemTime(1000);
      handler._onTouchStart(createTouchStartEvent(100, 200));
      jest.setSystemTime(1050);
      handler._onTouchEnd(createTouchEndEvent(100, 200));

      expect(handler.jumpPressed).toBe(true);
      handler.resetFrame();
      expect(handler.jumpPressed).toBe(false);
      expect(handler.startPressed).toBe(false);
    });
  });
});
