import { CONFIG } from './config.js';

export class Player {
  constructor(spriteManager, scale = 1.0) {
    this._spriteManager = spriteManager;
    this._config = CONFIG.player;
    this._scale = scale;  // Mobile scale factor
    this._x = this._config.x;
    this._groundY = 0; // set during init
    this._y = 0;
    this._vy = 0;
    // Apply scale to dimensions
    this._width = Math.round(this._config.width * scale);
    this._height = Math.round(this._config.height * scale);
    this._baseWidth = this._width;
    this._baseHeight = this._height;
    this._state = 'running'; // running, jumping, ducking, fastFalling
    this._animFrame = 0;
    this._animTimer = 0;
    
    // Character selection
    this._selectedCharacterId = 'player1'; // Default character
    
    // Ghost mode
    this._isGhostMode = false;

    // GIF overlay element for player4
    this._gifElement = document.getElementById('player4-gif');
    this._useGifOverlay = false;
    this._currentGifSrc = '';

    // Physics - scale jump height
    const peakHeight = this._config.jumpPeakHeight * scale;
    const halfDuration = this._config.jumpDuration / 2;
    this._jumpVelocity = -(2 * peakHeight) / halfDuration;
    this._gravity = (2 * peakHeight) / (halfDuration * halfDuration);
  }

  get x() { return this._x; }
  get y() { return this._y; }
  get width() { return this._width; }
  get height() { return this._height; }
  get state() { return this._state; }
  get selectedCharacterId() { return this._selectedCharacterId; }
  get isGhostMode() { return this._isGhostMode; }

  setGhostMode(enabled) {
    this._isGhostMode = enabled;
  }

  setCharacter(characterId) {
    this._selectedCharacterId = characterId;
    
    // Check if this character uses GIF (player4)
    this._useGifOverlay = (characterId === 'player4');
    
    // Hide GIF overlay if not using it
    if (!this._useGifOverlay && this._gifElement) {
      this._gifElement.classList.add('hidden');
    }
  }

  get hitbox() {
    const inset = this._config.hitboxInset;
    return {
      x: this._x + this._width * inset,
      y: this._y + this._height * inset,
      width: this._width * (1 - 2 * inset),
      height: this._height * (1 - 2 * inset)
    };
  }

  get isGrounded() {
    return this._y + this._height >= this._groundY;
  }

  setGroundY(groundY) {
    this._groundY = groundY;
    // Position player so feet touch the ground line
    // Add small offset to account for sprite padding/visual alignment
    this._y = groundY - this._config.height + 5;
  }

  jump() {
    if (!this.isGrounded) return;
    if (this._state === 'ducking') {
      this._height = this._baseHeight;
      this._y = this._groundY - this._height + 5;
    }
    this._state = 'jumping';
    this._vy = this._jumpVelocity;
  }

  duck() {
    if (this.isGrounded) {
      this._state = 'ducking';
      this._height = Math.round(this._config.duckHeight * this._scale);
      // Position duck sprite so feet stay on ground
      this._y = this._groundY - this._height + 5;
      this._width = Math.round(this._config.width * this._scale * 1.2); // wider when ducking
    } else {
      // Fast fall
      this._state = 'fastFalling';
    }
  }

  releaseDuck() {
    if (this._state === 'ducking') {
      this._state = 'running';
      this._height = this._baseHeight;
      this._width = this._baseWidth;
      this._y = this._groundY - this._height + 5;
    }
  }

  update(deltaTime) {
    // Animation - cycle through frames
    this._animTimer += deltaTime;
    if (this._animTimer >= this._config.animationSpeed) {
      this._animTimer = 0;
      // Get the sprite to know how many frames it has
      const sprite = this._getSprite();
      const frameCount = (sprite && sprite.frameCount) ? sprite.frameCount : 2;
      this._animFrame = (this._animFrame + 1) % frameCount;
    }

    // Physics for jumping/falling
    if (this._state === 'jumping' || this._state === 'fastFalling') {
      const gravityMultiplier = this._state === 'fastFalling' ? 2 : 1;
      this._vy += this._gravity * gravityMultiplier * deltaTime;
      this._y += this._vy * deltaTime;

      // Land
      if (this._y + this._height >= this._groundY) {
        this._y = this._groundY - this._baseHeight + 5;
        this._height = this._baseHeight;
        this._width = this._baseWidth;
        this._vy = 0;
        this._state = 'running';
      }
    }
  }

  render(ctx, isNight = false) {
    const sprite = this._getSprite();

    // Animation effects - bob when running, completely stable when ducking/jumping
    let renderY = this._y;
    if (this._state === 'running') {
      // Bob up and down by 3 pixels for running animation
      renderY = this._y - (this._animFrame % 2) * 3;
    }
    // Ducking: completely stable, no movement at all

    // Ghost mode visual effects
    if (this._isGhostMode) {
      ctx.save();
      
      // Ghostly glow effect
      ctx.shadowColor = '#9c27b0';
      ctx.shadowBlur = 20;
      
      // Semi-transparent + pulsing opacity
      const pulse = 0.4 + Math.sin(Date.now() / 150) * 0.15;
      ctx.globalAlpha = pulse;
    }

    // Check if we should use GIF overlay for player4
    if (this._useGifOverlay && this._gifElement && this._selectedCharacterId === 'player4') {
      // Determine which GIF to show based on state
      let gifSrc = '';
      if (this._state === 'ducking') {
        gifSrc = 'assets/sprites/player4-duck.gif';
      } else if (this._state === 'jumping' || this._state === 'fastFalling') {
        // Use PNG for jump (not animated)
        gifSrc = '';
      } else {
        gifSrc = 'assets/sprites/player4-run.gif';
      }
      
      // Update GIF source if changed
      if (gifSrc && gifSrc !== this._currentGifSrc) {
        this._gifElement.src = gifSrc;
        this._currentGifSrc = gifSrc;
      }
      
      // Position and show the GIF overlay
      if (gifSrc) {
        // Get canvas position and scale
        // Use logical dimensions (not canvas.width which includes DPR scaling)
        const canvas = ctx.canvas;
        const rect = canvas.getBoundingClientRect();
        
        // Calculate position
        let gifX = this._x;
        let gifY = renderY;
        let gifWidth = this._width;
        let gifHeight = this._height;
        
        // Adjust for ducking - apply mobile scale
        if (this._state === 'ducking') {
          gifWidth = this._config.width * this._scale * 1.3;
          gifHeight = this._config.duckHeight * this._scale;
          gifX = this._x - (gifWidth - this._width) / 2;
          gifY = this._groundY - gifHeight;
        }
        
        // Calculate scale from canvas logical size to screen size
        // canvas.width/height are the logical dimensions set in main.js
        const canvasLogicalWidth = canvas.width / (window.devicePixelRatio || 1);
        const canvasLogicalHeight = canvas.height / (window.devicePixelRatio || 1);
        const displayScaleX = rect.width / canvasLogicalWidth;
        const displayScaleY = rect.height / canvasLogicalHeight;
        
        // Apply canvas scale to get screen position (add +5 offset for ground alignment)
        this._gifElement.style.left = (rect.left + gifX * displayScaleX) + 'px';
        this._gifElement.style.top = (rect.top + (gifY + 5) * displayScaleY) + 'px';
        this._gifElement.style.width = (gifWidth * displayScaleX) + 'px';
        this._gifElement.style.height = (gifHeight * displayScaleY) + 'px';
        
        // Apply ghost mode effects
        if (this._isGhostMode) {
          const pulse = 0.4 + Math.sin(Date.now() / 150) * 0.15;
          this._gifElement.style.opacity = pulse;
          this._gifElement.style.filter = 'drop-shadow(0 0 20px #9c27b0)';
        } else {
          this._gifElement.style.opacity = '1';
          this._gifElement.style.filter = 'none';
        }
        
        this._gifElement.classList.remove('hidden');
        
        // Restore context if ghost mode was active
        if (this._isGhostMode) {
          ctx.restore();
          
          // Draw ghost trail/afterimage effect
          ctx.save();
          ctx.globalAlpha = 0.15;
          ctx.fillStyle = '#9c27b0';
          ctx.beginPath();
          ctx.ellipse(this._x + this._width / 2 - 15, renderY + this._height / 2, this._width * 0.4, this._height * 0.3, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
        
        return; // Don't draw on canvas, using GIF overlay
      } else {
        // Hide GIF for jump state, draw PNG on canvas
        this._gifElement.classList.add('hidden');
      }
    } else if (this._gifElement) {
      // Hide GIF overlay for other characters
      this._gifElement.classList.add('hidden');
    }

    if (sprite && sprite.image) {
      // Handle GIF animations (fallback if overlay not used)
      if (sprite.isGif && sprite.gifKey) {
        const currentTime = Date.now();
        const gifFrame = this._spriteManager.getGifFrame(sprite.gifKey, currentTime);
        if (gifFrame) {
          // For ducking state with GIF - squash the sprite (apply mobile scale)
          if (this._state === 'ducking') {
            const duckWidth = this._config.width * this._scale * 1.3;
            const duckHeight = this._config.duckHeight * this._scale;
            const duckX = this._x - (duckWidth - this._width) / 2;
            const duckY = this._groundY - duckHeight;
            ctx.drawImage(gifFrame, duckX, duckY, duckWidth, duckHeight);
          } else {
            ctx.drawImage(gifFrame, this._x, renderY, this._width, this._height);
          }
        } else {
          // Fallback to static image
          ctx.drawImage(sprite.image, this._x, renderY, this._width, this._height);
        }
      }
      // For ducking state - use run sprite but squashed down
      else if (this._state === 'ducking') {
        // Get the run sprite instead of duck sprite
        const runSprite = this._spriteManager.getSpriteSheet(`${this._selectedCharacterId}_run`) ||
                          this._spriteManager.getSpriteSheet('player_run') ||
                          this._spriteManager.getSprite(`${this._selectedCharacterId}_run`) ||
                          this._spriteManager.getSprite('player_run');
        
        if (runSprite && runSprite.image) {
          // Draw run sprite squashed (shorter height, wider width) - apply mobile scale
          const duckWidth = this._config.width * this._scale * 1.3;
          const duckHeight = this._config.duckHeight * this._scale;
          const duckX = this._x - (duckWidth - this._width) / 2; // Center it
          const duckY = this._groundY - duckHeight; // Feet on ground
          
          if (runSprite.frameWidth && runSprite.frameCount && runSprite.frameCount > 1) {
            const frameIndex = this._animFrame % runSprite.frameCount;
            const sx = frameIndex * runSprite.frameWidth;
            ctx.drawImage(
              runSprite.image,
              sx, 0,
              runSprite.frameWidth, runSprite.frameHeight,
              duckX, duckY,
              duckWidth, duckHeight
            );
          } else {
            ctx.drawImage(runSprite.image, duckX, duckY, duckWidth, duckHeight);
          }
        } else {
          // Fallback to original duck sprite
          ctx.drawImage(sprite.image, this._x, renderY, this._width, this._height);
        }
      }
      // Check if this is a sprite sheet (has frameWidth and frameCount)
      else if (sprite.frameWidth && sprite.frameCount && sprite.frameCount > 1) {
        // Calculate source x position based on current animation frame
        const frameIndex = this._animFrame % sprite.frameCount;
        const sx = frameIndex * sprite.frameWidth;
        
        // Draw only the current frame from the sprite sheet
        ctx.drawImage(
          sprite.image,
          sx, 0,                           // Source x, y (crop position)
          sprite.frameWidth, sprite.frameHeight, // Source width, height (crop size)
          this._x, renderY,                // Destination x, y
          this._width, this._height        // Destination width, height
        );
      } else {
        // Single frame sprite - draw entire image
        ctx.drawImage(sprite.image, this._x, renderY, this._width, this._height);
      }
    } else {
      // Fallback - draw character programmatically based on selected character
      this._drawFallbackCharacter(ctx, this._x, renderY, this._width, this._height, isNight);
    }

    // Restore context if ghost mode was active
    if (this._isGhostMode) {
      ctx.restore();
      
      // Draw ghost trail/afterimage effect
      ctx.save();
      ctx.globalAlpha = 0.15;
      ctx.fillStyle = '#9c27b0';
      ctx.beginPath();
      ctx.ellipse(this._x + this._width / 2 - 15, renderY + this._height / 2, this._width * 0.4, this._height * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  /**
   * Draw a fallback character when sprite isn't available
   */
  _drawFallbackCharacter(ctx, x, y, w, h, isNight) {
    const charId = this._selectedCharacterId;
    
    if (charId === 'player2') {
      // Jewgoblin - Green goblin
      this._drawSpeedyCharacter(ctx, x, y, w, h, isNight);
    } else if (charId === 'player3') {
      // Jewman - Victorian gentleman
      this._drawTankCharacter(ctx, x, y, w, h, isNight);
    } else if (charId === 'player4') {
      // Big Yahu - draw a distinct character
      this._drawBigYahuCharacter(ctx, x, y, w, h, isNight);
    } else {
      // Default dino shape (green) - Jewasaur
      this._drawDefaultCharacter(ctx, x, y, w, h, isNight);
    }
  }

  _drawDefaultCharacter(ctx, x, y, w, h, isNight) {
    const color = isNight ? '#7cb342' : '#4caf50';
    const darkColor = isNight ? '#558b2f' : '#388e3c';
    
    // Body
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(x + w * 0.1, y + h * 0.3, w * 0.6, h * 0.6, 8);
    ctx.fill();
    
    // Head
    ctx.beginPath();
    ctx.roundRect(x + w * 0.4, y + h * 0.05, w * 0.55, h * 0.4, 6);
    ctx.fill();
    
    // Eye
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(x + w * 0.75, y + h * 0.2, w * 0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(x + w * 0.77, y + h * 0.2, w * 0.04, 0, Math.PI * 2);
    ctx.fill();
    
    // Legs (animated)
    ctx.fillStyle = darkColor;
    const legOffset = this._animFrame % 2 === 0 ? 5 : -5;
    ctx.fillRect(x + w * 0.2 + legOffset, y + h * 0.85, w * 0.15, h * 0.15);
    ctx.fillRect(x + w * 0.45 - legOffset, y + h * 0.85, w * 0.15, h * 0.15);
    
    // Tail
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x + w * 0.1, y + h * 0.5);
    ctx.lineTo(x - w * 0.1, y + h * 0.4);
    ctx.lineTo(x + w * 0.1, y + h * 0.7);
    ctx.fill();
  }

  _drawSpeedyCharacter(ctx, x, y, w, h, isNight) {
    // Goblin from Clash of Clans - green skin, big ears, yellow eyes
    const skinColor = isNight ? '#4a7c3f' : '#5a9c4a';
    const darkSkin = isNight ? '#3a5c2f' : '#4a7c3a';
    const earColor = isNight ? '#3a6c2f' : '#4a8c3a';
    const clothColor = isNight ? '#8b4513' : '#a0522d'; // brown loincloth
    
    // Body (hunched, goblin-like)
    ctx.fillStyle = skinColor;
    ctx.beginPath();
    ctx.ellipse(x + w * 0.45, y + h * 0.55, w * 0.28, h * 0.3, 0.2, 0, Math.PI * 2);
    ctx.fill();
    
    // Head (large, round)
    ctx.beginPath();
    ctx.ellipse(x + w * 0.55, y + h * 0.25, w * 0.28, h * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Big pointy ears (left)
    ctx.fillStyle = earColor;
    ctx.beginPath();
    ctx.moveTo(x + w * 0.3, y + h * 0.2);
    ctx.lineTo(x + w * 0.1, y + h * 0.05);
    ctx.lineTo(x + w * 0.35, y + h * 0.3);
    ctx.fill();
    
    // Big pointy ears (right)
    ctx.beginPath();
    ctx.moveTo(x + w * 0.75, y + h * 0.2);
    ctx.lineTo(x + w * 0.95, y + h * 0.05);
    ctx.lineTo(x + w * 0.7, y + h * 0.3);
    ctx.fill();
    
    // Inner ear detail
    ctx.fillStyle = darkSkin;
    ctx.beginPath();
    ctx.moveTo(x + w * 0.32, y + h * 0.22);
    ctx.lineTo(x + w * 0.18, y + h * 0.12);
    ctx.lineTo(x + w * 0.35, y + h * 0.28);
    ctx.fill();
    
    // Big yellow eyes (left)
    ctx.fillStyle = '#ffeb3b';
    ctx.beginPath();
    ctx.ellipse(x + w * 0.45, y + h * 0.22, w * 0.1, h * 0.08, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Big yellow eyes (right)
    ctx.beginPath();
    ctx.ellipse(x + w * 0.65, y + h * 0.22, w * 0.1, h * 0.08, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Pupils
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(x + w * 0.47, y + h * 0.22, w * 0.04, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + w * 0.67, y + h * 0.22, w * 0.04, 0, Math.PI * 2);
    ctx.fill();
    
    // Big nose
    ctx.fillStyle = darkSkin;
    ctx.beginPath();
    ctx.ellipse(x + w * 0.55, y + h * 0.32, w * 0.08, h * 0.06, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Wide grin
    ctx.strokeStyle = '#2d1f1f';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x + w * 0.55, y + h * 0.35, w * 0.12, 0.2, Math.PI - 0.2);
    ctx.stroke();
    
    // Brown loincloth
    ctx.fillStyle = clothColor;
    ctx.beginPath();
    ctx.moveTo(x + w * 0.25, y + h * 0.7);
    ctx.lineTo(x + w * 0.65, y + h * 0.7);
    ctx.lineTo(x + w * 0.6, y + h * 0.85);
    ctx.lineTo(x + w * 0.3, y + h * 0.85);
    ctx.fill();
    
    // Animated legs
    const legOffset = this._animFrame % 2 === 0 ? 6 : -6;
    ctx.fillStyle = skinColor;
    ctx.fillRect(x + w * 0.3 + legOffset, y + h * 0.82, w * 0.12, h * 0.18);
    ctx.fillRect(x + w * 0.5 - legOffset, y + h * 0.82, w * 0.12, h * 0.18);
    
    // Feet
    ctx.fillStyle = darkSkin;
    ctx.beginPath();
    ctx.ellipse(x + w * 0.36 + legOffset, y + h * 0.98, w * 0.1, h * 0.04, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + w * 0.56 - legOffset, y + h * 0.98, w * 0.1, h * 0.04, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  _drawTankCharacter(ctx, x, y, w, h, isNight) {
    // Victorian Gentleman - top hat, long face, big nose, formal attire
    const skinColor = isNight ? '#c9b8a8' : '#e0d0c0';
    const skinDark = isNight ? '#a89888' : '#c0b0a0';
    const hatColor = isNight ? '#1a1a1a' : '#0a0a0a'; // black top hat
    const suitColor = isNight ? '#2a2a2a' : '#1a1a1a'; // dark suit/coat
    const shirtColor = isNight ? '#d0d0d0' : '#f5f5f5'; // white shirt/cravat
    const outlineColor = isNight ? '#333' : '#222';
    
    // Top Hat - tall cylinder
    ctx.fillStyle = hatColor;
    // Hat brim
    ctx.beginPath();
    ctx.ellipse(x + w * 0.5, y + h * 0.18, w * 0.32, h * 0.04, 0, 0, Math.PI * 2);
    ctx.fill();
    // Hat cylinder (tall)
    ctx.beginPath();
    ctx.roundRect(x + w * 0.25, y - h * 0.05, w * 0.5, h * 0.24, 3);
    ctx.fill();
    // Hat top
    ctx.beginPath();
    ctx.ellipse(x + w * 0.5, y - h * 0.04, w * 0.25, h * 0.03, 0, 0, Math.PI * 2);
    ctx.fill();
    // Hat band
    ctx.fillStyle = '#4a4a4a';
    ctx.fillRect(x + w * 0.25, y + h * 0.12, w * 0.5, h * 0.04);
    
    // Long angular face
    ctx.fillStyle = skinColor;
    ctx.beginPath();
    ctx.moveTo(x + w * 0.35, y + h * 0.2);
    ctx.lineTo(x + w * 0.65, y + h * 0.2);
    ctx.lineTo(x + w * 0.62, y + h * 0.42);
    ctx.lineTo(x + w * 0.5, y + h * 0.48);
    ctx.lineTo(x + w * 0.38, y + h * 0.42);
    ctx.closePath();
    ctx.fill();
    
    // Big pointy nose
    ctx.fillStyle = skinDark;
    ctx.beginPath();
    ctx.moveTo(x + w * 0.48, y + h * 0.28);
    ctx.lineTo(x + w * 0.58, y + h * 0.38);
    ctx.lineTo(x + w * 0.48, y + h * 0.38);
    ctx.closePath();
    ctx.fill();
    
    // Stern eyes - angular, slightly narrowed
    ctx.fillStyle = '#fffff0';
    // Left eye
    ctx.beginPath();
    ctx.moveTo(x + w * 0.36, y + h * 0.28);
    ctx.lineTo(x + w * 0.46, y + h * 0.26);
    ctx.lineTo(x + w * 0.46, y + h * 0.32);
    ctx.lineTo(x + w * 0.36, y + h * 0.30);
    ctx.closePath();
    ctx.fill();
    // Right eye
    ctx.beginPath();
    ctx.moveTo(x + w * 0.54, y + h * 0.26);
    ctx.lineTo(x + w * 0.64, y + h * 0.28);
    ctx.lineTo(x + w * 0.64, y + h * 0.30);
    ctx.lineTo(x + w * 0.54, y + h * 0.32);
    ctx.closePath();
    ctx.fill();
    
    // Pupils (looking forward sternly)
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(x + w * 0.42, y + h * 0.29, w * 0.025, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + w * 0.58, y + h * 0.29, w * 0.025, 0, Math.PI * 2);
    ctx.fill();
    
    // Furrowed brows
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + w * 0.34, y + h * 0.26);
    ctx.lineTo(x + w * 0.46, y + h * 0.24);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + w * 0.54, y + h * 0.24);
    ctx.lineTo(x + w * 0.66, y + h * 0.26);
    ctx.stroke();
    
    // Frowning mouth
    ctx.strokeStyle = '#5a4a4a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + w * 0.42, y + h * 0.42);
    ctx.lineTo(x + w * 0.52, y + h * 0.44);
    ctx.stroke();
    
    // White cravat/collar
    ctx.fillStyle = shirtColor;
    ctx.beginPath();
    ctx.moveTo(x + w * 0.38, y + h * 0.46);
    ctx.lineTo(x + w * 0.62, y + h * 0.46);
    ctx.lineTo(x + w * 0.58, y + h * 0.58);
    ctx.lineTo(x + w * 0.5, y + h * 0.62);
    ctx.lineTo(x + w * 0.42, y + h * 0.58);
    ctx.closePath();
    ctx.fill();
    
    // Dark coat/suit body
    ctx.fillStyle = suitColor;
    ctx.beginPath();
    ctx.roundRect(x + w * 0.2, y + h * 0.5, w * 0.6, h * 0.35, 4);
    ctx.fill();
    
    // Coat tails / vertical stripes detail
    ctx.strokeStyle = '#3a3a3a';
    ctx.lineWidth = 1;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(x + w * (0.3 + i * 0.1), y + h * 0.55);
      ctx.lineTo(x + w * (0.3 + i * 0.1), y + h * 0.82);
      ctx.stroke();
    }
    
    // Animated legs (thin, formal)
    const legOffset = this._animFrame % 2 === 0 ? 4 : -4;
    ctx.fillStyle = suitColor;
    ctx.fillRect(x + w * 0.28 + legOffset, y + h * 0.82, w * 0.14, h * 0.18);
    ctx.fillRect(x + w * 0.52 - legOffset, y + h * 0.82, w * 0.14, h * 0.18);
    
    // Fancy shoes
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.ellipse(x + w * 0.35 + legOffset, y + h * 0.98, w * 0.1, h * 0.035, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + w * 0.59 - legOffset, y + h * 0.98, w * 0.1, h * 0.035, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  _drawBigYahuCharacter(ctx, x, y, w, h, isNight) {
    // Big Yahu - A large, imposing character with distinct features
    const skinColor = isNight ? '#d4a574' : '#e8c49a';
    const skinDark = isNight ? '#b8956a' : '#d4a574';
    const robeColor = isNight ? '#1a237e' : '#283593'; // deep blue robe
    const goldColor = isNight ? '#c9a227' : '#ffd700'; // gold accents
    const beardColor = isNight ? '#4a4a4a' : '#2a2a2a'; // dark beard
    
    // Large body/robe
    ctx.fillStyle = robeColor;
    ctx.beginPath();
    ctx.roundRect(x + w * 0.15, y + h * 0.35, w * 0.7, h * 0.55, 8);
    ctx.fill();
    
    // Gold trim on robe
    ctx.strokeStyle = goldColor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x + w * 0.5, y + h * 0.35);
    ctx.lineTo(x + w * 0.5, y + h * 0.85);
    ctx.stroke();
    
    // Large round head
    ctx.fillStyle = skinColor;
    ctx.beginPath();
    ctx.ellipse(x + w * 0.5, y + h * 0.22, w * 0.28, h * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Big bushy beard
    ctx.fillStyle = beardColor;
    ctx.beginPath();
    ctx.moveTo(x + w * 0.25, y + h * 0.28);
    ctx.quadraticCurveTo(x + w * 0.5, y + h * 0.55, x + w * 0.75, y + h * 0.28);
    ctx.lineTo(x + w * 0.7, y + h * 0.22);
    ctx.quadraticCurveTo(x + w * 0.5, y + h * 0.35, x + w * 0.3, y + h * 0.22);
    ctx.closePath();
    ctx.fill();
    
    // Eyes
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.ellipse(x + w * 0.4, y + h * 0.18, w * 0.08, h * 0.06, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + w * 0.6, y + h * 0.18, w * 0.08, h * 0.06, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Pupils
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(x + w * 0.42, y + h * 0.18, w * 0.035, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + w * 0.62, y + h * 0.18, w * 0.035, 0, Math.PI * 2);
    ctx.fill();
    
    // Thick eyebrows
    ctx.fillStyle = beardColor;
    ctx.fillRect(x + w * 0.32, y + h * 0.1, w * 0.16, h * 0.04);
    ctx.fillRect(x + w * 0.52, y + h * 0.1, w * 0.16, h * 0.04);
    
    // Big nose
    ctx.fillStyle = skinDark;
    ctx.beginPath();
    ctx.ellipse(x + w * 0.5, y + h * 0.24, w * 0.06, h * 0.05, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Gold medallion/pendant
    ctx.fillStyle = goldColor;
    ctx.beginPath();
    ctx.arc(x + w * 0.5, y + h * 0.42, w * 0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = robeColor;
    ctx.beginPath();
    ctx.arc(x + w * 0.5, y + h * 0.42, w * 0.04, 0, Math.PI * 2);
    ctx.fill();
    
    // Animated legs (under robe)
    const legOffset = this._animFrame % 2 === 0 ? 5 : -5;
    ctx.fillStyle = skinDark;
    ctx.fillRect(x + w * 0.3 + legOffset, y + h * 0.85, w * 0.15, h * 0.15);
    ctx.fillRect(x + w * 0.55 - legOffset, y + h * 0.85, w * 0.15, h * 0.15);
    
    // Sandals
    ctx.fillStyle = '#8b4513';
    ctx.beginPath();
    ctx.ellipse(x + w * 0.375 + legOffset, y + h * 0.98, w * 0.1, h * 0.035, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + w * 0.625 - legOffset, y + h * 0.98, w * 0.1, h * 0.035, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  _getSprite() {
    if (!this._spriteManager) return null;
    const charId = this._selectedCharacterId;
    
    switch (this._state) {
      case 'jumping':
      case 'fastFalling':
        // Try GIF first, then selected character sprite
        const jumpGif = this._spriteManager.getGifAnimation(`${charId}_jump`);
        if (jumpGif && jumpGif.frames && jumpGif.frames[0]) {
          return { image: jumpGif.frames[0], isGif: true, gifKey: `${charId}_jump` };
        }
        // Try character-specific sprite
        const jumpSprite = this._spriteManager.getSprite(`${charId}_jump`);
        if (jumpSprite && jumpSprite.image) {
          return jumpSprite;
        }
        // For player1 and player4, try default sprite
        if (charId === 'player1') {
          return this._spriteManager.getSprite('player_jump');
        }
        return null; // Use fallback drawing for player2/player3
        
      case 'ducking':
        // Try GIF first
        const duckGif = this._spriteManager.getGifAnimation(`${charId}_duck`);
        if (duckGif && duckGif.frames && duckGif.frames[0]) {
          return { 
            image: duckGif.frames[0], 
            isGif: true, 
            gifKey: `${charId}_duck`,
            frameCount: duckGif.frameCount 
          };
        }
        // Try sprite sheet first, then fall back to single sprite
        const duckSheet = this._spriteManager.getSpriteSheet(`${charId}_duck`);
        if (duckSheet && duckSheet.image) return duckSheet;
        const duckSprite = this._spriteManager.getSprite(`${charId}_duck`);
        if (duckSprite && duckSprite.image) return duckSprite;
        // For player1, use default
        if (charId === 'player1') {
          return this._spriteManager.getSpriteSheet('player_duck') ||
                 this._spriteManager.getSprite('player_duck');
        }
        return null; // Use fallback drawing for player2/player3
               
      default:
        // Try GIF first for run animation
        const runGif = this._spriteManager.getGifAnimation(`${charId}_run`);
        if (runGif && runGif.frames && runGif.frames[0]) {
          return { 
            image: runGif.frames[0], 
            isGif: true, 
            gifKey: `${charId}_run`,
            frameCount: runGif.frameCount 
          };
        }
        // Try sprite sheet first, then fall back to single sprite
        const runSheet = this._spriteManager.getSpriteSheet(`${charId}_run`);
        if (runSheet && runSheet.image) return runSheet;
        const runSprite = this._spriteManager.getSprite(`${charId}_run`);
        if (runSprite && runSprite.image) return runSprite;
        // For player1, use default
        if (charId === 'player1') {
          return this._spriteManager.getSpriteSheet('player_run') ||
                 this._spriteManager.getSprite('player_run');
        }
        return null; // Use fallback drawing for player2/player3
    }
  }

  reset() {
    this._state = 'running';
    this._vy = 0;
    this._height = this._baseHeight;
    this._width = this._baseWidth;
    this._y = this._groundY - this._height + 5;
    this._animFrame = 0;
    this._animTimer = 0;
    this._currentGifSrc = ''; // Reset GIF source to force reload
  }
}
