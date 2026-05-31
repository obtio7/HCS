import { CONFIG } from './config.js';
import { Obstacle } from './obstacle.js';

export class ObstacleManager {
  constructor(canvasWidth, groundY, scale = 1.0) {
    this._canvasWidth = canvasWidth;
    this._groundY = groundY;
    this._scale = scale;  // Mobile scale factor
    this._pool = [];
    this._spawnTimer = 0;
    this._nextSpawnInterval = this._randomInterval(CONFIG.obstacles.spawnInterval);

    // Pre-populate pool
    for (let i = 0; i < 10; i++) {
      this._pool.push(new Obstacle(scale));
    }
  }

  get activeObstacles() {
    return this._pool.filter(o => o.active);
  }

  update(deltaTime, gameSpeed, score, aerialEnabled, spawnIntervalRange) {
    // Update existing obstacles
    for (const obstacle of this._pool) {
      if (obstacle.active) {
        obstacle.update(deltaTime, gameSpeed);
      }
    }

    // Spawn new obstacles
    this._spawnTimer += deltaTime * 1000; // convert to ms
    if (this._spawnTimer >= this._nextSpawnInterval) {
      this._spawnTimer = 0;
      this._nextSpawnInterval = this._randomInterval(spawnIntervalRange);
      this._trySpawn(gameSpeed, score, aerialEnabled);
    }
  }

  render(ctx, spriteManager, isNight = false) {
    for (const obstacle of this._pool) {
      if (obstacle.active) {
        obstacle.render(ctx, spriteManager, isNight);
      }
    }
  }

  reset() {
    for (const obstacle of this._pool) {
      obstacle.deactivate();
    }
    this._spawnTimer = 0;
    this._nextSpawnInterval = this._randomInterval(CONFIG.obstacles.spawnInterval);
  }

  resize(canvasWidth, groundY) {
    this._canvasWidth = canvasWidth;
    this._groundY = groundY;
  }

  _trySpawn(gameSpeed, score, aerialEnabled) {
    // Check minimum gap
    const active = this.activeObstacles;
    if (active.length > 0) {
      const last = active[active.length - 1];
      const gap = this._canvasWidth - (last.x + last.width);
      if (gap < CONFIG.obstacles.minGap) return;
    }

    // Decide type
    let type;
    if (aerialEnabled && Math.random() < 0.25) {
      type = 'aerial';
    } else {
      const rand = Math.random();
      if (rand < 0.33) type = 'ground_small';
      else if (rand < 0.66) type = 'ground_tall';
      else type = 'ground_group';
    }

    // Don't spawn aerial at same position as ground
    if (type === 'aerial') {
      const groundAtPos = active.find(o =>
        o.type !== 'aerial' &&
        Math.abs(o.x - this._canvasWidth) < o.width
      );
      if (groundAtPos) type = 'ground_small';
    }

    const dims = CONFIG.obstacles.types[type];
    const x = this._canvasWidth;
    
    // Apply mobile scale to obstacle dimensions
    const scaledWidth = Math.round(dims.width * this._scale);
    const scaledHeight = Math.round(dims.height * this._scale);
    const scaledPlayerHeight = Math.round(CONFIG.player.height * this._scale);
    
    let y;

    if (type === 'aerial') {
      // Birds fly at 3 different heights like the original Chrome Dino game:
      // 1. Low - player must jump over (near ground)
      // 2. Medium - player can duck under OR jump over
      // 3. High - player must duck under
      const heightChoice = Math.random();
      if (heightChoice < 0.33) {
        // Low bird - near ground level, player must jump
        y = this._groundY - scaledHeight - 5;
      } else if (heightChoice < 0.66) {
        // Medium bird - at player's standing head height
        y = this._groundY - scaledPlayerHeight - scaledHeight / 2;
      } else {
        // High bird - player must duck to avoid
        y = this._groundY - scaledPlayerHeight - scaledHeight - Math.round(20 * this._scale);
      }
    } else {
      y = this._groundY - scaledHeight;
    }

    // Get obstacle from pool
    let obstacle = this._pool.find(o => !o.active);
    if (!obstacle) {
      obstacle = new Obstacle(this._scale);
      this._pool.push(obstacle);
    }

    obstacle.activate(type, x, y, scaledWidth, scaledHeight);
  }

  _randomInterval(range) {
    return range.min + Math.random() * (range.max - range.min);
  }
}
