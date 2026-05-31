import { CONFIG } from './config.js';
import { GameLoop } from './gameLoop.js';
import { InputHandler } from './inputHandler.js';
import { Player } from './player.js';
import { ObstacleManager } from './obstacleManager.js';
import { CollisionDetector } from './collisionDetector.js';
import { ScoreSystem } from './scoreSystem.js';
import { DifficultyManager } from './difficultyManager.js';
import { SpriteManager } from './spriteManager.js';
import { GroundRenderer } from './groundRenderer.js';
import { BackgroundRenderer } from './backgroundRenderer.js';
import { AudioManager } from './audioManager.js';
import { UIRenderer } from './uiRenderer.js';
import { CoinManager } from './coinManager.js';
import { ProjectileManager } from './projectileManager.js';
import { ChatManager } from './chatManager.js';

/**
 * Valid state transitions for the game state machine.
 * Each key is a current state, and its value is an array of states it can transition to.
 */
const VALID_TRANSITIONS = {
  loading: ['ready'],
  ready: ['running'],
  running: ['paused', 'gameover'],
  paused: ['running'],
  gameover: ['running']
};

export class Game {
  constructor(canvas, logicalWidth, logicalHeight) {
    this._canvas = canvas;
    this._ctx = canvas.getContext('2d');
    this._state = 'loading';
    this._gameOverTimestamp = 0;

    // Start screen video element
    this._startVideo = document.getElementById('start-video');

    // Use logical dimensions (not physical canvas.width which is scaled by DPR)
    this._logicalWidth = logicalWidth || canvas.width;
    this._logicalHeight = logicalHeight || canvas.height;
    
    // Detect if mobile device (portrait orientation or small screen)
    this._isMobile = this._detectMobile();
    
    // Mobile scale factor - shrink game elements by 40% on mobile (0.6 = 60% of original size)
    this._mobileScale = this._isMobile ? 0.6 : 1.0;

    // Ground Y position — adjusted for mobile (higher ground = smaller playground)
    // Desktop: 65% from top, Mobile: 68% from top (much lower for phone users)
    const groundPercent = this._isMobile ? 0.68 : 0.65;
    this._groundY = Math.round(this._logicalHeight * groundPercent);

    // Initialize subsystems
    this._spriteManager = new SpriteManager();
    this._inputHandler = new InputHandler(canvas);
    this._player = new Player(this._spriteManager, this._mobileScale);
    this._obstacleManager = new ObstacleManager(this._logicalWidth, this._groundY, this._mobileScale);
    this._scoreSystem = new ScoreSystem();
    this._difficultyManager = new DifficultyManager();
    this._groundRenderer = new GroundRenderer(this._logicalWidth, this._groundY);
    this._backgroundRenderer = new BackgroundRenderer(this._logicalWidth, this._logicalHeight);
    this._audioManager = new AudioManager();
    this._uiRenderer = new UIRenderer(canvas, this._logicalWidth, this._logicalHeight);
    this._coinManager = new CoinManager(this._logicalWidth, this._groundY, this._mobileScale);
    this._projectileManager = new ProjectileManager(this._logicalWidth, this._groundY, this._mobileScale);
    this._chatManager = new ChatManager();

    this._gameLoop = new GameLoop(
      (dt) => this.update(dt),
      () => this.render()
    );

    // Set player ground position
    this._player.setGroundY(this._groundY);

    // Mute button click handler (for desktop)
    this._canvas.addEventListener('click', (e) => this._handleClick(e));
    
    // Touch handler for UI buttons (for mobile)
    this._canvas.addEventListener('touchend', (e) => this._handleTouch(e), { passive: false });
  }

  /** Returns the current game state. */
  get state() { return this._state; }

  /**
   * Transition to a new state with validation.
   * Throws an error if the transition is not valid.
   * @param {string} newState - The target state to transition to.
   */
  setState(newState) {
    const validTargets = VALID_TRANSITIONS[this._state];
    if (!validTargets || !validTargets.includes(newState)) {
      throw new Error(
        `Invalid state transition: '${this._state}' → '${newState}'`
      );
    }
    this._state = newState;
  }

  /**
   * Initialize the game: load assets, set up subsystems, transition to 'ready'.
   */
  async init() {
    await this._spriteManager.loadAll();
    await this._audioManager.loadAll();
    this._inputHandler.enable();
    this.setState('ready');
    this._gameLoop.start();
  }

  /**
   * Start the game from the 'ready' state.
   * Transitions to 'running' and starts the game loop.
   */
  start() {
    // Hide the start video background
    if (this._startVideo) {
      this._startVideo.classList.add('hidden');
      this._startVideo.pause();
    }
    
    this.setState('running');
    if (!this._gameLoop.isRunning) {
      this._gameLoop.start();
    }
  }

  /**
   * Pause the game from the 'running' state.
   * Transitions to 'paused' and stops the game loop.
   */
  pause() {
    this.setState('paused');
  }

  /**
   * Resume the game from the 'paused' state.
   * Transitions back to 'running'.
   */
  resume() {
    this.setState('running');
  }

  /**
   * End the current run due to collision.
   * Transitions to 'gameover', stops the loop, saves high score.
   */
  gameOver() {
    this.setState('gameover');
    this._gameOverTimestamp = Date.now();
    this._scoreSystem.saveHighScore();
    this._audioManager.play('crash');
    // Pass the current player ID for player-specific game over music
    this._audioManager.startGameOverBgm(this._player.selectedCharacterId);
    // Pass the current player ID to show player-specific game over GIF
    this._uiRenderer.showGameOver(this._player.selectedCharacterId);
  }

  /**
   * Restart the game from 'gameover' state.
   * Resets all subsystems and transitions to 'running'.
   */
  restart() {
    this._uiRenderer.hideGameOver();
    this._audioManager.stopGameOverBgm();
    this.setState('running');
    this._player.reset();
    this._obstacleManager.reset();
    this._coinManager.reset();
    this._projectileManager.reset();
    this._scoreSystem.reset();
    this._difficultyManager.reset();
    this._groundRenderer.reset();
    this._backgroundRenderer.reset();
  }

  /**
   * Update game logic. Only processes gameplay when state is 'running'.
   * Called by the game loop each frame.
   * @param {number} deltaTime - Time elapsed since last frame in seconds.
   */
  update(deltaTime) {
    try {
      switch (this._state) {
        case 'ready':
          // Character selection with arrow keys
          if (this._inputHandler.leftPressed) {
            this._uiRenderer.selectPrevCharacter();
            this._player.setCharacter(this._uiRenderer.selectedCharacterId);
          }
          if (this._inputHandler.rightPressed) {
            this._uiRenderer.selectNextCharacter();
            this._player.setCharacter(this._uiRenderer.selectedCharacterId);
          }
          
          // Only start game if startPressed AND it wasn't a UI button tap
          // Check touch position against arrow buttons to prevent accidental starts
          if (this._inputHandler.startPressed) {
            // Check if the touch was on an arrow button (mobile)
            const touchX = this._inputHandler.lastTouchX;
            const touchY = this._inputHandler.lastTouchY;
            const scaleX = this._logicalWidth / this._canvas.getBoundingClientRect().width;
            const scaleY = this._logicalHeight / this._canvas.getBoundingClientRect().height;
            const x = touchX * scaleX;
            const y = touchY * scaleY;
            
            // Check if touch was on arrow buttons
            const leftArrow = this._uiRenderer.leftArrowBounds;
            const rightArrow = this._uiRenderer.rightArrowBounds;
            const muteBtn = this._uiRenderer.muteButtonBounds;
            const chatBtn = this._uiRenderer.chatButtonBounds;
            
            const hitLeftArrow = x >= leftArrow.x && x <= leftArrow.x + leftArrow.width && 
                                 y >= leftArrow.y && y <= leftArrow.y + leftArrow.height;
            const hitRightArrow = x >= rightArrow.x && x <= rightArrow.x + rightArrow.width && 
                                  y >= rightArrow.y && y <= rightArrow.y + rightArrow.height;
            const hitMuteBtn = x >= muteBtn.x && x <= muteBtn.x + muteBtn.width && 
                               y >= muteBtn.y && y <= muteBtn.y + muteBtn.height;
            const hitChatBtn = x >= chatBtn.x && x <= chatBtn.x + chatBtn.width && 
                               y >= chatBtn.y && y <= chatBtn.y + chatBtn.height;
            
            // Only start game if NOT hitting any UI button
            if (!hitLeftArrow && !hitRightArrow && !hitMuteBtn && !hitChatBtn) {
              // Apply selected character before starting
              this._player.setCharacter(this._uiRenderer.selectedCharacterId);
              this._audioManager.initOnInteraction();
              this.start();
            }
          }
          break;

        case 'running':
          this._updateRunning(deltaTime);
          break;

        case 'paused':
          if (this._inputHandler.pausePressed || this._inputHandler.startPressed) {
            this.resume();
          }
          break;

        case 'gameover':
          if (this._inputHandler.startPressed) {
            const elapsed = Date.now() - this._gameOverTimestamp;
            if (elapsed >= CONFIG.timing.restartDelay) {
              // The _handleTouch method handles Switch Player button taps
              // Here we only need to handle keyboard/non-button taps for restart
              // Check if the touch was on any UI button (mobile)
              const touchX = this._inputHandler.lastTouchX;
              const touchY = this._inputHandler.lastTouchY;
              const scaleX = this._logicalWidth / this._canvas.getBoundingClientRect().width;
              const scaleY = this._logicalHeight / this._canvas.getBoundingClientRect().height;
              const x = touchX * scaleX;
              const y = touchY * scaleY;
              
              // Check if touch was on UI buttons
              const switchBtn = this._uiRenderer.switchPlayerBounds;
              const playBtn = this._uiRenderer.playAgainBounds;
              const muteBtn = this._uiRenderer.muteButtonBounds;
              const chatBtn = this._uiRenderer.chatButtonBounds;
              
              const hitSwitchBtn = x >= switchBtn.x && x <= switchBtn.x + switchBtn.width && 
                                   y >= switchBtn.y && y <= switchBtn.y + switchBtn.height;
              const hitPlayBtn = x >= playBtn.x && x <= playBtn.x + playBtn.width && 
                                 y >= playBtn.y && y <= playBtn.y + playBtn.height;
              const hitMuteBtn = x >= muteBtn.x && x <= muteBtn.x + muteBtn.width && 
                                 y >= muteBtn.y && y <= muteBtn.y + muteBtn.height;
              const hitChatBtn = x >= chatBtn.x && x <= chatBtn.x + chatBtn.width && 
                                 y >= chatBtn.y && y <= chatBtn.y + chatBtn.height;
              
              // Only restart if tapping Play Again button or anywhere that's not a UI button
              // Switch Player is handled by _handleTouch -> _processUIClick
              if (hitPlayBtn || (!hitSwitchBtn && !hitMuteBtn && !hitChatBtn)) {
                this._audioManager.initOnInteraction();
                this.restart();
              }
            }
          }
          break;
      }

      this._inputHandler.resetFrame();
    } catch (e) {
      console.error('Game update error:', e);
      // Attempt to transition to gameover for error recovery
      if (this._state === 'running') {
        this._state = 'gameover';
        this._gameOverTimestamp = Date.now();
      }
    }
  }

  /**
   * Render the current frame. Always renders (different content based on state).
   * Called by the game loop each frame.
   */
  render() {
    try {
      const ctx = this._ctx;
      const isNight = this._backgroundRenderer.isNight;

      // Ensure smooth rendering
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // On start screen, clear with transparent to show video background
      if (this._state === 'ready') {
        ctx.clearRect(0, 0, this._logicalWidth, this._logicalHeight);
      } else {
        // Clear and draw background (no ctx.filter — colors handled per-component)
        this._backgroundRenderer.render(ctx);
      }

      // Only render game elements when not on start screen
      if (this._state !== 'ready') {
        // Ground
        this._groundRenderer.render(ctx, this._spriteManager, isNight);

        // Obstacles
        this._obstacleManager.render(ctx, this._spriteManager, isNight);

        // Coins
        this._coinManager.render(ctx, isNight);

        // Projectiles (arrows)
        this._projectileManager.render(ctx, isNight);

        // Player
        this._player.render(ctx, isNight);
      }

      // UI (always on top)
      this._uiRenderer.renderMuteButton(ctx, this._audioManager.isMuted, isNight);
      this._uiRenderer.renderChatButton(ctx, this._chatManager.unreadCount, isNight);

      switch (this._state) {
        case 'ready':
          this._uiRenderer.renderStartScreen(ctx, isNight, this._spriteManager);
          break;
        case 'running':
        case 'paused':
          this._uiRenderer.renderHUD(
            ctx,
            this._scoreSystem.displayScore,
            this._scoreSystem.displayHighScore,
            this._scoreSystem.isMilestoneFlashing,
            isNight,
            this._coinManager.collected,
            this._coinManager.trumpCardActive,
            this._coinManager.trumpCardTimeRemaining,
            this._coinManager.einsteinCardActive,
            this._coinManager.einsteinCardTimeRemaining
          );
          // Render card collection popups
          this._uiRenderer.renderPopups(ctx);
          if (this._state === 'paused') {
            this._uiRenderer.renderPauseOverlay(ctx);
          }
          break;
        case 'gameover':
          this._uiRenderer.renderHUD(
            ctx,
            this._scoreSystem.displayScore,
            this._scoreSystem.displayHighScore,
            false,
            isNight,
            this._coinManager.collected
          );
          this._uiRenderer.renderGameOver(ctx, this._scoreSystem.displayScore, isNight, this._coinManager.collected);
          break;
      }
    } catch (e) {
      console.error('Game render error:', e);
    }
  }

  /** @private */
  _updateRunning(deltaTime) {
    // Check pause
    if (this._inputHandler.pausePressed) {
      this.pause();
      return;
    }

    // Player input
    if (this._inputHandler.jumpPressed) {
      this._player.jump();
      this._audioManager.play('jump');
    }
    if (this._inputHandler.duckHeld) {
      this._player.duck();
    } else {
      this._player.releaseDuck();
    }

    // Update difficulty
    this._difficultyManager.update(deltaTime, this._scoreSystem.score);
    
    // Apply Einstein Card slow motion effect to game speed
    const baseSpeed = this._difficultyManager.gameSpeed;
    const speedMultiplier = this._coinManager.speedMultiplier;
    const speed = baseSpeed * speedMultiplier;

    // Update player
    this._player.update(deltaTime);

    // Update obstacles
    this._obstacleManager.update(
      deltaTime,
      speed,
      this._scoreSystem.score,
      this._difficultyManager.aerialObstaclesEnabled,
      this._difficultyManager.spawnIntervalRange
    );

    // Check collisions with obstacles
    // In ghost mode, player is fully invincible - skip all obstacle collisions
    const isGhostMode = this._coinManager.isGhostMode;
    
    if (!isGhostMode) {
      const collision = CollisionDetector.checkAllCollisions(
        this._player.hitbox,
        this._obstacleManager.activeObstacles
      );
      if (collision) {
        this.gameOver();
        return;
      }
    }

    // Check for cactus-group obstacles and maybe shoot projectiles
    for (const obstacle of this._obstacleManager.activeObstacles) {
      if (obstacle.type === 'ground_group' && obstacle.x < this._logicalWidth * 0.8) {
        // Shooting chance increases with score (27% base + 0.5% per 1000 score)
        this._projectileManager.maybeShoot(obstacle);
      }
    }

    // Update projectiles (pass penny count and score for adjustments)
    this._projectileManager.updatePennies(this._coinManager.collected);
    this._projectileManager.updateScore(this._scoreSystem.score);
    this._projectileManager.update(deltaTime, speed);

    // Check projectile collisions (skip if ghost mode - full invincibility)
    if (!isGhostMode && this._projectileManager.checkCollision(this._player.hitbox)) {
      this.gameOver();
      return;
    }

    // Update score
    const distance = speed * deltaTime;
    const milestone = this._scoreSystem.update(distance, deltaTime);
    if (milestone) {
      this._audioManager.play('milestone');
    }

    // Update coins
    this._coinManager.update(deltaTime, speed, this._player.hitbox);

    // Update ghost mode on player
    this._player.setGhostMode(this._coinManager.isGhostMode);

    // Check if Trump Card was just collected - switch music and show popup
    if (this._coinManager.trumpCardJustCollected) {
      this._audioManager.startTrumpCardBgm();
      this._uiRenderer.showCardPopup('trump');
    }

    // Check if Bigstin Card was just collected - switch music and show popup
    if (this._coinManager.einsteinCardJustCollected) {
      this._audioManager.startBigstinCardBgm();
      this._uiRenderer.showCardPopup('bigstin');
    }

    // Check if Trump Card effect just ended - switch back to normal music
    if (!this._coinManager.trumpCardActive && this._audioManager._isTrumpCardActive) {
      this._audioManager.stopTrumpCardBgm();
    }

    // Check if Bigstin Card effect just ended - switch back to appropriate music
    if (!this._coinManager.einsteinCardActive && this._audioManager._isBigstinCardActive) {
      this._audioManager.stopBigstinCardBgm();
    }

    // Update renderers
    this._groundRenderer.update(deltaTime, speed);
    this._backgroundRenderer.update(deltaTime, speed, this._scoreSystem.score);
    
    // Update UI popups
    this._uiRenderer.updatePopups(deltaTime);
  }

  /** @private */
  _handleClick(e) {
    const rect = this._canvas.getBoundingClientRect();
    const scaleX = this._logicalWidth / rect.width;
    const scaleY = this._logicalHeight / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    this._processUIClick(x, y);
  }

  /** @private - Handle touch events for UI buttons on mobile */
  _handleTouch(e) {
    if (e.changedTouches.length === 0) return;
    
    const touch = e.changedTouches[0];
    const rect = this._canvas.getBoundingClientRect();
    const scaleX = this._logicalWidth / rect.width;
    const scaleY = this._logicalHeight / rect.height;
    const x = (touch.clientX - rect.left) * scaleX;
    const y = (touch.clientY - rect.top) * scaleY;

    // Check if touch was on a UI button
    if (this._processUIClick(x, y)) {
      // Clear jump/start flags since this was a UI button tap
      this._inputHandler._jumpPressed = false;
      this._inputHandler._startPressed = false;
      e.preventDefault();
      e.stopPropagation();
    }
  }

  /** @private - Process UI button clicks/touches, returns true if a button was hit */
  _processUIClick(x, y) {
    // Mute button
    const btn = this._uiRenderer.muteButtonBounds;
    if (x >= btn.x && x <= btn.x + btn.width && y >= btn.y && y <= btn.y + btn.height) {
      this._audioManager.toggleMute();
      return true;
    }

    // Chat button
    const chatBtn = this._uiRenderer.chatButtonBounds;
    if (x >= chatBtn.x && x <= chatBtn.x + chatBtn.width && y >= chatBtn.y && y <= chatBtn.y + chatBtn.height) {
      this._chatManager.toggle();
      return true;
    }

    // Character selection arrows (only in ready state)
    if (this._state === 'ready') {
      const leftArrow = this._uiRenderer.leftArrowBounds;
      if (x >= leftArrow.x && x <= leftArrow.x + leftArrow.width && 
          y >= leftArrow.y && y <= leftArrow.y + leftArrow.height) {
        this._uiRenderer.selectPrevCharacter();
        this._player.setCharacter(this._uiRenderer.selectedCharacterId);
        return true;
      }
      
      const rightArrow = this._uiRenderer.rightArrowBounds;
      if (x >= rightArrow.x && x <= rightArrow.x + rightArrow.width && 
          y >= rightArrow.y && y <= rightArrow.y + rightArrow.height) {
        this._uiRenderer.selectNextCharacter();
        this._player.setCharacter(this._uiRenderer.selectedCharacterId);
        return true;
      }
    }

    // Play Again button (only in gameover state)
    if (this._state === 'gameover') {
      // Switch Player button
      const switchBtn = this._uiRenderer.switchPlayerBounds;
      if (x >= switchBtn.x && x <= switchBtn.x + switchBtn.width && 
          y >= switchBtn.y && y <= switchBtn.y + switchBtn.height) {
        this._uiRenderer.selectNextCharacter();
        this._player.setCharacter(this._uiRenderer.selectedCharacterId);
        return true;
      }

      // Play Again button
      const playBtn = this._uiRenderer.playAgainBounds;
      if (x >= playBtn.x && x <= playBtn.x + playBtn.width && y >= playBtn.y && y <= playBtn.y + playBtn.height) {
        const elapsed = Date.now() - this._gameOverTimestamp;
        if (elapsed >= CONFIG.timing.restartDelay) {
          this._audioManager.initOnInteraction();
          this.restart();
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Update canvas dimensions on resize.
   * @param {number} width - New canvas width.
   * @param {number} height - New canvas height.
   */
  resize(width, height) {
    this._logicalWidth = width;
    this._logicalHeight = height;
    
    // Re-detect mobile on resize (orientation change)
    this._isMobile = this._detectMobile();
    
    // Adjust ground position based on device type
    const groundPercent = this._isMobile ? 0.68 : 0.65;
    this._groundY = Math.round(height * groundPercent);
    
    this._player.setGroundY(this._groundY);
    this._obstacleManager.resize(width, this._groundY);
    this._coinManager.resize(width, this._groundY);
    this._projectileManager.resize(width, this._groundY);
    this._groundRenderer.resize(width, this._groundY);
    this._backgroundRenderer.resize(width, height);
    this._uiRenderer.resize(width, height);
  }

  /**
   * Detect if the device is mobile based on screen size and touch capability.
   * @returns {boolean} True if mobile device.
   */
  _detectMobile() {
    // Check for touch capability
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    // Check screen size (mobile typically < 768px width or portrait orientation)
    const isSmallScreen = window.innerWidth < 768;
    const isPortrait = window.innerHeight > window.innerWidth;
    
    // Consider mobile if: has touch AND (small screen OR portrait orientation)
    return hasTouch && (isSmallScreen || isPortrait);
  }
}
