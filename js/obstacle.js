import { CONFIG } from './config.js';

let obstacleIdCounter = 0;

export class Obstacle {
  constructor(scale = 1.0) {
    this.id = 0; // Unique ID for tracking
    this.type = '';
    this.x = 0;
    this.y = 0;
    this.width = 0;
    this.height = 0;
    this.active = false;
    this._bombTimer = 0;
    this._bombs = []; // visual bomb drops
    this._scale = scale;  // Mobile scale factor
  }

  get hitbox() {
    const inset = CONFIG.player.hitboxInset;
    return {
      x: this.x + this.width * inset,
      y: this.y + this.height * inset,
      width: this.width * (1 - 2 * inset),
      height: this.height * (1 - 2 * inset)
    };
  }

  get isOffScreen() {
    return this.x + this.width < 0;
  }

  activate(type, x, y, width, height) {
    this.id = ++obstacleIdCounter; // Assign unique ID when activated
    this.type = type;
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.active = true;
    this._bombTimer = 0;
    this._bombs = [];
  }

  deactivate() {
    this.active = false;
    this._bombs = [];
  }

  update(deltaTime, gameSpeed) {
    if (!this.active) return;
    this.x -= gameSpeed * deltaTime;

    // Aerial obstacles drop bombs visually
    if (this.type === 'aerial') {
      this._bombTimer += deltaTime;
      // Drop a bomb every 0.4 seconds
      if (this._bombTimer >= 0.4) {
        this._bombTimer = 0;
        this._bombs.push({
          x: this.x + this.width / 2,
          y: this.y + this.height,
          vy: 0
        });
      }

      // Update bombs (fall with gravity)
      for (let i = this._bombs.length - 1; i >= 0; i--) {
        const bomb = this._bombs[i];
        bomb.vy += 400 * deltaTime; // gravity
        bomb.y += bomb.vy * deltaTime;
        bomb.x -= gameSpeed * deltaTime * 0.3; // slight drift

        // Remove if off screen (below ground)
        if (bomb.y > this.y + 200) {
          this._bombs.splice(i, 1);
        }
      }
    }

    if (this.isOffScreen) {
      this.deactivate();
    }
  }

  render(ctx, spriteManager, isNight = false) {
    if (!this.active) return;

    // Draw bombs first (behind the bird)
    if (this.type === 'aerial') {
      this._renderBombs(ctx, isNight);
    }

    const sprite = spriteManager ? spriteManager.getObstacleSprite(this.type) : null;
    if (sprite && sprite.image) {
      // Static draw — no animation frames, no rotation
      ctx.drawImage(sprite.image, this.x, this.y, this.width, this.height);
    } else {
      // Fallback
      if (this.type === 'aerial') {
        ctx.fillStyle = isNight ? '#aaa' : '#666';
      } else {
        ctx.fillStyle = isNight ? '#c0c0c0' : '#535353';
      }
      ctx.fillRect(this.x, this.y, this.width, this.height);
    }
  }

  _renderBombs(ctx, isNight) {
    const bombColor = isNight ? '#ff6666' : '#cc0000';
    const trailColor = isNight ? 'rgba(255,100,100,0.3)' : 'rgba(200,0,0,0.2)';

    for (const bomb of this._bombs) {
      // Bomb trail
      ctx.fillStyle = trailColor;
      ctx.beginPath();
      ctx.ellipse(bomb.x, bomb.y - 4, 3, 6, 0, 0, Math.PI * 2);
      ctx.fill();

      // Bomb body
      ctx.fillStyle = bombColor;
      ctx.beginPath();
      ctx.arc(bomb.x, bomb.y, 4, 0, Math.PI * 2);
      ctx.fill();

      // Bomb highlight
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.beginPath();
      ctx.arc(bomb.x - 1, bomb.y - 1, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
