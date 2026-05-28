import { CONFIG } from './config.js';

export class DifficultyManager {
  constructor() {
    this._config = CONFIG.difficulty;
    this._gameSpeed = this._config.initialSpeed;
    this._timeSinceLastIncrease = 0;
    this._aerialEnabled = false;
  }

  get gameSpeed() { return this._gameSpeed; }
  get isMaxSpeed() { return this._gameSpeed >= this._config.maxSpeed; }
  get aerialObstaclesEnabled() { return this._aerialEnabled; }

  get spawnIntervalRange() {
    const progress = (this._gameSpeed - this._config.initialSpeed) /
      (this._config.maxSpeed - this._config.initialSpeed);
    const ratio = 1 - progress * (1 - this._config.minSpawnRatio);
    return {
      min: CONFIG.obstacles.spawnInterval.min * ratio,
      max: CONFIG.obstacles.spawnInterval.max * ratio
    };
  }

  update(deltaTime, score) {
    // Increase speed every second
    this._timeSinceLastIncrease += deltaTime;
    if (this._timeSinceLastIncrease >= 1) {
      this._timeSinceLastIncrease = 0;
      if (this._gameSpeed < this._config.maxSpeed) {
        this._gameSpeed = Math.min(
          this._gameSpeed + this._config.speedIncrement,
          this._config.maxSpeed
        );
      }
    }

    // Enable aerial obstacles
    if (this._gameSpeed > this._config.aerialUnlockSpeed || score >= this._config.aerialUnlockScore) {
      this._aerialEnabled = true;
    }
  }

  reset() {
    this._gameSpeed = this._config.initialSpeed;
    this._timeSinceLastIncrease = 0;
    this._aerialEnabled = false;
  }
}
