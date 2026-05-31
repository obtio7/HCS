import { CONFIG } from './config.js';

export class BackgroundRenderer {
  constructor(canvasWidth, canvasHeight) {
    this._canvasWidth = canvasWidth;
    this._canvasHeight = canvasHeight;
    this._scrollX = 0;
    this._cloudScrollX = 0; // Separate scroll for clouds
    this._tileWidth = 600;
    this._theme = 'day';
    this._targetTheme = 'day';
    this._transitionProgress = 0;
    this._isTransitioning = false;
    this._lastThemeIndex = 0;

    // Background image (same for day/night, night uses overlay)
    this._backgroundImage = null;
    this._imageLoaded = false;
    
    // Detect if mobile
    this._isMobile = this._detectMobile();

    // Pre-compute RGB values for fallback colors
    this._dayBgRgb = this._hexToRgb(CONFIG.colors.day.background);
    this._nightBgRgb = this._hexToRgb(CONFIG.colors.night.background);
    this._currentBgColor = CONFIG.colors.day.background;

    // Night overlay opacity (0 = day, 0.6 = night)
    this._nightOverlayOpacity = 0;

    // Cloud definitions with different speeds for parallax effect
    this._clouds = [
      { x: 100, y: 40, w: 80, h: 30, speed: 0.15 },
      { x: 350, y: 70, w: 100, h: 35, speed: 0.2 },
      { x: 600, y: 25, w: 60, h: 22, speed: 0.12 },
      { x: 850, y: 90, w: 90, h: 32, speed: 0.18 },
      { x: 1100, y: 50, w: 70, h: 25, speed: 0.14 },
      { x: 200, y: 110, w: 85, h: 28, speed: 0.16 },
      { x: 500, y: 130, w: 75, h: 26, speed: 0.13 }
    ];

    // Load background image
    this._loadImage();
  }

  /**
   * Detect if the device is mobile based on screen size and touch capability.
   */
  _detectMobile() {
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const isSmallScreen = window.innerWidth < 768;
    const isPortrait = window.innerHeight > window.innerWidth;
    return hasTouch && (isSmallScreen || isPortrait);
  }

  _loadImage() {
    this._backgroundImage = new Image();
    this._backgroundImage.onload = () => {
      this._imageLoaded = true;
    };
    this._backgroundImage.onerror = () => {
      console.warn('Background image not found, using fallback color');
      this._backgroundImage = null;
    };
    
    // Use mobile background if available and on mobile device
    if (this._isMobile && CONFIG.sprites.backgrounds.mobile) {
      this._backgroundImage.src = CONFIG.sprites.backgrounds.mobile.path;
    } else {
      this._backgroundImage.src = CONFIG.sprites.backgrounds.day.path;
    }
  }

  get theme() { return this._theme; }
  get isTransitioning() { return this._isTransitioning; }
  get isNight() {
    if (this._isTransitioning) {
      return this._targetTheme === 'night' ? this._transitionProgress > 0.5 : this._transitionProgress < 0.5;
    }
    return this._theme === 'night';
  }

  update(deltaTime, gameSpeed, score) {
    // Parallax scroll at 50% speed
    this._scrollX += gameSpeed * 0.5 * deltaTime;
    if (this._scrollX >= this._tileWidth) {
      this._scrollX -= this._tileWidth;
    }

    // Update cloud positions (move left continuously)
    for (const cloud of this._clouds) {
      cloud.x -= gameSpeed * cloud.speed * deltaTime;
      // Wrap around when cloud goes off left side
      if (cloud.x + cloud.w < 0) {
        cloud.x = this._canvasWidth + Math.random() * 200;
        cloud.y = 20 + Math.random() * 120; // Random height
      }
    }

    // Day/night transitions — check every 500 points
    const interval = CONFIG.scoring.dayNightInterval;
    const themeIndex = Math.floor(score / interval);
    if (themeIndex > this._lastThemeIndex && score > 0) {
      this._lastThemeIndex = themeIndex;
      const newTheme = themeIndex % 2 === 1 ? 'night' : 'day';
      if (newTheme !== this._theme && !this._isTransitioning) {
        this._targetTheme = newTheme;
        this._isTransitioning = true;
        this._transitionProgress = 0;
      }
    }

    // Smooth transition animation (2 seconds)
    if (this._isTransitioning) {
      this._transitionProgress += deltaTime / 2;
      if (this._transitionProgress >= 1) {
        this._transitionProgress = 1;
        this._theme = this._targetTheme;
        this._isTransitioning = false;
      }
      // Update cached color and night overlay during transition
      this._updateTransitionColor();
      this._updateNightOverlay();
    }

    // Update night overlay based on current theme
    if (!this._isTransitioning) {
      this._nightOverlayOpacity = this._theme === 'night' ? 0.5 : 0;
    }
  }

  _updateNightOverlay() {
    // Smoothly transition night overlay opacity
    const targetOpacity = this._targetTheme === 'night' ? 0.5 : 0;
    const startOpacity = this._theme === 'night' ? 0.5 : 0;
    this._nightOverlayOpacity = startOpacity + (targetOpacity - startOpacity) * this._transitionProgress;
  }

  render(ctx) {
    if (this._backgroundImage && this._imageLoaded) {
      // Draw background image
      ctx.drawImage(this._backgroundImage, 0, 0, this._canvasWidth, this._canvasHeight);

      // Draw moving clouds on top of background (day only)
      if (!this.isNight && this._nightOverlayOpacity < 0.3) {
        this._drawMovingClouds(ctx);
      }

      // Apply night overlay (dark blue tint)
      if (this._nightOverlayOpacity > 0) {
        ctx.fillStyle = `rgba(10, 15, 40, ${this._nightOverlayOpacity})`;
        ctx.fillRect(0, 0, this._canvasWidth, this._canvasHeight);
      }

      // Draw stars on top during night
      if (this.isNight || this._nightOverlayOpacity > 0.25) {
        ctx.globalAlpha = Math.min(1, this._nightOverlayOpacity * 2);
        this._drawStars(ctx);
        ctx.globalAlpha = 1;
      }
    } else {
      // Fallback to solid color
      ctx.fillStyle = this._currentBgColor;
      ctx.fillRect(0, 0, this._canvasWidth, this._canvasHeight);

      // Draw decorations
      if (this.isNight) {
        this._drawStars(ctx);
      } else {
        this._drawMovingClouds(ctx);
      }
    }
  }

  _drawMovingClouds(ctx) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    
    for (const cloud of this._clouds) {
      // Main cloud body
      ctx.beginPath();
      ctx.ellipse(cloud.x + cloud.w * 0.5, cloud.y + cloud.h * 0.5, cloud.w * 0.4, cloud.h * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();
      
      // Left puff
      ctx.beginPath();
      ctx.ellipse(cloud.x + cloud.w * 0.25, cloud.y + cloud.h * 0.6, cloud.w * 0.25, cloud.h * 0.35, 0, 0, Math.PI * 2);
      ctx.fill();
      
      // Right puff
      ctx.beginPath();
      ctx.ellipse(cloud.x + cloud.w * 0.75, cloud.y + cloud.h * 0.6, cloud.w * 0.28, cloud.h * 0.38, 0, 0, Math.PI * 2);
      ctx.fill();
      
      // Top puff
      ctx.beginPath();
      ctx.ellipse(cloud.x + cloud.w * 0.6, cloud.y + cloud.h * 0.3, cloud.w * 0.22, cloud.h * 0.28, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  _updateTransitionColor() {
    const from = this._theme === 'day' ? this._dayBgRgb : this._nightBgRgb;
    const to = this._targetTheme === 'day' ? this._dayBgRgb : this._nightBgRgb;
    const p = this._transitionProgress;
    const r = Math.round(from.r + (to.r - from.r) * p);
    const g = Math.round(from.g + (to.g - from.g) * p);
    const b = Math.round(from.b + (to.b - from.b) * p);
    this._currentBgColor = `rgb(${r},${g},${b})`;
  }

  _drawClouds(ctx) {
    ctx.fillStyle = 'rgba(220, 220, 220, 0.7)';
    const offset = this._scrollX * 0.3;
    const clouds = [
      { x: 80, y: 18, w: 50, h: 16 },
      { x: 280, y: 32, w: 70, h: 14 },
      { x: 500, y: 12, w: 42, h: 12 },
      { x: 700, y: 38, w: 60, h: 15 },
      { x: 900, y: 22, w: 45, h: 13 }
    ];
    for (const cloud of clouds) {
      let cx = ((cloud.x - offset) % (this._canvasWidth + 120)) - 60;
      if (cx < -cloud.w) cx += this._canvasWidth + 120;
      ctx.beginPath();
      ctx.ellipse(cx + cloud.w / 2, cloud.y + cloud.h / 2, cloud.w / 2, cloud.h / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(cx + cloud.w * 0.3, cloud.y + cloud.h * 0.55, cloud.w * 0.25, cloud.h * 0.35, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(cx + cloud.w * 0.7, cloud.y + cloud.h * 0.55, cloud.w * 0.2, cloud.h * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  _drawStars(ctx) {
    ctx.fillStyle = '#ffffff';
    const stars = [
      { x: 50, y: 15, s: 2 }, { x: 130, y: 42, s: 1.5 }, { x: 220, y: 10, s: 2 },
      { x: 310, y: 48, s: 1 }, { x: 400, y: 22, s: 2 }, { x: 480, y: 38, s: 1.5 },
      { x: 570, y: 8, s: 1 }, { x: 650, y: 30, s: 2 }, { x: 740, y: 18, s: 1.5 },
      { x: 830, y: 44, s: 1 }, { x: 180, y: 55, s: 1 }, { x: 600, y: 52, s: 1.5 },
      { x: 150, y: 70, s: 1.5 }, { x: 350, y: 65, s: 2 }, { x: 550, y: 75, s: 1 },
      { x: 750, y: 60, s: 1.5 }, { x: 950, y: 68, s: 2 }
    ];
    for (const star of stars) {
      const sx = star.x % this._canvasWidth;
      ctx.beginPath();
      ctx.arc(sx, star.y, star.s, 0, Math.PI * 2);
      ctx.fill();
    }
    // Moon
    ctx.fillStyle = '#f0f0f0';
    ctx.beginPath();
    ctx.arc(this._canvasWidth - 80, 60, 25, 0, Math.PI * 2);
    ctx.fill();
    // Moon craters
    ctx.fillStyle = '#d8d8d8';
    ctx.beginPath();
    ctx.arc(this._canvasWidth - 75, 55, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(this._canvasWidth - 88, 65, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(this._canvasWidth - 78, 70, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  _hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
  }

  reset() {
    this._scrollX = 0;
    this._theme = 'day';
    this._targetTheme = 'day';
    this._transitionProgress = 0;
    this._isTransitioning = false;
    this._lastThemeIndex = 0;
    this._currentBgColor = CONFIG.colors.day.background;
    this._nightOverlayOpacity = 0;
  }

  resize(canvasWidth, canvasHeight) {
    this._canvasWidth = canvasWidth;
    this._canvasHeight = canvasHeight;
  }
}
