import { CONFIG } from './config.js';

export class UIRenderer {
  constructor(canvas, logicalWidth, logicalHeight) {
    this._canvas = canvas;
    this._width = logicalWidth || canvas.width;
    this._height = logicalHeight || canvas.height;
    this._muteButtonBounds = { x: 0, y: 0, width: 30, height: 30 };
    this._chatButtonBounds = { x: 0, y: 0, width: 30, height: 30 };
    this._playAgainBounds = { x: 0, y: 0, width: 0, height: 0 };
    this._switchPlayerBounds = { x: 0, y: 0, width: 0, height: 0 };
    
    // Character selection
    this._characters = CONFIG.sprites.players || [];
    this._selectedCharacterIndex = 0;
    this._leftArrowBounds = { x: 0, y: 0, width: 0, height: 0 };
    this._rightArrowBounds = { x: 0, y: 0, width: 0, height: 0 };

    // Game over GIF element (from HTML)
    this._gameOverGif = document.getElementById('gameover-gif');
    this._gameOverActive = false;
    
    // Card collection popup notifications
    this._popups = [];
    
    // List of available game over GIFs (add more paths here as you upload them)
    this._gameOverGifs = [
      'assets/videos/gameover1.gif',
      'assets/videos/gameover2.gif',
      // 'assets/videos/gameover3.gif',
      // 'assets/videos/gameover4.gif',
      // 'assets/videos/gameover5.gif',
    ];
    
    // Player-specific game over GIFs (use these instead of random for specific players)
    // player1 uses the _gameOverGifs array (random between gameover1.gif and gameover2.gif)
    this._playerGameOverGifs = {
      'player2': 'assets/videos/gameover-player2.gif',  // Jewgoblin's special game over clip
      'player3': 'assets/videos/gameover-player3.gif',  // Jewman's special game over clip
      'player4': 'assets/videos/gameover-player4.gif'   // Big Yahu's special game over clip
    };
    
    // Calculate initial scale factor
    this._updateScaleFactor();
  }

  /**
   * Calculate responsive scale factor based on screen size.
   * Uses a simpler approach - scale based on smaller dimension.
   */
  _updateScaleFactor() {
    // Base the scale on the smaller dimension to ensure UI fits
    const minDimension = Math.min(this._width, this._height);
    
    // Scale factor: 1.0 at 800px, scales proportionally
    // This ensures UI elements are readable on all screen sizes
    this._scaleFactor = Math.max(0.7, Math.min(1.5, minDimension / 800));
  }

  /**
   * Get responsive font size based on base size and scale factor.
   */
  _fontSize(baseSize) {
    return Math.max(10, Math.round(baseSize * this._scaleFactor));
  }

  /**
   * Get responsive dimension based on base size and scale factor.
   */
  _scale(baseSize) {
    return Math.max(10, Math.round(baseSize * this._scaleFactor));
  }

  get muteButtonBounds() { return this._muteButtonBounds; }
  get chatButtonBounds() { return this._chatButtonBounds; }
  get playAgainBounds() { return this._playAgainBounds; }
  get switchPlayerBounds() { return this._switchPlayerBounds; }
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
      console.log(`Character switched to: ${this._selectedCharacterIndex + 1}/${this._characters.length} - ${this.selectedCharacterName}`);
    }
  }

  /** Show a card collection popup */
  showCardPopup(cardType) {
    const popup = {
      type: cardType,
      timer: 2, // 2 seconds display
      y: this._height * 0.4, // Start position
      alpha: 1
    };
    this._popups.push(popup);
  }

  /** Update popups (call from game update) */
  updatePopups(deltaTime) {
    for (let i = this._popups.length - 1; i >= 0; i--) {
      const popup = this._popups[i];
      popup.timer -= deltaTime;
      popup.y -= 30 * deltaTime; // Float upward
      popup.alpha = Math.min(1, popup.timer); // Fade out
      
      if (popup.timer <= 0) {
        this._popups.splice(i, 1);
      }
    }
  }

  /** Render card collection popups */
  renderPopups(ctx) {
    for (const popup of this._popups) {
      ctx.save();
      ctx.globalAlpha = popup.alpha;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      let text, color, emoji;
      if (popup.type === 'trump') {
        text = 'TRUMP CARD COLLECTED!';
        color = '#ffd700';
        emoji = '🃏';
      } else if (popup.type === 'bigstin') {
        text = 'BIGSTIN CARD COLLECTED!';
        color = '#9c27b0';
        emoji = '👻';
      }
      
      // Background box - responsive sizing
      const boxWidth = this._scale(300);
      const boxHeight = this._scale(55);
      const boxX = this._width / 2 - boxWidth / 2;
      const boxY = popup.y - boxHeight / 2;
      
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.beginPath();
      ctx.roundRect(boxX, boxY, boxWidth, boxHeight, this._scale(10));
      ctx.fill();
      
      // Border
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.stroke();
      
      // Text - responsive font
      ctx.fillStyle = color;
      ctx.font = `bold ${this._fontSize(20)}px Arial, sans-serif`;
      ctx.fillText(`${emoji} ${text}`, this._width / 2, popup.y);
      
      ctx.restore();
    }
  }

  /** Call when game over starts — shows a random GIF (or player-specific GIF) */
  showGameOver(playerId = null) {
    this._gameOverActive = true;
    
    // Get GIF element if not already cached
    if (!this._gameOverGif) {
      this._gameOverGif = document.getElementById('gameover-gif');
    }
    
    if (this._gameOverGif) {
      let selectedGif;
      
      // Check if this player has a specific game over GIF
      if (playerId && this._playerGameOverGifs[playerId]) {
        selectedGif = this._playerGameOverGifs[playerId];
        console.log(`Using player-specific game over GIF for ${playerId}: ${selectedGif}`);
      } else {
        // Select a random GIF from the available list (for player1 or unknown players)
        const randomIndex = Math.floor(Math.random() * this._gameOverGifs.length);
        selectedGif = this._gameOverGifs[randomIndex];
        console.log(`Using random game over GIF for ${playerId}: ${selectedGif} (index: ${randomIndex})`);
      }
      
      // Set the new source (this also resets the animation)
      this._gameOverGif.src = selectedGif;
      this._gameOverGif.classList.remove('hidden');
      this._gameOverGif.classList.add('visible');
    }
  }

  /** Call when restarting — hides GIF */
  hideGameOver() {
    this._gameOverActive = false;
    
    if (!this._gameOverGif) {
      this._gameOverGif = document.getElementById('gameover-gif');
    }
    
    if (this._gameOverGif) {
      this._gameOverGif.classList.remove('visible');
      this._gameOverGif.classList.add('hidden');
    }
  }

  renderStartScreen(ctx, isNight = false, spriteManager = null) {
    const w = this._width;
    const h = this._height;
    
    // Add semi-transparent overlay so UI is visible over video background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, w, h);
    
    const textColor = '#ffffff'; // White text for visibility
    const subColor = '#cccccc';

    // Title - responsive font size
    ctx.fillStyle = textColor;
    ctx.font = `bold ${this._fontSize(32)}px Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('HCS', w / 2, h * 0.15);

    // Character selection area - responsive sizing
    const charY = h * 0.45;
    const charBoxW = this._scale(140);
    const charBoxH = this._scale(120);
    const charBoxX = (w - charBoxW) / 2;
    const charBoxY = charY - charBoxH / 2;

    // Character box background
    ctx.fillStyle = 'rgba(40, 40, 60, 0.9)';
    ctx.beginPath();
    ctx.roundRect(charBoxX, charBoxY, charBoxW, charBoxH, this._scale(10));
    ctx.fill();
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw character preview - responsive sizing
    const previewSize = this._scale(70);
    const previewX = w / 2 - previewSize / 2;
    const previewY = charY - previewSize / 2 - this._scale(5);
    
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

    // Character name - responsive font
    ctx.fillStyle = textColor;
    ctx.font = `bold ${this._fontSize(16)}px Arial, sans-serif`;
    ctx.fillText(this.selectedCharacterName, w / 2, charBoxY + charBoxH - this._scale(12));

    // Left arrow - responsive sizing
    const arrowSize = this._scale(36);
    const arrowY = charY - arrowSize / 2;
    const leftArrowX = charBoxX - arrowSize - this._scale(15);
    this._leftArrowBounds = { x: leftArrowX, y: arrowY, width: arrowSize, height: arrowSize };

    ctx.fillStyle = 'rgba(80, 80, 100, 0.9)';
    ctx.beginPath();
    ctx.roundRect(leftArrowX, arrowY, arrowSize, arrowSize, this._scale(6));
    ctx.fill();
    
    ctx.fillStyle = textColor;
    ctx.font = `bold ${this._fontSize(22)}px Arial, sans-serif`;
    ctx.fillText('<', leftArrowX + arrowSize / 2, arrowY + arrowSize / 2);

    // Right arrow - responsive sizing
    const rightArrowX = charBoxX + charBoxW + this._scale(15);
    this._rightArrowBounds = { x: rightArrowX, y: arrowY, width: arrowSize, height: arrowSize };

    ctx.fillStyle = 'rgba(80, 80, 100, 0.9)';
    ctx.beginPath();
    ctx.roundRect(rightArrowX, arrowY, arrowSize, arrowSize, this._scale(6));
    ctx.fill();
    
    ctx.fillStyle = textColor;
    ctx.fillText('>', rightArrowX + arrowSize / 2, arrowY + arrowSize / 2);

    // Character counter - responsive font
    ctx.fillStyle = subColor;
    ctx.font = `${this._fontSize(12)}px Arial, sans-serif`;
    ctx.fillText(`${this._selectedCharacterIndex + 1} / ${this._characters.length}`, w / 2, charBoxY + charBoxH + this._scale(18));

    // Instruction - responsive font
    ctx.fillStyle = '#ffffff';
    ctx.font = `${this._fontSize(16)}px Arial, sans-serif`;
    ctx.fillText('Press SPACE or Tap to Start', w / 2, h * 0.78);

    // Controls hint - responsive font
    ctx.font = `${this._fontSize(12)}px Arial, sans-serif`;
    ctx.fillStyle = '#aaaaaa';
    ctx.fillText('← → to select character', w / 2, h * 0.85);
    ctx.fillText('↑/SPACE = Jump   ↓ = Duck   ESC = Pause', w / 2, h * 0.91);

    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
  }

  renderHUD(ctx, scoreDisplay, highScoreDisplay, isMilestoneFlashing, isNight = false, coins = 0, trumpCardActive = false, trumpCardTime = 0, einsteinCardActive = false, einsteinCardTime = 0) {
    const w = this._width;
    const textColor = isNight ? '#e0e0e0' : '#333333';
    const subColor = isNight ? '#999999' : '#888888';
    const padding = this._scale(15);
    const baseFontSize = this._fontSize(16);

    ctx.font = `bold ${baseFontSize}px Arial, sans-serif`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'alphabetic';

    // Trump Card indicator (if active)
    if (trumpCardActive) {
      // Flashing 2X indicator
      const flash = Math.floor(Date.now() / 200) % 2 === 0;
      ctx.fillStyle = flash ? '#ff4444' : '#ffd700';
      ctx.font = `bold ${this._fontSize(18)}px Arial, sans-serif`;
      ctx.fillText(`🃏 2X PENNY (${trumpCardTime}s)`, w - padding, this._scale(52));
      ctx.font = `bold ${baseFontSize}px Arial, sans-serif`;
    }

    // Bigstin Card indicator (if active)
    if (einsteinCardActive) {
      // Flashing ghost mode indicator
      const flash = Math.floor(Date.now() / 250) % 2 === 0;
      ctx.fillStyle = flash ? '#2196f3' : '#9c27b0';
      ctx.font = `bold ${this._fontSize(18)}px Arial, sans-serif`;
      const yPos = trumpCardActive ? this._scale(78) : this._scale(52); // Stack below Trump Card if both active
      ctx.fillText(`👻 GHOST MODE (${einsteinCardTime}s)`, w - padding, yPos);
      ctx.font = `bold ${baseFontSize}px Arial, sans-serif`;
    }

    // Coin count (leftmost)
    ctx.fillStyle = trumpCardActive ? '#ffd700' : '#ffc107';
    ctx.fillText('\u00A2 ' + coins + (trumpCardActive ? ' (2X!)' : ''), w - this._scale(180), this._scale(26));

    // High score
    ctx.fillStyle = subColor;
    ctx.fillText(highScoreDisplay, w - this._scale(95), this._scale(26));

    // Current score (with flash effect)
    if (isMilestoneFlashing && Math.floor(Date.now() / 100) % 2 === 0) {
      // Don't draw — creates flash effect
    } else {
      ctx.fillStyle = textColor;
      ctx.fillText(scoreDisplay, w - padding, this._scale(26));
    }

    ctx.textAlign = 'left';
  }

  renderGameOver(ctx, scoreDisplay, isNight = false, coins = 0) {
    const w = this._width;
    const h = this._height;
    
    // Detect mobile (portrait or small screen)
    const isMobile = h > w || w < 768;

    // Dark overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.fillRect(0, 0, w, h);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Calculate Giga Level (every 5 pennies = 1 level, max 99)
    const gigaLevel = Math.min(99, Math.floor(coins / 5));

    // GIF plays in HTML element (positioned via CSS)
    // Leave space for it in the middle
    // On mobile, position text lower to give more room for GIF

    // Penny Collected (below GIF area) - responsive font
    // Mobile: position at 60%, Desktop: 68%
    const pennyY = isMobile ? h * 0.58 : h * 0.68;
    ctx.fillStyle = '#ffc107';
    ctx.font = `bold ${this._fontSize(isMobile ? 16 : 20)}px Arial, sans-serif`;
    ctx.fillText('Penny Collected: ' + coins, w / 2, pennyY);

    // Giga Level with color based on level - responsive font
    let levelColor = '#ffffff';
    if (gigaLevel >= 50) levelColor = '#ff00ff';
    else if (gigaLevel >= 30) levelColor = '#ff4444';
    else if (gigaLevel >= 20) levelColor = '#ff9800';
    else if (gigaLevel >= 10) levelColor = '#4caf50';
    else if (gigaLevel >= 5) levelColor = '#2196f3';
    
    // Mobile: position at 65%, Desktop: 74%
    const levelY = isMobile ? h * 0.64 : h * 0.74;
    ctx.fillStyle = levelColor;
    ctx.font = `bold ${this._fontSize(isMobile ? 18 : 24)}px Arial, sans-serif`;
    ctx.fillText('Giga Level: ' + gigaLevel, w / 2, levelY);

    // Switch Player button (above Play Again) - responsive sizing
    // Mobile: smaller buttons, positioned lower
    const switchBtnW = this._scale(isMobile ? 140 : 170);
    const switchBtnH = this._scale(isMobile ? 38 : 45);
    const switchBtnX = (w - switchBtnW) / 2;
    const switchBtnY = isMobile ? h * 0.72 : h * 0.80;
    this._switchPlayerBounds = { x: switchBtnX, y: switchBtnY, width: switchBtnW, height: switchBtnH };

    // Switch button background with purple gradient
    const switchGradient = ctx.createLinearGradient(switchBtnX, switchBtnY, switchBtnX, switchBtnY + switchBtnH);
    switchGradient.addColorStop(0, '#7b1fa2');
    switchGradient.addColorStop(1, '#4a148c');
    ctx.fillStyle = switchGradient;
    ctx.beginPath();
    ctx.roundRect(switchBtnX, switchBtnY, switchBtnW, switchBtnH, this._scale(10));
    ctx.fill();

    // Switch button border
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Switch button text - responsive font
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${this._fontSize(isMobile ? 14 : 16)}px Arial, sans-serif`;
    ctx.fillText('\u21C4  SWITCH PLAYER', w / 2, switchBtnY + switchBtnH / 2);

    // Show current character name below switch button
    ctx.fillStyle = '#aaaaaa';
    ctx.font = `${this._fontSize(isMobile ? 11 : 13)}px Arial, sans-serif`;
    ctx.fillText(`Current: ${this.selectedCharacterName} (${this._selectedCharacterIndex + 1}/${this._characters.length})`, w / 2, switchBtnY + switchBtnH + this._scale(12));

    // Play Again button - responsive sizing
    // Mobile: smaller buttons, positioned lower
    const btnW = this._scale(isMobile ? 160 : 200);
    const btnH = this._scale(isMobile ? 45 : 55);
    const btnX = (w - btnW) / 2;
    const btnY = isMobile ? h * 0.82 : h * 0.88;
    this._playAgainBounds = { x: btnX, y: btnY, width: btnW, height: btnH };

    // Button background with gradient
    const gradient = ctx.createLinearGradient(btnX, btnY, btnX, btnY + btnH);
    gradient.addColorStop(0, '#43a047');
    gradient.addColorStop(1, '#2e7d32');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.roundRect(btnX, btnY, btnW, btnH, this._scale(12));
    ctx.fill();

    // Button border
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Button text - responsive font
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${this._fontSize(isMobile ? 16 : 20)}px Arial, sans-serif`;
    ctx.fillText('\u25B6  PLAY AGAIN', w / 2, btnY + btnH / 2);

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
    // Detect mobile for positioning
    const isMobile = this._height > this._width || this._width < 768;
    
    const x = 10;
    const y = isMobile ? 180 : 10;  // Even lower on mobile (was 160)
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

  renderChatButton(ctx, unreadCount = 0, isNight = false) {
    // Detect mobile for positioning
    const isMobile = this._height > this._width || this._width < 768;
    
    const x = 45; // Position next to mute button
    const y = isMobile ? 180 : 10;  // Even lower on mobile (was 160, same as mute button)
    const size = 22;
    this._chatButtonBounds = { x, y, width: size + 5, height: size };

    const color = isNight ? '#aaaaaa' : '#757575';
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 1.5;

    // Chat bubble icon
    ctx.beginPath();
    ctx.moveTo(x + 4, y + 6);
    ctx.lineTo(x + 20, y + 6);
    ctx.quadraticCurveTo(x + 22, y + 6, x + 22, y + 8);
    ctx.lineTo(x + 22, y + 14);
    ctx.quadraticCurveTo(x + 22, y + 16, x + 20, y + 16);
    ctx.lineTo(x + 10, y + 16);
    ctx.lineTo(x + 6, y + 20);
    ctx.lineTo(x + 6, y + 16);
    ctx.lineTo(x + 4, y + 16);
    ctx.quadraticCurveTo(x + 2, y + 16, x + 2, y + 14);
    ctx.lineTo(x + 2, y + 8);
    ctx.quadraticCurveTo(x + 2, y + 6, x + 4, y + 6);
    ctx.closePath();
    ctx.stroke();

    // Chat dots inside bubble
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x + 8, y + 11, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + 12, y + 11, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + 16, y + 11, 1.5, 0, Math.PI * 2);
    ctx.fill();

    // Unread badge
    if (unreadCount > 0) {
      const badgeX = x + size - 2;
      const badgeY = y - 2;
      const badgeText = unreadCount > 9 ? '9+' : String(unreadCount);
      
      ctx.fillStyle = '#ff4444';
      ctx.beginPath();
      ctx.arc(badgeX, badgeY + 6, 8, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(badgeText, badgeX, badgeY + 6);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
    }
  }

  resize(width, height) {
    this._width = width;
    this._height = height;
    this._updateScaleFactor();
  }

  /**
   * Draw a fallback character preview when sprite isn't available
   */
  _drawCharacterPreview(ctx, x, y, w, h, characterId, isNight) {
    if (characterId === 'player2') {
      // Jewgoblin - Green goblin
      this._drawSpeedyPreview(ctx, x, y, w, h, isNight);
    } else if (characterId === 'player3') {
      // Jewman - Victorian gentleman
      this._drawTankPreview(ctx, x, y, w, h, isNight);
    } else {
      // Default dino shape (green) - Jewasaur (also fallback for player4 until sprites uploaded)
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
