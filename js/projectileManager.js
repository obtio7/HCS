import { CONFIG } from './config.js';

/**
 * ProjectileManager - Handles bullets/arrows shot by cactus-group obstacles
 * Projectiles fly horizontally toward the player
 * Speed increases when player collects more than 70 pennies
 */
export class ProjectileManager {
  constructor(canvasWidth, groundY, scale = 1.0) {
    this._canvasWidth = canvasWidth;
    this._groundY = groundY;
    this._scale = scale;  // Mobile scale factor
    this._projectiles = [];
    this._baseSpeed = 150; // Bullet speed (slower, more dodgeable)
    this._maxSpeed = 300;  // Maximum speed after 70+ pennies
    this._projectileWidth = Math.round(8 * scale);  // Small bullet - scaled
    this._projectileHeight = Math.round(8 * scale); // Small bullet (circle) - scaled
    this._currentPennies = 0;
    this._currentScore = 0; // Track score for shooting chance
    this._obstaclesThatShot = new Set(); // Track which obstacles have already shot
    this._baseShootChance = 0.27; // 27% base chance
    this._shootChancePerThousand = 0.005; // +0.5% per 1000 score
  }

  /**
   * Update penny count to adjust arrow speed
   * @param {number} pennies - Current penny count
   */
  updatePennies(pennies) {
    this._currentPennies = pennies;
  }

  /**
   * Update score to adjust shooting chance
   * @param {number} score - Current score
   */
  updateScore(score) {
    this._currentScore = score;
  }

  /**
   * Get current shooting chance based on score
   * Starts at 27%, increases by 0.5% per 1000 score
   */
  get currentShootChance() {
    const thousands = Math.floor(this._currentScore / 1000);
    const bonus = thousands * this._shootChancePerThousand;
    return Math.min(this._baseShootChance + bonus, 0.8); // Cap at 80%
  }

  /**
   * Get current projectile speed based on pennies collected
   * Starts slow (200), increases slightly after 70 pennies, max 500
   */
  get currentSpeed() {
    if (this._currentPennies < 70) {
      return this._baseSpeed;
    }
    // After 70 pennies, gradually increase speed
    // Every 10 pennies above 70 adds 30 speed, up to max
    const extraPennies = this._currentPennies - 70;
    const speedBonus = Math.floor(extraPennies / 10) * 30;
    return Math.min(this._baseSpeed + speedBonus, this._maxSpeed);
  }

  /**
   * Maybe spawn a projectile from a cactus-group obstacle
   * Only 1 bullet per cactus-group obstacle (each obstacle can only shoot once)
   * Shooting chance increases with score
   * @param {Object} obstacle - The obstacle that might shoot
   */
  maybeShoot(obstacle) {
    // Only cactus-group can shoot
    if (obstacle.type !== 'ground_group') return;
    
    // Each obstacle can only shoot once - use obstacle's unique ID
    if (this._obstaclesThatShot.has(obstacle.id)) return;
    
    // Mark this obstacle as having attempted (whether it shoots or not)
    this._obstaclesThatShot.add(obstacle.id);
    
    // Random chance to shoot (increases with score)
    if (Math.random() > this.currentShootChance) return;

    // Create bullet at obstacle position
    // Shoot HIGH so player can duck under it (at player's head height)
    // Position bullet at about 60% of obstacle height from ground (higher up)
    // Use the obstacle's actual height (already scaled)
    const bulletY = this._groundY - obstacle.height * 0.85;
    
    this._projectiles.push({
      x: obstacle.x,
      y: bulletY,
      width: this._projectileWidth,
      height: this._projectileHeight,
      active: true
    });
  }

  /**
   * Update all projectiles
   * @param {number} deltaTime - Time since last frame in seconds
   * @param {number} gameSpeed - Current game/obstacle speed to add to bullet speed
   */
  update(deltaTime, gameSpeed = 300) {
    const bulletSpeed = this.currentSpeed + gameSpeed; // Bullet moves faster than obstacles
    
    for (const projectile of this._projectiles) {
      if (!projectile.active) continue;
      
      // Move bullet left (toward player) - must be faster than game scroll
      projectile.x -= bulletSpeed * deltaTime;
      
      // Deactivate if off screen (left side)
      if (projectile.x + projectile.width < 0) {
        projectile.active = false;
      }
    }
    
    // Clean up inactive projectiles
    this._projectiles = this._projectiles.filter(p => p.active);
  }

  /**
   * Check collision with player
   * @param {Object} playerHitbox - Player's hitbox {x, y, width, height}
   * @returns {boolean} True if any projectile hit the player
   */
  checkCollision(playerHitbox) {
    for (const projectile of this._projectiles) {
      if (!projectile.active) continue;
      
      // AABB collision check
      const hit = projectile.x < playerHitbox.x + playerHitbox.width &&
                  projectile.x + projectile.width > playerHitbox.x &&
                  projectile.y < playerHitbox.y + playerHitbox.height &&
                  projectile.y + projectile.height > playerHitbox.y;
      
      if (hit) {
        projectile.active = false;
        return true;
      }
    }
    return false;
  }

  /**
   * Render all projectiles as small bullets
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {boolean} isNight - Whether it's night theme
   */
  render(ctx, isNight = false) {
    for (const projectile of this._projectiles) {
      if (!projectile.active) continue;
      
      const centerX = projectile.x + projectile.width / 2;
      const centerY = projectile.y + projectile.height / 2;
      
      // Draw small circular bullet
      ctx.beginPath();
      ctx.arc(centerX, centerY, projectile.width / 2, 0, Math.PI * 2);
      
      // Bullet color - dark red/black
      ctx.fillStyle = isNight ? '#ff4444' : '#333333';
      ctx.fill();
      
      // Bullet outline
      ctx.strokeStyle = isNight ? '#ff8888' : '#000000';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  /**
   * Get all active projectiles (for external collision detection)
   */
  get activeProjectiles() {
    return this._projectiles.filter(p => p.active);
  }

  /**
   * Reset all projectiles (on game restart)
   */
  reset() {
    this._projectiles = [];
    this._obstaclesThatShot.clear(); // Clear the tracking set
  }

  /**
   * Resize handler
   */
  resize(canvasWidth, groundY) {
    this._canvasWidth = canvasWidth;
    this._groundY = groundY;
  }
}
