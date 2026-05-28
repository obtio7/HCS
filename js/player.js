import { CONFIG } from './config.js';

export class Player {
  constructor(spriteManager) {
    this._spriteManager = spriteManager;
    this._config = CONFIG.player;
    this._x = this._config.x;
    this._groundY = 0; // set during init
    this._y = 0;
    this._vy = 0;
    this._width = this._config.width;
    this._height = this._config.height;
    this._state = 'running'; // running, jumping, ducking, fastFalling
    this._animFrame = 0;
    this._animTimer = 0;
    
    // Character selection
    this._selectedCharacterId = 'player1'; // Default character

    // Physics
    const peakHeight = this._config.jumpPeakHeight;
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

  setCharacter(characterId) {
    this._selectedCharacterId = characterId;
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
    this._y = groundY - this._config.height;
  }

  jump() {
    if (!this.isGrounded) return;
    if (this._state === 'ducking') {
      this._height = this._config.height;
      this._y = this._groundY - this._height;
    }
    this._state = 'jumping';
    this._vy = this._jumpVelocity;
  }

  duck() {
    if (this.isGrounded) {
      this._state = 'ducking';
      this._height = this._config.duckHeight;
      // Position duck sprite so feet stay on ground
      this._y = this._groundY - this._height;
      this._width = this._config.width * 1.2; // wider when ducking
    } else {
      // Fast fall
      this._state = 'fastFalling';
    }
  }

  releaseDuck() {
    if (this._state === 'ducking') {
      this._state = 'running';
      this._height = this._config.height;
      this._width = this._config.width;
      this._y = this._groundY - this._height;
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
        this._y = this._groundY - this._config.height;
        this._height = this._config.height;
        this._width = this._config.width;
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

    if (sprite && sprite.image) {
      // For ducking state - use run sprite but squashed down
      if (this._state === 'ducking') {
        // Get the run sprite instead of duck sprite
        const runSprite = this._spriteManager.getSpriteSheet(`${this._selectedCharacterId}_run`) ||
                          this._spriteManager.getSpriteSheet('player_run') ||
                          this._spriteManager.getSprite(`${this._selectedCharacterId}_run`) ||
                          this._spriteManager.getSprite('player_run');
        
        if (runSprite && runSprite.image) {
          // Draw run sprite squashed (shorter height, wider width)
          const duckWidth = this._config.width * 1.3;
          const duckHeight = this._config.duckHeight;
          const duckX = this._x - (duckWidth - this._config.width) / 2; // Center it
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
  }

  /**
   * Draw a fallback character when sprite isn't available
   */
  _drawFallbackCharacter(ctx, x, y, w, h, isNight) {
    const charId = this._selectedCharacterId;
    
    if (charId === 'player2') {
      // Speedy - Slim, fast-looking character (blue)
      this._drawSpeedyCharacter(ctx, x, y, w, h, isNight);
    } else if (charId === 'player3') {
      // Tank - Big, bulky character (red/orange)
      this._drawTankCharacter(ctx, x, y, w, h, isNight);
    } else {
      // Default dino shape (green)
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

  _getSprite() {
    if (!this._spriteManager) return null;
    const charId = this._selectedCharacterId;
    
    switch (this._state) {
      case 'jumping':
      case 'fastFalling':
        // Try selected character first, then fallback to default
        return this._spriteManager.getSprite(`${charId}_jump`) || 
               this._spriteManager.getSprite('player_jump');
      case 'ducking':
        // Try sprite sheet first, then fall back to single sprite
        const duckSheet = this._spriteManager.getSpriteSheet(`${charId}_duck`) ||
                          this._spriteManager.getSpriteSheet('player_duck');
        if (duckSheet && duckSheet.image) return duckSheet;
        return this._spriteManager.getSprite(`${charId}_duck`) ||
               this._spriteManager.getSprite('player_duck');
      default:
        // Try sprite sheet first, then fall back to single sprite
        const runSheet = this._spriteManager.getSpriteSheet(`${charId}_run`) ||
                         this._spriteManager.getSpriteSheet('player_run');
        if (runSheet && runSheet.image) return runSheet;
        return this._spriteManager.getSprite(`${charId}_run`) ||
               this._spriteManager.getSprite('player_run');
    }
  }

  reset() {
    this._state = 'running';
    this._vy = 0;
    this._height = this._config.height;
    this._width = this._config.width;
    this._y = this._groundY - this._height;
    this._animFrame = 0;
    this._animTimer = 0;
  }
}
