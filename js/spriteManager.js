import { CONFIG } from './config.js';

export class SpriteManager {
  constructor() {
    this._sprites = {};
    this._spriteSheets = {};
    this._gifAnimations = {};
    this._gifuctAvailable = false;
    
    // Check if gifuct-js is available
    this._checkGifuctLibrary();
  }

  _checkGifuctLibrary() {
    // gifuct-js can be exposed in different ways depending on how it's loaded
    if (typeof window.gifuct !== 'undefined') {
      this._gifuctAvailable = true;
      this._parseGIF = window.gifuct.parseGIF;
      this._decompressFrames = window.gifuct.decompressFrames;
      console.log('gifuct-js loaded (as window.gifuct)');
    } else if (typeof window.parseGIF !== 'undefined' && typeof window.decompressFrames !== 'undefined') {
      this._gifuctAvailable = true;
      this._parseGIF = window.parseGIF;
      this._decompressFrames = window.decompressFrames;
      console.log('gifuct-js loaded (as global functions)');
    } else {
      console.warn('gifuct-js library not found. GIF animations will use static images.');
      // Log what's available for debugging
      const gifRelated = Object.keys(window).filter(k => 
        k.toLowerCase().includes('gif') || 
        k.toLowerCase().includes('parse') ||
        k.toLowerCase().includes('decompress')
      );
      if (gifRelated.length > 0) {
        console.log('Related window properties found:', gifRelated);
      }
    }
  }

  async loadAll() {
    // Re-check for gifuct-js library (it might have loaded after constructor)
    if (!this._gifuctAvailable) {
      this._checkGifuctLibrary();
    }
    
    const spriteConfig = CONFIG.sprites;

    // Load all player characters
    if (spriteConfig.players && spriteConfig.players.length > 0) {
      for (const playerConfig of spriteConfig.players) {
        try {
          await this._loadPlayerSprites(playerConfig.id, playerConfig);
        } catch (e) {
          console.error(`Failed to load player ${playerConfig.id}:`, e);
        }
      }
    }
    
    // Also load default player sprites (backwards compatibility)
    try {
      if (spriteConfig.player.run) {
        const runFrames = spriteConfig.player.run.frames || 1;
        if (runFrames > 1) {
          await this._loadSpriteSheet('player_run', spriteConfig.player.run.path, runFrames);
        } else {
          await this._loadSprite('player_run', spriteConfig.player.run.path);
        }
      }
      if (spriteConfig.player.jump) {
        await this._loadSprite('player_jump', spriteConfig.player.jump.path);
      }
      if (spriteConfig.player.duck) {
        const duckFrames = spriteConfig.player.duck.frames || 1;
        if (duckFrames > 1) {
          await this._loadSpriteSheet('player_duck', spriteConfig.player.duck.path, duckFrames);
        } else {
          await this._loadSprite('player_duck', spriteConfig.player.duck.path);
        }
      }
    } catch (e) {
      console.error('Failed to load default player sprites:', e);
    }

    // Load obstacle sprites
    for (const [key, config] of Object.entries(spriteConfig.obstacles)) {
      try {
        if (config.frames) {
          await this._loadSpriteSheet(`obstacle_${key}`, config.path, config.frames);
        } else {
          await this._loadSprite(`obstacle_${key}`, config.path);
        }
      } catch (e) {
        console.error(`Failed to load obstacle ${key}:`, e);
      }
    }

    // Load ground and background
    try {
      if (spriteConfig.ground) {
        await this._loadSprite('ground', spriteConfig.ground.path);
      }
      if (spriteConfig.background) {
        await this._loadSprite('background', spriteConfig.background.path);
      }
    } catch (e) {
      console.error('Failed to load ground/background:', e);
    }
  }

  async _loadPlayerSprites(playerId, playerConfig) {
    // Load run sprite
    if (playerConfig.run) {
      try {
        const path = playerConfig.run.path;
        if (path.endsWith('.gif')) {
          await this._loadGif(`${playerId}_run`, path);
        } else {
          const runFrames = playerConfig.run.frames || 1;
          if (runFrames > 1) {
            await this._loadSpriteSheet(`${playerId}_run`, path, runFrames);
          } else {
            await this._loadSprite(`${playerId}_run`, path);
          }
        }
      } catch (e) {
        console.error(`Failed to load run sprite for ${playerId}:`, e);
      }
    }
    // Load jump sprite
    if (playerConfig.jump) {
      try {
        const path = playerConfig.jump.path;
        if (path.endsWith('.gif')) {
          await this._loadGif(`${playerId}_jump`, path);
        } else {
          await this._loadSprite(`${playerId}_jump`, path);
        }
      } catch (e) {
        console.error(`Failed to load jump sprite for ${playerId}:`, e);
      }
    }
    // Load duck sprite
    if (playerConfig.duck) {
      try {
        const path = playerConfig.duck.path;
        if (path.endsWith('.gif')) {
          await this._loadGif(`${playerId}_duck`, path);
        } else {
          const duckFrames = playerConfig.duck.frames || 1;
          if (duckFrames > 1) {
            await this._loadSpriteSheet(`${playerId}_duck`, path, duckFrames);
          } else {
            await this._loadSprite(`${playerId}_duck`, path);
          }
        }
      } catch (e) {
        console.error(`Failed to load duck sprite for ${playerId}:`, e);
      }
    }
  }

  getSprite(key) {
    return this._sprites[key] || null;
  }

  getSpriteSheet(key) {
    return this._spriteSheets[key] || null;
  }

  getGifAnimation(key) {
    return this._gifAnimations[key] || null;
  }

  getObstacleSprite(type) {
    const key = `obstacle_${type}`;
    return this._spriteSheets[key] || this._sprites[key] || null;
  }

  getGroundSprite() {
    return this._sprites['ground'] || null;
  }

  getBackgroundSprite() {
    return this._sprites['background'] || null;
  }

  async _loadSprite(key, path) {
    try {
      const img = await this._loadImage(path);
      this._sprites[key] = { image: img };
    } catch (e) {
      console.warn(`Sprite failed to load: ${key} (${path}) - ${e.message}`);
      this._sprites[key] = { image: null, fallback: true };
    }
  }

  async _loadSpriteSheet(key, path, frameCount) {
    try {
      const img = await this._loadImage(path);
      const frameWidth = Math.floor(img.width / frameCount);
      console.log(`Sprite sheet loaded: ${key} - ${img.width}x${img.height}, ${frameCount} frames`);
      this._spriteSheets[key] = {
        image: img,
        frameWidth,
        frameHeight: img.height,
        frameCount
      };
    } catch (e) {
      console.warn(`Sprite sheet failed to load: ${key} (${path}) - ${e.message}`);
      this._spriteSheets[key] = { image: null, fallback: true };
    }
  }

  _loadImage(path) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        console.log(`Sprite loaded: ${path} (${img.width}x${img.height})`);
        resolve(img);
      };
      img.onerror = (e) => {
        console.warn(`Sprite failed to load: ${path}`, e);
        reject(new Error('Failed to load image: ' + path));
      };
      img.src = path;
    });
  }

  /**
   * Load an animated GIF
   * Uses two approaches:
   * 1. Try gifuct-js for frame extraction (allows frame-by-frame control)
   * 2. Fallback to using the GIF as a static image (browser handles animation)
   */
  async _loadGif(key, path) {
    console.log(`Loading GIF: ${key} from ${path}`);
    
    // First, always load as static image - this will be our primary display method
    // The browser will animate the GIF when we draw it to canvas
    let staticImg = null;
    try {
      staticImg = await this._loadImage(path);
      console.log(`GIF loaded: ${key} - ${staticImg.width}x${staticImg.height}`);
    } catch (e) {
      console.error(`Failed to load GIF: ${key}`, e);
      this._sprites[key] = { image: null, fallback: true };
      this._gifAnimations[key] = { image: null, fallback: true };
      return;
    }
    
    // Store the image - we'll use it directly for animation
    // The browser handles GIF animation natively when drawing to canvas
    this._sprites[key] = { image: staticImg, isGif: true };
    this._gifAnimations[key] = { 
      frames: [staticImg], 
      frameDelays: [100], 
      frameCount: 1,
      frameWidth: staticImg.width,
      frameHeight: staticImg.height,
      isGif: true,
      // Store the original image for direct drawing (browser animates it)
      animatedImage: staticImg
    };
    
    // Try to parse GIF frames for more control (optional enhancement)
    if (!this._gifuctAvailable) {
      console.log(`Using static GIF for ${key} (gifuct-js not available)`);
      return;
    }
    
    try {
      const response = await fetch(path);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      
      // Parse GIF using gifuct-js
      const gif = this._parseGIF(arrayBuffer);
      const frames = this._decompressFrames(gif, true);
      
      if (!frames || frames.length === 0) {
        console.warn('No frames found in GIF:', key);
        return;
      }
      
      console.log(`GIF parsed: ${key} - ${frames.length} frames, ${gif.lsd.width}x${gif.lsd.height}`);
      
      // Convert frames to canvas images
      const canvases = [];
      const delays = [];
      
      // Create a composite canvas to build up frames
      const compositeCanvas = document.createElement('canvas');
      compositeCanvas.width = gif.lsd.width;
      compositeCanvas.height = gif.lsd.height;
      const compositeCtx = compositeCanvas.getContext('2d');
      
      for (const frame of frames) {
        // Handle disposal method
        if (frame.disposalType === 2) {
          compositeCtx.clearRect(0, 0, compositeCanvas.width, compositeCanvas.height);
        }
        
        // Create ImageData from frame patch
        const imageData = new ImageData(
          new Uint8ClampedArray(frame.patch),
          frame.dims.width,
          frame.dims.height
        );
        
        // Create temp canvas for this frame
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = frame.dims.width;
        tempCanvas.height = frame.dims.height;
        tempCanvas.getContext('2d').putImageData(imageData, 0, 0);
        
        // Draw to composite at correct position
        compositeCtx.drawImage(tempCanvas, frame.dims.left, frame.dims.top);
        
        // Save current composite state as a frame
        const frameCanvas = document.createElement('canvas');
        frameCanvas.width = gif.lsd.width;
        frameCanvas.height = gif.lsd.height;
        frameCanvas.getContext('2d').drawImage(compositeCanvas, 0, 0);
        canvases.push(frameCanvas);
        
        // Store delay (convert to ms, default 100ms if 0)
        delays.push(frame.delay * 10 || 100);
      }
      
      if (canvases.length > 1) {
        // Update with extracted frames for frame-by-frame control
        this._gifAnimations[key] = {
          frames: canvases,
          frameDelays: delays,
          frameCount: canvases.length,
          frameWidth: gif.lsd.width,
          frameHeight: gif.lsd.height,
          isGif: true,
          animatedImage: staticImg
        };
        console.log(`GIF animation ready: ${key} - ${canvases.length} frames`);
      }
      
    } catch (e) {
      console.log(`Using native GIF animation for ${key} (frame extraction failed):`, e.message);
      // Keep the static image - browser will animate it
    }
  }

  /**
   * Fallback: Load GIF as static image (first frame only)
   */
  async _loadGifAsStatic(key, path) {
    try {
      const img = await this._loadImage(path);
      this._sprites[key] = { image: img, isGif: true };
      this._gifAnimations[key] = { 
        frames: [img], 
        frameDelays: [100], 
        frameCount: 1,
        frameWidth: img.width,
        frameHeight: img.height,
        isGif: true 
      };
      console.log(`GIF loaded as static: ${key} - ${img.width}x${img.height}`);
    } catch (e) {
      console.error(`Failed to load GIF ${key} as static:`, e);
      this._gifAnimations[key] = { image: null, fallback: true };
      this._sprites[key] = { image: null, fallback: true };
    }
  }

  /**
   * Get the current frame of a GIF animation based on time
   * Returns either a parsed frame canvas or the original animated image
   */
  getGifFrame(key, currentTime) {
    const gifData = this._gifAnimations[key];
    if (!gifData) {
      return null;
    }
    
    // If we have multiple parsed frames, use frame-by-frame animation
    if (gifData.frames && gifData.frames.length > 1) {
      // Calculate which frame to show based on time
      const totalDuration = gifData.frameDelays.reduce((a, b) => a + b, 0);
      const timeInCycle = currentTime % totalDuration;
      
      let accumulatedTime = 0;
      for (let i = 0; i < gifData.frames.length; i++) {
        accumulatedTime += gifData.frameDelays[i];
        if (timeInCycle < accumulatedTime) {
          return gifData.frames[i];
        }
      }
      return gifData.frames[0];
    }
    
    // Fallback to the animated image (browser handles animation)
    if (gifData.animatedImage) {
      return gifData.animatedImage;
    }
    
    // Last resort - return first frame if available
    if (gifData.frames && gifData.frames.length > 0) {
      return gifData.frames[0];
    }
    
    return null;
  }
}
