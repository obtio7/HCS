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
    this._gameoverPlayer2BgmElement = null;
    this._gameoverPlayer3BgmElement = null;
    this._gameoverPlayer4BgmElement = null;
    this._trumpCardBgmElement = null;
    this._bigstinCardBgmElement = null;
    this._isGameOver = false;
    this._isTrumpCardActive = false;
    this._isBigstinCardActive = false;
    this._currentGameOverBgm = null;
    this._wasPlayingBeforeHidden = false;  // Track if music was playing before tab switch
    this._activeAudioBeforeHidden = null;  // Track which audio was playing
    
    // Set up visibility change listener for tab switching
    this._setupVisibilityListener();
  }

  get isMuted() { return this._muted; }
  get _isTrumpCardActive() { return this.__isTrumpCardActive; }
  set _isTrumpCardActive(val) { this.__isTrumpCardActive = val; }
  get _isBigstinCardActive() { return this.__isBigstinCardActive; }
  set _isBigstinCardActive(val) { this.__isBigstinCardActive = val; }

  /**
   * Set up listener for tab visibility changes (pause music when tab is hidden)
   */
  _setupVisibilityListener() {
    document.addEventListener('visibilitychange', () => {
      console.log('Visibility changed:', document.hidden ? 'hidden' : 'visible');
      if (document.hidden) {
        // Tab is now hidden - pause all music
        this._pauseAllAudio();
      } else {
        // Tab is now visible - resume music if it was playing
        this._resumeAudio();
      }
    });
    console.log('Visibility listener set up');
  }

  /**
   * Pause all currently playing audio when tab becomes hidden
   */
  _pauseAllAudio() {
    this._activeAudioBeforeHidden = null;
    console.log('Pausing all audio...');
    
    // Check which audio is currently playing and pause it
    if (this._bgmElement && !this._bgmElement.paused) {
      this._activeAudioBeforeHidden = 'bgm';
      this._bgmElement.pause();
      console.log('Paused BGM');
    }
    
    if (this._currentGameOverBgm && !this._currentGameOverBgm.paused) {
      this._activeAudioBeforeHidden = 'gameover';
      this._currentGameOverBgm.pause();
      console.log('Paused game over BGM');
    }
    
    if (this._trumpCardBgmElement && !this._trumpCardBgmElement.paused) {
      this._activeAudioBeforeHidden = 'trump';
      this._trumpCardBgmElement.pause();
      console.log('Paused Trump Card BGM');
    }
    
    if (this._bigstinCardBgmElement && !this._bigstinCardBgmElement.paused) {
      this._activeAudioBeforeHidden = 'bigstin';
      this._bigstinCardBgmElement.pause();
      console.log('Paused Bigstin Card BGM');
    }
  }

  /**
   * Resume audio that was playing before tab was hidden
   */
  _resumeAudio() {
    console.log('Resuming audio, was playing:', this._activeAudioBeforeHidden);
    if (this._muted || !this._activeAudioBeforeHidden) return;
    
    switch (this._activeAudioBeforeHidden) {
      case 'bgm':
        if (this._bgmElement) {
          this._bgmElement.play().catch(e => {
            console.warn('Failed to resume BGM:', e.message);
          });
        }
        break;
      case 'gameover':
        if (this._currentGameOverBgm) {
          this._currentGameOverBgm.play().catch(e => {
            console.warn('Failed to resume game over BGM:', e.message);
          });
        }
        break;
      case 'trump':
        if (this._trumpCardBgmElement) {
          this._trumpCardBgmElement.play().catch(e => {
            console.warn('Failed to resume Trump Card BGM:', e.message);
          });
        }
        break;
      case 'bigstin':
        if (this._bigstinCardBgmElement) {
          this._bigstinCardBgmElement.play().catch(e => {
            console.warn('Failed to resume Bigstin Card BGM:', e.message);
          });
        }
        break;
    }
    
    this._activeAudioBeforeHidden = null;
  }

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

    // Set up player2 (Jewgoblin) game over BGM
    if (CONFIG.sounds.gameoverPlayer2Bgm) {
      this._gameoverPlayer2BgmElement = new Audio(CONFIG.sounds.gameoverPlayer2Bgm);
      this._gameoverPlayer2BgmElement.loop = true;
      this._gameoverPlayer2BgmElement.volume = 0.5;
      this._gameoverPlayer2BgmElement.preload = 'auto';
    }

    // Set up player3 (Jewman) game over BGM
    if (CONFIG.sounds.gameoverPlayer3Bgm) {
      this._gameoverPlayer3BgmElement = new Audio(CONFIG.sounds.gameoverPlayer3Bgm);
      this._gameoverPlayer3BgmElement.loop = true;
      this._gameoverPlayer3BgmElement.volume = 0.5;
      this._gameoverPlayer3BgmElement.preload = 'auto';
    }

    // Set up player4 (Big Yahu) game over BGM
    if (CONFIG.sounds.gameoverPlayer4Bgm) {
      this._gameoverPlayer4BgmElement = new Audio(CONFIG.sounds.gameoverPlayer4Bgm);
      this._gameoverPlayer4BgmElement.loop = true;
      this._gameoverPlayer4BgmElement.volume = 0.5;
      this._gameoverPlayer4BgmElement.preload = 'auto';
    }

    // Set up Trump Card BGM
    if (CONFIG.sounds.trumpCardBgm) {
      this._trumpCardBgmElement = new Audio(CONFIG.sounds.trumpCardBgm);
      this._trumpCardBgmElement.loop = true;
      this._trumpCardBgmElement.volume = 0.6;
      this._trumpCardBgmElement.preload = 'auto';
    }

    // Set up Bigstin Card BGM (ghost mode)
    if (CONFIG.sounds.bigstinCardBgm) {
      this._bigstinCardBgmElement = new Audio(CONFIG.sounds.bigstinCardBgm);
      this._bigstinCardBgmElement.loop = true;
      this._bigstinCardBgmElement.volume = 0.6;
      this._bigstinCardBgmElement.preload = 'auto';
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
    if (!this._bgmElement || this._bgmPlaying || this._isGameOver || this._isTrumpCardActive || this._isBigstinCardActive) return;
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

  /** Start Trump Card BGM (double penny mode) */
  startTrumpCardBgm() {
    this._isTrumpCardActive = true;
    
    // Pause main BGM
    if (this._bgmElement) {
      this._bgmElement.pause();
      this._bgmPlaying = false;
    }

    // Start Trump Card BGM
    if (this._trumpCardBgmElement && !this._muted) {
      this._trumpCardBgmElement.currentTime = 0;
      this._trumpCardBgmElement.play().catch(e => {
        console.warn('Trump Card BGM failed to play:', e.message);
      });
    }
  }

  /** Stop Trump Card BGM and resume normal BGM */
  stopTrumpCardBgm() {
    this._isTrumpCardActive = false;

    // Stop Trump Card BGM
    if (this._trumpCardBgmElement) {
      this._trumpCardBgmElement.pause();
      this._trumpCardBgmElement.currentTime = 0;
    }

    // Resume main BGM (if not game over and not bigstin card active)
    if (!this._isGameOver && !this._isBigstinCardActive) {
      this._startBgm();
    }
  }

  /** Start Bigstin Card BGM (ghost mode) */
  startBigstinCardBgm() {
    this._isBigstinCardActive = true;
    
    // Pause main BGM
    if (this._bgmElement) {
      this._bgmElement.pause();
      this._bgmPlaying = false;
    }

    // Pause Trump Card BGM if playing (Bigstin takes priority)
    if (this._trumpCardBgmElement && this._isTrumpCardActive) {
      this._trumpCardBgmElement.pause();
    }

    // Start Bigstin Card BGM
    if (this._bigstinCardBgmElement && !this._muted) {
      this._bigstinCardBgmElement.currentTime = 0;
      this._bigstinCardBgmElement.play().catch(e => {
        console.warn('Bigstin Card BGM failed to play:', e.message);
      });
    }
  }

  /** Stop Bigstin Card BGM and resume appropriate BGM */
  stopBigstinCardBgm() {
    this._isBigstinCardActive = false;

    // Stop Bigstin Card BGM
    if (this._bigstinCardBgmElement) {
      this._bigstinCardBgmElement.pause();
      this._bigstinCardBgmElement.currentTime = 0;
    }

    // Resume appropriate BGM
    if (!this._isGameOver) {
      if (this._isTrumpCardActive && this._trumpCardBgmElement) {
        // Resume Trump Card BGM if still active
        this._trumpCardBgmElement.play().catch(e => {
          console.warn('Trump Card BGM failed to resume:', e.message);
        });
      } else {
        // Resume main BGM
        this._startBgm();
      }
    }
  }

  /** Switch to game over BGM (player-specific if available) */
  startGameOverBgm(playerId = null) {
    this._isGameOver = true;
    this._isTrumpCardActive = false;
    this._isBigstinCardActive = false;
    
    // Stop main BGM
    if (this._bgmElement) {
      this._bgmElement.pause();
      this._bgmPlaying = false;
    }

    // Stop Trump Card BGM if playing
    if (this._trumpCardBgmElement) {
      this._trumpCardBgmElement.pause();
      this._trumpCardBgmElement.currentTime = 0;
    }

    // Stop Bigstin Card BGM if playing
    if (this._bigstinCardBgmElement) {
      this._bigstinCardBgmElement.pause();
      this._bigstinCardBgmElement.currentTime = 0;
    }

    // Select the appropriate game over BGM based on player
    let bgmToPlay = this._gameoverBgmElement; // default
    
    if (playerId === 'player2' && this._gameoverPlayer2BgmElement) {
      bgmToPlay = this._gameoverPlayer2BgmElement;
      console.log('Playing player2 (Jewgoblin) game over BGM');
    } else if (playerId === 'player3' && this._gameoverPlayer3BgmElement) {
      bgmToPlay = this._gameoverPlayer3BgmElement;
      console.log('Playing player3 (Jewman) game over BGM');
    } else if (playerId === 'player4' && this._gameoverPlayer4BgmElement) {
      bgmToPlay = this._gameoverPlayer4BgmElement;
      console.log('Playing player4 (Big Yahu) game over BGM');
    }

    this._currentGameOverBgm = bgmToPlay;

    // Start game over BGM
    if (bgmToPlay && !this._muted) {
      bgmToPlay.currentTime = 0;
      bgmToPlay.play().catch(e => {
        console.warn('Game over BGM failed to play:', e.message);
      });
    }
  }

  /** Switch back to main BGM (on restart) */
  stopGameOverBgm() {
    this._isGameOver = false;

    // Stop the current game over BGM (whichever was playing)
    if (this._currentGameOverBgm) {
      this._currentGameOverBgm.pause();
      this._currentGameOverBgm.currentTime = 0;
      this._currentGameOverBgm = null;
    }

    // Also stop all player-specific game over BGMs just in case
    if (this._gameoverBgmElement) {
      this._gameoverBgmElement.pause();
      this._gameoverBgmElement.currentTime = 0;
    }
    if (this._gameoverPlayer2BgmElement) {
      this._gameoverPlayer2BgmElement.pause();
      this._gameoverPlayer2BgmElement.currentTime = 0;
    }
    if (this._gameoverPlayer3BgmElement) {
      this._gameoverPlayer3BgmElement.pause();
      this._gameoverPlayer3BgmElement.currentTime = 0;
    }
    if (this._gameoverPlayer4BgmElement) {
      this._gameoverPlayer4BgmElement.pause();
      this._gameoverPlayer4BgmElement.currentTime = 0;
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
    if (this._gameoverPlayer2BgmElement) {
      this._gameoverPlayer2BgmElement.muted = this._muted;
    }
    if (this._gameoverPlayer3BgmElement) {
      this._gameoverPlayer3BgmElement.muted = this._muted;
    }
    if (this._gameoverPlayer4BgmElement) {
      this._gameoverPlayer4BgmElement.muted = this._muted;
    }
    if (this._trumpCardBgmElement) {
      this._trumpCardBgmElement.muted = this._muted;
    }
    if (this._bigstinCardBgmElement) {
      this._bigstinCardBgmElement.muted = this._muted;
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
    if (this._gameoverPlayer2BgmElement) {
      this._gameoverPlayer2BgmElement.muted = muted;
    }
    if (this._gameoverPlayer3BgmElement) {
      this._gameoverPlayer3BgmElement.muted = muted;
    }
    if (this._gameoverPlayer4BgmElement) {
      this._gameoverPlayer4BgmElement.muted = muted;
    }
    if (this._trumpCardBgmElement) {
      this._trumpCardBgmElement.muted = muted;
    }
    if (this._bigstinCardBgmElement) {
      this._bigstinCardBgmElement.muted = muted;
    }
  }
}
