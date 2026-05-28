import { CONFIG } from './config.js';

export class UIRenderer {
  constructor(canvas, logicalWidth, logicalHeight) {
    this._canvas = canvas;
    this._width = logicalWidth || canvas.width;
    this._height = logicalHeight || canvas.height;
    this._muteButtonBounds = { x: 0, y: 0, width: 30, height: 30 };
    this._playAgainBounds = { x: 0, y: 0, width: 0, height: 0 };
    
    // Character selection
    this._characters = CONFIG.sprites.players || [];
    this._selectedCharacterIndex = 0;
    this._leftArrowBounds = { x: 0, y: 0, width: 0, height: 0 };
    this._rightArrowBounds = { x: 0, y: 0, width: 0, height: 0 };

    // Game over video elements (multiple for random selection)
    this._gameOverVideos = [];
    this._currentVideo = null;
    this._gameOverActive = false;

    this._initGameOverVideos();
  }

  get muteButtonBounds() { return this._muteButtonBounds; }
  get playAgainBounds() { return this._playAgainBounds; }
  get leftArrowBounds() { return this._leftArrowBounds; }
  get rightArrowBounds() { return this._rightArrowBounds; }
  get selectedCharacterId() { 
    return this._characters[this._selectedCharacterIndex]?.id || 'player1'; 
  }
  get selectedCharacterName() {
    return this._characters[this._selectedCharacterIndex]?.name || 'Runner';
  }

  selectPrevCharacter() {
    if (this._characters.length > 0) {
      this._selectedCharacterIndex = (this._selectedCharacterIndex - 1 + this._characters.length) % this._characters.length;
    }
  }

  selectNextCharacter() {
    if (this._characters.length > 0) {
      this._selectedCharacterIndex = (this._selectedCharacterIndex + 1) % this._characters.length;
    }
  }

  _initGameOverVideos() {
    const videos = CONFIG.gameOver?.videos || [];
    
    // Preload all videos
    for (const videoPath of videos) {
      const video = document.createElement('video');
      video.src = videoPath;
      video.loop = true;
      video.muted = true; // muted so it autoplays without issues
      video.playsInline = true;
      video.preload = 'auto';
      
      video._ready = false;
      video.addEventListener('canplay', () => {
        video._ready = true;
      });
      video.addEventListener('error', () => {
        console.warn(`Game over video failed to load: ${videoPath}`);
        video._ready = false;
      });
      
      this._gameOverVideos.push(video);
    }
  }

  /** Call when game over starts — picks a random video and starts it */
  showGameOver() {
    this._gameOverActive = true;
    
    // Filter to only ready videos
    const readyVideos = this._gameOverVideos.filter(v => v._ready);
    
    if (readyVideos.length > 0) {
      // Pick a random video
      const randomIndex = Math.floor(Math.random() * readyVideos.length);
      this._currentVideo = readyVideos[randomIndex];
      this._currentVideo.currentTime = 0;
      this._currentVideo.play().catch(() => {});
    } else {
      this._currentVideo = null;
    }
  }

  /** Call when restarting — stops the video */
  hideGameOver() {
    this._gameOverActive = false;
    if (this._currentVideo) {
      this._currentVideo.pause();
      this._currentVideo.currentTime = 0;
      this._currentVideo = null;
    }
  }

  renderStartScreen(ctx, isNight = false, spriteManager = null) {
    const w = this._width;
    const h = this._height;
    const textColor = isNight ? '#e0e0e0' : '#333333';
    const subColor = isNight ? '#aaaaaa' : '#666666';

    // Title
    ctx.fillStyle = textColor;
    ctx.font = 'bold 24px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('HCS', w / 2, h * 0.15);

    // Character selection area
    const charY = h * 0.45;
    const charBoxW = 120;
    const charBoxH = 100;
    const charBoxX = (w - charBoxW) / 2;
    const charBoxY = charY - charBoxH / 2;

    // Character box background
    ctx.fillStyle = isNight ? 'rgba(60, 60, 80, 0.8)' : 'rgba(240, 240, 240, 0.9)';
    ctx.beginPath();
    ctx.roundRect(charBoxX, charBoxY, charBoxW, charBoxH, 10);
    ctx.fill();
    ctx.strokeStyle = isNight ? '#666' : '#ccc';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw character preview
    const previewSize = 60;
    const previewX = w / 2 - previewSize / 2;
    const previewY = charY - previewSize / 2 - 5;
    
    if (spriteManager && this._characters.length > 0) {
      const charId = this.selectedCharacterId;
      const sprite = spriteManager.getSprite(`${charId}_run`) || 
                     spriteManager.getSpriteSheet(`${charId}_run`) ||
                     spriteManager.getSprite('player_run');
      
      if (sprite && sprite.image) {
        if (sprite.frameWidth) {
          // Sprite sheet - draw first frame
          ctx.drawImage(sprite.image, 0, 0, sprite.frameWidth, sprite.frameHeight,
                        previewX, previewY, previewSize, previewSize);
        } else {
          ctx.drawImage(sprite.image, previewX, previewY, previewSize, previewSize);
        }
      } else {
        // Draw fallback character preview
        this._drawCharacterPreview(ctx, previewX, previewY, previewSize, previewSize, this.selectedCharacterId, isNight);
      }
    } else {
      // Draw fallback character preview
      this._drawCharacterPreview(ctx, previewX, previewY, previewSize, previewSize, this.selectedCharacterId, isNight);
    }

    // Character name
    ctx.fillStyle = textColor;
    ctx.font = 'bold 14px Arial, sans-serif';
    ctx.fillText(this.selectedCharacterName, w / 2, charBoxY + charBoxH - 12);

    // Left arrow
    const arrowSize = 30;
    const arrowY = charY - arrowSize / 2;
    const leftArrowX = charBoxX - arrowSize - 15;
    this._leftArrowBounds = { x: leftArrowX, y: arrowY, width: arrowSize, height: arrowSize };

    ctx.fillStyle = isNight ? '#555' : '#ddd';
    ctx.beginPath();
    ctx.roundRect(leftArrowX, arrowY, arrowSize, arrowSize, 6);
    ctx.fill();
    
    ctx.fillStyle = textColor;
    ctx.font = 'bold 18px Arial, sans-serif';
    ctx.fillText('<', leftArrowX + arrowSize / 2, arrowY + arrowSize / 2);

    // Right arrow
    const rightArrowX = charBoxX + charBoxW + 15;
    this._rightArrowBounds = { x: rightArrowX, y: arrowY, width: arrowSize, height: arrowSize };

    ctx.fillStyle = isNight ? '#555' : '#ddd';
    ctx.beginPath();
    ctx.roundRect(rightArrowX, arrowY, arrowSize, arrowSize, 6);
    ctx.fill();
    
    ctx.fillStyle = textColor;
    ctx.fillText('>', rightArrowX + arrowSize / 2, arrowY + arrowSize / 2);

    // Character counter
    ctx.fillStyle = subColor;
    ctx.font = '11px Arial, sans-serif';
    ctx.fillText(`${this._selectedCharacterIndex + 1} / ${this._characters.length}`, w / 2, charBoxY + charBoxH + 15);

    // Instruction
    ctx.fillStyle = subColor;
    ctx.font = '14px Arial, sans-serif';
    ctx.fillText('Press SPACE or Tap to Start', w / 2, h * 0.78);

    // Controls hint
    ctx.font = '11px Arial, sans-serif';
    ctx.fillStyle = isNight ? '#888' : '#999';
    ctx.fillText('← → to select character', w / 2, h * 0.85);
    ctx.fillText('↑/SPACE = Jump   ↓ = Duck   ESC = Pause', w / 2, h * 0.91);

    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
  }

  renderHUD(ctx, scoreDisplay, highScoreDisplay, isMilestoneFlashing, isNight = false, coins = 0) {
    const w = this._width;
    const textColor = isNight ? '#e0e0e0' : '#333333';
    const subColor = isNight ? '#999999' : '#888888';

    ctx.font = 'bold 14px Arial, sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'alphabetic';

    // Coin count (leftmost)
    ctx.fillStyle = '#ffc107';
    ctx.fillText('\u00A2 ' + coins, w - 170, 24);

    // High score
    ctx.fillStyle = subColor;
    ctx.fillText(highScoreDisplay, w - 90, 24);

    // Current score (with flash effect)
    if (isMilestoneFlashing && Math.floor(Date.now() / 100) % 2 === 0) {
      // Don't draw — creates flash effect
    } else {
      ctx.fillStyle = textColor;
      ctx.fillText(scoreDisplay, w - 15, 24);
    }

    ctx.textAlign = 'left';
  }

  renderGameOver(ctx, scoreDisplay, isNight = false, coins = 0) {
    const w = this._width;
    const h = this._height;

    // Dark overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.fillRect(0, 0, w, h);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Calculate Giga Level (every 5 pennies = 1 level, max 99)
    const gigaLevel = Math.min(99, Math.floor(coins / 5));

    // Layout calculations
    let currentY = h * 0.2;
    const lineSpacing = 35;

    // 1. GAME OVER title
    ctx.fillStyle = '#ff4444';
    ctx.font = 'bold 32px Arial, sans-serif';
    ctx.fillText('GAME OVER', w / 2, currentY);
    currentY += lineSpacing + 15;

    // 2. Penny Collected
    ctx.fillStyle = '#ffc107';
    ctx.font = 'bold 18px Arial, sans-serif';
    ctx.fillText('Penny Collected: ' + coins, w / 2, currentY);
    currentY += lineSpacing;

    // 3. Giga Level with color based on level
    let levelColor = '#ffffff';
    if (gigaLevel >= 50) levelColor = '#ff00ff'; // Purple for 50+
    else if (gigaLevel >= 30) levelColor = '#ff4444'; // Red for 30+
    else if (gigaLevel >= 20) levelColor = '#ff9800'; // Orange for 20+
    else if (gigaLevel >= 10) levelColor = '#4caf50'; // Green for 10+
    else if (gigaLevel >= 5) levelColor = '#2196f3'; // Blue for 5+
    
    ctx.fillStyle = levelColor;
    ctx.font = 'bold 20px Arial, sans-serif';
    ctx.fillText('Giga Level: ' + gigaLevel, w / 2, currentY);
    currentY += lineSpacing + 20;

    // 4. Play Again button
    const btnW = 180;
    const btnH = 50;
    const btnX = (w - btnW) / 2;
    const btnY = currentY;
    this._playAgainBounds = { x: btnX, y: btnY, width: btnW, height: btnH };

    // Button background with gradient
    const gradient = ctx.createLinearGradient(btnX, btnY, btnX, btnY + btnH);
    gradient.addColorStop(0, '#43a047');
    gradient.addColorStop(1, '#2e7d32');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.roundRect(btnX, btnY, btnW, btnH, 12);
    ctx.fill();

    // Button border
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Button text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px Arial, sans-serif';
    ctx.fillText('\u25B6  PLAY AGAIN', w / 2, btnY + btnH / 2);

    currentY += btnH + 20;

    // 5. Press SPACE hint
    ctx.fillStyle = '#888888';
    ctx.font = '14px Arial, sans-serif';
    ctx.fillText('Press SPACE to play again', w / 2, currentY);

    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
  }

  renderPauseOverlay(ctx) {
    const w = this._width;
    const h = this._height;

    // Dark overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, w, h);

    // Pause box
    const boxW = 180;
    const boxH = 80;
    const boxX = (w - boxW) / 2;
    const boxY = (h - boxH) / 2;

    ctx.fillStyle = 'rgba(30, 30, 50, 0.95)';
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxW, boxH, 10);
    ctx.fill();

    // Pause bars icon
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(w / 2 - 12, boxY + 20, 8, 24, 2);
    ctx.fill();
    ctx.beginPath();
    ctx.roundRect(w / 2 + 4, boxY + 20, 8, 24, 2);
    ctx.fill();

    // Text
    ctx.fillStyle = '#cccccc';
    ctx.font = '12px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('ESC or P to resume', w / 2, boxY + 62);

    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
  }

  renderMuteButton(ctx, isMuted, isNight = false) {
    const x = 10;
    const y = 10;
    const size = 22;
    this._muteButtonBounds = { x, y, width: size + 5, height: size };

    const color = isNight ? '#aaaaaa' : '#757575';
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 1.5;

    // Speaker body
    ctx.beginPath();
    ctx.moveTo(x + 3, y + 8);
    ctx.lineTo(x + 7, y + 8);
    ctx.lineTo(x + 12, y + 4);
    ctx.lineTo(x + 12, y + 18);
    ctx.lineTo(x + 7, y + 14);
    ctx.lineTo(x + 3, y + 14);
    ctx.closePath();
    ctx.stroke();

    if (isMuted) {
      // X mark
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + 15, y + 7);
      ctx.lineTo(x + 21, y + 15);
      ctx.moveTo(x + 21, y + 7);
      ctx.lineTo(x + 15, y + 15);
      ctx.stroke();
    } else {
      // Sound waves
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(x + 14, y + 11, 4, -Math.PI / 3, Math.PI / 3);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x + 14, y + 11, 7, -Math.PI / 4, Math.PI / 4);
      ctx.stroke();
    }
  }

  resize(width, height) {
    this._width = width;
    this._height = height;
  }

  /**
   * Draw a fallback character preview when sprite isn't available
   */
  _drawCharacterPreview(ctx, x, y, w, h, characterId, isNight) {
    if (characterId === 'player2') {
      // Speedy - Slim, fast-looking character (blue)
      this._drawSpeedyPreview(ctx, x, y, w, h, isNight);
    } else if (characterId === 'player3') {
      // Tank - Big, bulky character (red/orange)
      this._drawTankPreview(ctx, x, y, w, h, isNight);
    } else {
      // Default dino shape (green) - Jewasaur
      this._drawDefaultPreview(ctx, x, y, w, h, isNight);
    }
  }

  _drawDefaultPreview(ctx, x, y, w, h, isNight) {
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
    
    // Legs (static for preview)
    ctx.fillStyle = darkColor;
    ctx.fillRect(x + w * 0.2, y + h * 0.85, w * 0.15, h * 0.15);
    ctx.fillRect(x + w * 0.45, y + h * 0.85, w * 0.15, h * 0.15);
    
    // Tail
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x + w * 0.1, y + h * 0.5);
    ctx.lineTo(x - w * 0.1, y + h * 0.4);
    ctx.lineTo(x + w * 0.1, y + h * 0.7);
    ctx.fill();
  }

  _drawSpeedyPreview(ctx, x, y, w, h, isNight) {
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
    
    // Thin legs (static for preview)
    ctx.fillStyle = skinColor;
    ctx.fillRect(x + w * 0.3, y + h * 0.82, w * 0.12, h * 0.18);
    ctx.fillRect(x + w * 0.5, y + h * 0.82, w * 0.12, h * 0.18);
    
    // Feet
    ctx.fillStyle = darkSkin;
    ctx.beginPath();
    ctx.ellipse(x + w * 0.36, y + h * 0.98, w * 0.1, h * 0.04, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + w * 0.56, y + h * 0.98, w * 0.1, h * 0.04, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  _drawTankPreview(ctx, x, y, w, h, isNight) {
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
    
    // Pupils
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
    
    // Legs (static for preview)
    ctx.fillStyle = suitColor;
    ctx.fillRect(x + w * 0.28, y + h * 0.82, w * 0.14, h * 0.18);
    ctx.fillRect(x + w * 0.52, y + h * 0.82, w * 0.14, h * 0.18);
    
    // Fancy shoes
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.ellipse(x + w * 0.35, y + h * 0.98, w * 0.1, h * 0.035, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + w * 0.59, y + h * 0.98, w * 0.1, h * 0.035, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}
