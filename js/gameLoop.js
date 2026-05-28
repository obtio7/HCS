export class GameLoop {
  constructor(updateFn, renderFn) {
    this._updateFn = updateFn;
    this._renderFn = renderFn;
    this._running = false;
    this._lastTimestamp = 0;
    this._frameId = null;
    this._fps = 0;
    this._frameCount = 0;
    this._fpsTimer = 0;
    this._tick = this._tick.bind(this);
  }

  get isRunning() { return this._running; }
  get fps() { return this._fps; }

  start() {
    if (this._running) return;
    this._running = true;
    this._lastTimestamp = performance.now();
    this._frameId = requestAnimationFrame(this._tick);
  }

  stop() {
    this._running = false;
    if (this._frameId) {
      cancelAnimationFrame(this._frameId);
      this._frameId = null;
    }
  }

  _tick(timestamp) {
    if (!this._running) return;

    let deltaTime = (timestamp - this._lastTimestamp) / 1000;
    this._lastTimestamp = timestamp;

    // Cap delta time to prevent physics explosions after tab switch
    if (deltaTime > 0.1) deltaTime = 0.1;

    // FPS counter
    this._frameCount++;
    this._fpsTimer += deltaTime;
    if (this._fpsTimer >= 1) {
      this._fps = this._frameCount;
      this._frameCount = 0;
      this._fpsTimer = 0;
    }

    try {
      this._updateFn(deltaTime);
      this._renderFn();
    } catch (e) {
      console.error('Game loop error:', e);
      this.stop();
      return;
    }

    this._frameId = requestAnimationFrame(this._tick);
  }
}
