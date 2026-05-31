import { CONFIG } from './config.js';

export class ScoreSystem {
  constructor() {
    this._score = 0;
    this._highScore = 0;
    this._distanceAccumulator = 0;
    this._milestoneFlashTimer = 0;
    this._isMilestoneFlashing = false;
    this._lastMilestone = 0;
    this.loadHighScore();
  }

  get score() { return this._score; }
  get highScore() { return this._highScore; }
  get isMilestoneFlashing() { return this._isMilestoneFlashing; }

  get displayScore() {
    return String(this._score).padStart(5, '0');
  }

  get displayHighScore() {
    return 'HI ' + String(this._highScore).padStart(5, '0');
  }

  update(distanceDelta, deltaTime) {
    if (this._score >= CONFIG.scoring.maxScore) return false;

    this._distanceAccumulator += distanceDelta;
    let milestone = false;

    while (this._distanceAccumulator >= 10) {
      this._distanceAccumulator -= 10;
      this._score = Math.min(this._score + CONFIG.scoring.pointsPer10px, CONFIG.scoring.maxScore);

      // Check milestone
      if (this._score > 0 && this._score % CONFIG.scoring.milestoneInterval === 0 && this._score !== this._lastMilestone) {
        this._lastMilestone = this._score;
        this._isMilestoneFlashing = true;
        this._milestoneFlashTimer = CONFIG.scoring.milestoneFlashDuration / 1000;
        milestone = true;
      }
    }

    // Update flash timer
    if (this._isMilestoneFlashing) {
      this._milestoneFlashTimer -= deltaTime;
      if (this._milestoneFlashTimer <= 0) {
        this._isMilestoneFlashing = false;
      }
    }

    return milestone;
  }

  saveHighScore() {
    if (this._score > this._highScore) {
      this._highScore = this._score;
    }
    try {
      localStorage.setItem('chromeDinoClone_highScore', JSON.stringify({
        highScore: this._highScore,
        lastUpdated: new Date().toISOString()
      }));
    } catch (e) {
      // localStorage unavailable (private browsing)
    }
  }

  loadHighScore() {
    try {
      const data = localStorage.getItem('chromeDinoClone_highScore');
      if (data) {
        const parsed = JSON.parse(data);
        this._highScore = parsed.highScore || 0;
      }
    } catch (e) {
      this._highScore = 0;
    }
  }

  reset() {
    this._score = 0;
    this._distanceAccumulator = 0;
    this._milestoneFlashTimer = 0;
    this._isMilestoneFlashing = false;
    this._lastMilestone = 0;
  }
}
