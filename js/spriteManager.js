import { CONFIG } from './config.js';

export class SpriteManager {
  constructor() {
    this._sprites = {};
    this._spriteSheets = {};
  }

  async loadAll() {
    const spriteConfig = CONFIG.sprites;

    // Load all player characters
    if (spriteConfig.players && spriteConfig.players.length > 0) {
      for (const playerConfig of spriteConfig.players) {
        await this._loadPlayerSprites(playerConfig.id, playerConfig);
      }
    }
    
    // Also load default player sprites (backwards compatibility)
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

    // Load obstacle sprites
    for (const [key, config] of Object.entries(spriteConfig.obstacles)) {
      if (config.frames) {
        await this._loadSpriteSheet(`obstacle_${key}`, config.path, config.frames);
      } else {
        await this._loadSprite(`obstacle_${key}`, config.path);
      }
    }

    // Load ground and background
    if (spriteConfig.ground) {
      await this._loadSprite('ground', spriteConfig.ground.path);
    }
    if (spriteConfig.background) {
      await this._loadSprite('background', spriteConfig.background.path);
    }
  }

  async _loadPlayerSprites(playerId, playerConfig) {
    // Load run sprite
    if (playerConfig.run) {
      const runFrames = playerConfig.run.frames || 1;
      if (runFrames > 1) {
        await this._loadSpriteSheet(`${playerId}_run`, playerConfig.run.path, runFrames);
      } else {
        await this._loadSprite(`${playerId}_run`, playerConfig.run.path);
      }
    }
    // Load jump sprite
    if (playerConfig.jump) {
      await this._loadSprite(`${playerId}_jump`, playerConfig.jump.path);
    }
    // Load duck sprite
    if (playerConfig.duck) {
      const duckFrames = playerConfig.duck.frames || 1;
      if (duckFrames > 1) {
        await this._loadSpriteSheet(`${playerId}_duck`, playerConfig.duck.path, duckFrames);
      } else {
        await this._loadSprite(`${playerId}_duck`, playerConfig.duck.path);
      }
    }
  }

  getSprite(key) {
    return this._sprites[key] || null;
  }

  getSpriteSheet(key) {
    return this._spriteSheets[key] || null;
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
      console.log(`Sprite sheet loaded: ${key} - ${img.width}x${img.height}, ${frameCount} frames, frameWidth=${frameWidth}`);
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
}
