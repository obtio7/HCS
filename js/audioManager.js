import { CONFIG } from './config.js';

export class AudioManager {
  constructor() {
    this._context = null;
    this._buffers = {};
    this._muted = false;
    this._queue = [];
    this._initialized = false;
    this._bgmElement = null;
    this._bgmPlaying = false;
    this._gameoverBgmElement = null;
    this._isGameOver = false;
  }

  get isMuted() { return this._muted; }

  async loadAll() {
    // Don't create AudioContext yet - wait for user interaction
    const soundConfig = CONFIG.sounds;
    this._soundPaths = { ...soundConfig };

    // Set up background music using HTML Audio element (better for long tracks)
    this._bgmElement = new Audio(CONFIG.sounds.bgm || 'assets/sounds/bgm.mp3');
    this._bgmElement.loop = true;
    this._bgmElement.volume = 0.4;
    this._bgmElement.preload = 'auto';

    // Set up game over BGM
    if (CONFIG.sounds.gameoverBgm) {
      this._gameoverBgmElement = new Audio(CONFIG.sounds.gameoverBgm);
      this._gameoverBgmElement.loop = true;
      this._gameoverBgmElement.volume = 0.5;
      this._gameoverBgmElement.preload = 'auto';
    }
  }

  _ensureContext() {
    if (!this._context) {
      try {
        this._context = new (window.AudioContext || window.webkitAudioContext)();
      } catch (e) {
        console.warn('Web Audio API not available');
        return false;
      }
    }
    if (this._context.state === 'suspended') {
      this._context.resume();
    }
    return true;
  }

  async _loadBuffer(name, path) {
    if (!this._context) return;
    try {
      const response = await fetch(path);
      const arrayBuffer = await response.arrayBuffer();
      this._buffers[name] = await this._context.decodeAudioData(arrayBuffer);
    } catch (e) {
      console.warn(`Sound failed to load: ${name} (${path})`);
      this._buffers[name] = null;
    }
  }

  async initOnInteraction() {
    if (this._initialized) return;
    this._initialized = true;

    if (!this._ensureContext()) return;

    // Load all sound effects
    for (const [name, path] of Object.entries(this._soundPaths)) {
      await this._loadBuffer(name, path);
    }

    // Start background music
    this._startBgm();

    // Flush queue
    for (const name of this._queue) {
      this._playBuffer(name);
    }
    this._queue = [];
  }

  _startBgm() {
    if (!this._bgmElement || this._bgmPlaying || this._isGameOver) return;
    try {
      this._bgmElement.play().then(() => {
        this._bgmPlaying = true;
      }).catch(e => {
        console.warn('BGM failed to play:', e.message);
      });
    } catch (e) {
      console.warn('BGM play error:', e.message);
    }
  }

  /** Switch to game over BGM */
  startGameOverBgm() {
    this._isGameOver = true;
    
    // Stop main BGM
    if (this._bgmElement) {
      this._bgmElement.pause();
      this._bgmPlaying = false;
    }

    // Start game over BGM
    if (this._gameoverBgmElement && !this._muted) {
      this._gameoverBgmElement.currentTime = 0;
      this._gameoverBgmElement.play().catch(e => {
        console.warn('Game over BGM failed to play:', e.message);
      });
    }
  }

  /** Switch back to main BGM (on restart) */
  stopGameOverBgm() {
    this._isGameOver = false;

    // Stop game over BGM
    if (this._gameoverBgmElement) {
      this._gameoverBgmElement.pause();
      this._gameoverBgmElement.currentTime = 0;
    }

    // Resume main BGM
    this._startBgm();
  }

  play(soundName) {
    if (this._muted) return;

    if (!this._initialized) {
      this._queue.push(soundName);
      return;
    }

    this._playBuffer(soundName);
  }

  _playBuffer(name) {
    if (!this._context || !this._buffers[name]) return;
    try {
      const source = this._context.createBufferSource();
      source.buffer = this._buffers[name];
      source.connect(this._context.destination);
      source.start(0);
    } catch (e) {
      // Silently fail
    }
  }

  toggleMute() {
    this._muted = !this._muted;
    if (this._bgmElement) {
      this._bgmElement.muted = this._muted;
    }
    if (this._gameoverBgmElement) {
      this._gameoverBgmElement.muted = this._muted;
    }
  }

  setMuted(muted) {
    this._muted = muted;
    if (this._bgmElement) {
      this._bgmElement.muted = muted;
    }
    if (this._gameoverBgmElement) {
      this._gameoverBgmElement.muted = muted;
    }
  }
}
