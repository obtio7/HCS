/**
 * InputHandler - Maps raw browser events to game actions.
 * Keyboard: Space/ArrowUp → jump, ArrowDown → duck, Escape/P → pause, Arrows → select
 * Touch: Tap → jump/start, Swipe down → duck, Swipe left/right → select, Two-finger tap → pause
 */
export class InputHandler {
  constructor(canvas) {
    this._canvas = canvas;
    this._jumpPressed = false;
    this._duckHeld = false;
    this._pausePressed = false;
    this._startPressed = false;
    this._leftPressed = false;
    this._rightPressed = false;

    // Touch state
    this._touchStartTime = 0;
    this._touchStartX = 0;
    this._touchStartY = 0;
    this._touchSwiped = false;
    this._activeTouches = 0;
    this._swipeThreshold = 40; // pixels to trigger swipe
    this._tapThreshold = 15;   // max movement for tap
    this._tapDuration = 250;   // max ms for tap

    // Bind handlers for clean add/remove
    this._onKeyDown = this._onKeyDown.bind(this);
    this._onKeyUp = this._onKeyUp.bind(this);
    this._onTouchStart = this._onTouchStart.bind(this);
    this._onTouchMove = this._onTouchMove.bind(this);
    this._onTouchEnd = this._onTouchEnd.bind(this);
    this._onTouchCancel = this._onTouchCancel.bind(this);
  }

  /** True if jump was pressed this frame (Space or ArrowUp). Jump takes priority over duck. */
  get jumpPressed() { return this._jumpPressed; }

  /** True if duck is currently held (ArrowDown). Returns false when jump is also pressed (jump priority). */
  get duckHeld() { return this._duckHeld && !this._jumpPressed; }

  /** True if a start/restart action was pressed this frame (Space/Tap). */
  get startPressed() { return this._startPressed; }

  /** True if pause was pressed this frame (Escape or P). */
  get pausePressed() { return this._pausePressed; }

  /** True if left arrow was pressed this frame. */
  get leftPressed() { return this._leftPressed; }

  /** True if right arrow was pressed this frame. */
  get rightPressed() { return this._rightPressed; }

  /** Attach event listeners to begin capturing input. */
  enable() {
    document.addEventListener('keydown', this._onKeyDown);
    document.addEventListener('keyup', this._onKeyUp);
    
    // Touch events with passive: false for preventDefault
    this._canvas.addEventListener('touchstart', this._onTouchStart, { passive: false });
    this._canvas.addEventListener('touchmove', this._onTouchMove, { passive: false });
    this._canvas.addEventListener('touchend', this._onTouchEnd, { passive: false });
    this._canvas.addEventListener('touchcancel', this._onTouchCancel, { passive: false });
    
    // Prevent context menu on long press
    this._canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  /** Remove event listeners to stop capturing input. */
  disable() {
    document.removeEventListener('keydown', this._onKeyDown);
    document.removeEventListener('keyup', this._onKeyUp);
    this._canvas.removeEventListener('touchstart', this._onTouchStart);
    this._canvas.removeEventListener('touchmove', this._onTouchMove);
    this._canvas.removeEventListener('touchend', this._onTouchEnd);
    this._canvas.removeEventListener('touchcancel', this._onTouchCancel);
  }

  /** Clear per-frame flags. Called at the end of each game loop frame. */
  resetFrame() {
    this._jumpPressed = false;
    this._pausePressed = false;
    this._startPressed = false;
    this._leftPressed = false;
    this._rightPressed = false;
  }

  /** @private */
  _onKeyDown(e) {
    // Ignore held-key repeats to prevent rapid-fire
    if (e.repeat) return;

    switch (e.code) {
      case 'Space':
      case 'ArrowUp':
        e.preventDefault();
        this._jumpPressed = true;
        this._startPressed = true;
        break;
      case 'ArrowDown':
        e.preventDefault();
        this._duckHeld = true;
        break;
      case 'ArrowLeft':
        e.preventDefault();
        this._leftPressed = true;
        break;
      case 'ArrowRight':
        e.preventDefault();
        this._rightPressed = true;
        break;
      case 'Escape':
      case 'KeyP':
        this._pausePressed = true;
        break;
    }
  }

  /** @private */
  _onKeyUp(e) {
    switch (e.code) {
      case 'ArrowDown':
        this._duckHeld = false;
        break;
    }
  }

  /** @private */
  _onTouchStart(e) {
    e.preventDefault();
    
    this._activeTouches = e.touches.length;
    
    // Two-finger tap = pause
    if (e.touches.length >= 2) {
      this._pausePressed = true;
      return;
    }
    
    const touch = e.touches[0];
    this._touchStartTime = Date.now();
    this._touchStartX = touch.clientX;
    this._touchStartY = touch.clientY;
    this._touchSwiped = false;
  }

  /** @private */
  _onTouchMove(e) {
    e.preventDefault();
    
    if (e.touches.length === 0) return;
    
    const touch = e.touches[0];
    const deltaX = touch.clientX - this._touchStartX;
    const deltaY = touch.clientY - this._touchStartY;
    
    // Swipe down = duck (hold)
    if (deltaY > this._swipeThreshold && !this._touchSwiped) {
      this._touchSwiped = true;
      this._duckHeld = true;
    }
    
    // Swipe left = select previous character
    if (deltaX < -this._swipeThreshold && !this._touchSwiped) {
      this._touchSwiped = true;
      this._leftPressed = true;
    }
    
    // Swipe right = select next character
    if (deltaX > this._swipeThreshold && !this._touchSwiped) {
      this._touchSwiped = true;
      this._rightPressed = true;
    }
  }

  /** @private */
  _onTouchEnd(e) {
    e.preventDefault();
    
    const duration = Date.now() - this._touchStartTime;
    
    // Release duck on touch end
    if (this._duckHeld) {
      this._duckHeld = false;
    }
    
    // If it was a swipe, don't process as tap
    if (this._touchSwiped) {
      this._touchSwiped = false;
      return;
    }
    
    // Check if it's a quick tap (not a swipe)
    if (duration < this._tapDuration && e.changedTouches.length > 0) {
      const touch = e.changedTouches[0];
      const dx = touch.clientX - this._touchStartX;
      const dy = touch.clientY - this._touchStartY;
      const displacement = Math.sqrt(dx * dx + dy * dy);
      
      if (displacement < this._tapThreshold) {
        // Quick tap = jump/start
        this._jumpPressed = true;
        this._startPressed = true;
      }
    }
    
    this._activeTouches = e.touches.length;
  }

  /** @private */
  _onTouchCancel(e) {
    e.preventDefault();
    this._duckHeld = false;
    this._touchSwiped = false;
    this._activeTouches = 0;
  }
}
