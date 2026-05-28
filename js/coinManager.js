import { CONFIG } from './config.js';

export class CoinManager {
  constructor(canvasWidth, groundY) {
    this._canvasWidth = canvasWidth;
    this._groundY = groundY;
    this._coins = [];
    this._pennyBags = []; // Penny bags that give 5-10 pennies
    this._treasureChests = []; // Treasure chests that give 15-20 pennies
    this._collected = 0;
    this._spawnTimer = 0;
    this._nextSpawnTime = this._randomSpawnTime();
    this._bagSpawnTimer = 0;
    this._nextBagSpawnTime = this._randomBagSpawnTime();
    this._treasureSpawnTimer = 0;
    this._nextTreasureSpawnTime = this._randomTreasureSpawnTime();
    this._lastBagCollectValue = 0;
  }

  get collected() { return this._collected; }
  get activeCoins() { return this._coins.filter(c => c.active); }
  get activePennyBags() { return this._pennyBags.filter(b => b.active); }
  get activeTreasureChests() { return this._treasureChests.filter(t => t.active); }
  get lastBagCollectValue() { return this._lastBagCollectValue; }

  update(deltaTime, gameSpeed, playerHitbox) {
    // Spawn new coins
    this._spawnTimer += deltaTime;
    if (this._spawnTimer >= this._nextSpawnTime) {
      this._spawnTimer = 0;
      this._nextSpawnTime = this._randomSpawnTime();
      this._spawnCoin(gameSpeed);
    }

    // Spawn new penny bags (less frequent)
    this._bagSpawnTimer += deltaTime;
    if (this._bagSpawnTimer >= this._nextBagSpawnTime) {
      this._bagSpawnTimer = 0;
      this._nextBagSpawnTime = this._randomBagSpawnTime();
      this._spawnPennyBag(gameSpeed);
    }

    // Spawn treasure chests (very rare)
    this._treasureSpawnTimer += deltaTime;
    if (this._treasureSpawnTimer >= this._nextTreasureSpawnTime) {
      this._treasureSpawnTimer = 0;
      this._nextTreasureSpawnTime = this._randomTreasureSpawnTime();
      this._spawnTreasureChest(gameSpeed);
    }

    // Update coins
    for (const coin of this._coins) {
      if (!coin.active) continue;

      coin.x -= gameSpeed * deltaTime;
      coin.animTimer += deltaTime;

      // Check collection (overlap with player)
      if (this._checkCollect(coin, playerHitbox)) {
        coin.active = false;
        coin.collected = true;
        this._collected++;
      }

      // Remove if off screen
      if (coin.x + coin.size < 0) {
        coin.active = false;
      }
    }

    // Update penny bags
    for (const bag of this._pennyBags) {
      if (!bag.active) continue;

      bag.x -= gameSpeed * deltaTime;
      bag.animTimer += deltaTime;

      // Check collection
      if (this._checkCollectBag(bag, playerHitbox)) {
        bag.active = false;
        bag.collected = true;
        // Give 5-10 random pennies
        const pennyValue = 5 + Math.floor(Math.random() * 6); // 5 to 10
        this._collected += pennyValue;
        this._lastBagCollectValue = pennyValue;
        bag.collectValue = pennyValue;
      }

      // Remove if off screen
      if (bag.x + bag.width < 0) {
        bag.active = false;
      }
    }

    // Update treasure chests
    for (const chest of this._treasureChests) {
      if (!chest.active) continue;

      chest.x -= gameSpeed * deltaTime;
      chest.animTimer += deltaTime;

      // Check collection
      if (this._checkCollectChest(chest, playerHitbox)) {
        chest.active = false;
        chest.collected = true;
        // Give 15-20 random pennies
        const pennyValue = 15 + Math.floor(Math.random() * 6); // 15 to 20
        this._collected += pennyValue;
        this._lastBagCollectValue = pennyValue;
        chest.collectValue = pennyValue;
      }

      // Remove if off screen
      if (chest.x + chest.width < 0) {
        chest.active = false;
      }
    }
  }

  render(ctx, isNight = false) {
    // Render coins
    for (const coin of this._coins) {
      if (!coin.active) continue;

      const x = coin.x;
      const y = coin.y;
      const size = coin.size;
      const bounce = Math.sin(coin.animTimer * 4) * 3;

      // Coin glow
      ctx.fillStyle = isNight ? 'rgba(255, 215, 0, 0.2)' : 'rgba(255, 200, 0, 0.15)';
      ctx.beginPath();
      ctx.arc(x + size / 2, y + size / 2 + bounce, size * 0.8, 0, Math.PI * 2);
      ctx.fill();

      // Coin body
      const gradient = ctx.createRadialGradient(
        x + size / 2 - 2, y + size / 2 + bounce - 2, 1,
        x + size / 2, y + size / 2 + bounce, size / 2
      );
      gradient.addColorStop(0, '#ffe44d');
      gradient.addColorStop(0.7, '#ffc107');
      gradient.addColorStop(1, '#ff9800');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x + size / 2, y + size / 2 + bounce, size / 2, 0, Math.PI * 2);
      ctx.fill();

      // Coin border
      ctx.strokeStyle = '#e6a800';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(x + size / 2, y + size / 2 + bounce, size / 2, 0, Math.PI * 2);
      ctx.stroke();

      // Dollar sign or star
      ctx.fillStyle = '#b8860b';
      ctx.font = `bold ${size * 0.5}px Arial, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('\u00A2', x + size / 2, y + size / 2 + bounce + 1);
    }

    // Render penny bags
    for (const bag of this._pennyBags) {
      if (!bag.active) continue;

      const x = bag.x;
      const y = bag.y;
      const w = bag.width;
      const h = bag.height;
      const bounce = Math.sin(bag.animTimer * 3) * 4;

      // Bag glow (golden)
      ctx.fillStyle = isNight ? 'rgba(255, 215, 0, 0.25)' : 'rgba(255, 200, 0, 0.2)';
      ctx.beginPath();
      ctx.ellipse(x + w / 2, y + h / 2 + bounce, w * 0.7, h * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();

      // Bag body (brown sack)
      const bagGradient = ctx.createLinearGradient(x, y + bounce, x + w, y + h + bounce);
      bagGradient.addColorStop(0, '#d4a574');
      bagGradient.addColorStop(0.5, '#c49464');
      bagGradient.addColorStop(1, '#a07850');
      ctx.fillStyle = bagGradient;
      
      // Draw bag shape
      ctx.beginPath();
      ctx.moveTo(x + w * 0.2, y + h * 0.3 + bounce);
      ctx.quadraticCurveTo(x - w * 0.05, y + h * 0.6 + bounce, x + w * 0.15, y + h + bounce);
      ctx.lineTo(x + w * 0.85, y + h + bounce);
      ctx.quadraticCurveTo(x + w * 1.05, y + h * 0.6 + bounce, x + w * 0.8, y + h * 0.3 + bounce);
      ctx.closePath();
      ctx.fill();

      // Bag tie/neck
      ctx.fillStyle = '#8b6914';
      ctx.beginPath();
      ctx.ellipse(x + w / 2, y + h * 0.3 + bounce, w * 0.35, h * 0.12, 0, 0, Math.PI * 2);
      ctx.fill();

      // Bag top (gathered)
      ctx.fillStyle = '#c49464';
      ctx.beginPath();
      ctx.moveTo(x + w * 0.25, y + h * 0.3 + bounce);
      ctx.quadraticCurveTo(x + w * 0.5, y - h * 0.1 + bounce, x + w * 0.75, y + h * 0.3 + bounce);
      ctx.closePath();
      ctx.fill();

      // Dollar sign on bag
      ctx.fillStyle = '#ffd700';
      ctx.font = `bold ${h * 0.35}px Arial, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('$', x + w / 2, y + h * 0.6 + bounce);

      // Sparkle effect
      const sparklePhase = bag.animTimer * 5;
      ctx.fillStyle = 'rgba(255, 255, 200, 0.8)';
      for (let i = 0; i < 3; i++) {
        const angle = sparklePhase + i * (Math.PI * 2 / 3);
        const sparkleX = x + w / 2 + Math.cos(angle) * w * 0.5;
        const sparkleY = y + h * 0.4 + bounce + Math.sin(angle) * h * 0.3;
        const sparkleSize = 2 + Math.sin(sparklePhase + i) * 1;
        ctx.beginPath();
        ctx.arc(sparkleX, sparkleY, sparkleSize, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Render treasure chests
    for (const chest of this._treasureChests) {
      if (!chest.active) continue;

      const x = chest.x;
      const y = chest.y;
      const w = chest.width;
      const h = chest.height;
      const bounce = Math.sin(chest.animTimer * 2.5) * 3;

      // Treasure glow (bright golden)
      ctx.fillStyle = isNight ? 'rgba(255, 215, 0, 0.4)' : 'rgba(255, 200, 0, 0.35)';
      ctx.beginPath();
      ctx.ellipse(x + w / 2, y + h / 2 + bounce, w * 0.8, h * 0.7, 0, 0, Math.PI * 2);
      ctx.fill();

      // Chest body (wooden brown)
      const chestGradient = ctx.createLinearGradient(x, y + bounce, x, y + h + bounce);
      chestGradient.addColorStop(0, '#8b4513');
      chestGradient.addColorStop(0.5, '#a0522d');
      chestGradient.addColorStop(1, '#6b3510');
      ctx.fillStyle = chestGradient;
      ctx.beginPath();
      ctx.roundRect(x, y + h * 0.35 + bounce, w, h * 0.65, 4);
      ctx.fill();

      // Chest lid (curved top)
      ctx.fillStyle = '#8b4513';
      ctx.beginPath();
      ctx.moveTo(x, y + h * 0.4 + bounce);
      ctx.quadraticCurveTo(x + w / 2, y - h * 0.1 + bounce, x + w, y + h * 0.4 + bounce);
      ctx.lineTo(x + w, y + h * 0.5 + bounce);
      ctx.lineTo(x, y + h * 0.5 + bounce);
      ctx.closePath();
      ctx.fill();

      // Gold trim and lock
      ctx.fillStyle = '#ffd700';
      ctx.beginPath();
      ctx.roundRect(x + w * 0.1, y + h * 0.42 + bounce, w * 0.8, h * 0.08, 2);
      ctx.fill();
      ctx.beginPath();
      ctx.roundRect(x + w * 0.35, y + h * 0.5 + bounce, w * 0.3, h * 0.2, 3);
      ctx.fill();

      // Coins spilling out
      ctx.fillStyle = '#ffc107';
      for (let i = 0; i < 3; i++) {
        const coinX = x + w * 0.3 + i * w * 0.2;
        const coinY = y + h * 0.15 + bounce + Math.sin(chest.animTimer * 3 + i) * 3;
        ctx.beginPath();
        ctx.arc(coinX, coinY, w * 0.08, 0, Math.PI * 2);
        ctx.fill();
      }

      // Sparkle effects
      const sparklePhase = chest.animTimer * 6;
      ctx.fillStyle = 'rgba(255, 255, 150, 0.9)';
      for (let i = 0; i < 5; i++) {
        const angle = sparklePhase + i * (Math.PI * 2 / 5);
        const sparkleX = x + w / 2 + Math.cos(angle) * w * 0.6;
        const sparkleY = y + h * 0.3 + bounce + Math.sin(angle) * h * 0.4;
        const sparkleSize = 3 + Math.sin(sparklePhase + i * 0.5) * 1.5;
        ctx.beginPath();
        ctx.arc(sparkleX, sparkleY, sparkleSize, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
  }

  _spawnCoin(gameSpeed) {
    const size = 20;
    const x = this._canvasWidth + Math.random() * 100;

    // Random height — some on ground, some in air (jumpable)
    const rand = Math.random();
    let y;
    if (rand < 0.5) {
      // On ground level
      y = this._groundY - size - 5;
    } else if (rand < 0.8) {
      // Mid-air (reachable by jumping)
      y = this._groundY - size - 60 - Math.random() * 30;
    } else {
      // High up
      y = this._groundY - size - 90 - Math.random() * 20;
    }

    // Reuse inactive coin or create new
    let coin = this._coins.find(c => !c.active);
    if (!coin) {
      coin = { active: false };
      this._coins.push(coin);
    }

    coin.active = true;
    coin.x = x;
    coin.y = y;
    coin.size = size;
    coin.animTimer = Math.random() * Math.PI * 2;
    coin.collected = false;
  }

  _spawnPennyBag(gameSpeed) {
    const width = 35;
    const height = 40;
    const x = this._canvasWidth + Math.random() * 150;

    // Penny bags spawn on ground or slightly elevated
    const rand = Math.random();
    let y;
    if (rand < 0.7) {
      // On ground level
      y = this._groundY - height - 5;
    } else {
      // Slightly elevated (reachable by small jump)
      y = this._groundY - height - 40 - Math.random() * 20;
    }

    // Reuse inactive bag or create new
    let bag = this._pennyBags.find(b => !b.active);
    if (!bag) {
      bag = { active: false };
      this._pennyBags.push(bag);
    }

    bag.active = true;
    bag.x = x;
    bag.y = y;
    bag.width = width;
    bag.height = height;
    bag.animTimer = Math.random() * Math.PI * 2;
    bag.collected = false;
    bag.collectValue = 0;
  }

  _spawnTreasureChest(gameSpeed) {
    const width = 45;
    const height = 38;
    const x = this._canvasWidth + Math.random() * 200;

    // Treasure chests always spawn on ground (they're heavy!)
    const y = this._groundY - height - 5;

    // Reuse inactive chest or create new
    let chest = this._treasureChests.find(t => !t.active);
    if (!chest) {
      chest = { active: false };
      this._treasureChests.push(chest);
    }

    chest.active = true;
    chest.x = x;
    chest.y = y;
    chest.width = width;
    chest.height = height;
    chest.animTimer = Math.random() * Math.PI * 2;
    chest.collected = false;
    chest.collectValue = 0;
  }

  _checkCollect(coin, playerHitbox) {
    const cx = coin.x;
    const cy = coin.y;
    const cs = coin.size;

    return (
      playerHitbox.x < cx + cs &&
      playerHitbox.x + playerHitbox.width > cx &&
      playerHitbox.y < cy + cs &&
      playerHitbox.y + playerHitbox.height > cy
    );
  }

  _checkCollectBag(bag, playerHitbox) {
    return (
      playerHitbox.x < bag.x + bag.width &&
      playerHitbox.x + playerHitbox.width > bag.x &&
      playerHitbox.y < bag.y + bag.height &&
      playerHitbox.y + playerHitbox.height > bag.y
    );
  }

  _checkCollectChest(chest, playerHitbox) {
    return (
      playerHitbox.x < chest.x + chest.width &&
      playerHitbox.x + playerHitbox.width > chest.x &&
      playerHitbox.y < chest.y + chest.height &&
      playerHitbox.y + playerHitbox.height > chest.y
    );
  }

  _randomSpawnTime() {
    return 1.5 + Math.random() * 2.5; // 1.5 to 4 seconds
  }

  _randomBagSpawnTime() {
    return 8 + Math.random() * 12; // 8 to 20 seconds (rare spawn)
  }

  _randomTreasureSpawnTime() {
    return 25 + Math.random() * 20; // 25 to 45 seconds (very rare spawn)
  }

  reset() {
    for (const coin of this._coins) {
      coin.active = false;
    }
    for (const bag of this._pennyBags) {
      bag.active = false;
    }
    for (const chest of this._treasureChests) {
      chest.active = false;
    }
    this._collected = 0;
    this._spawnTimer = 0;
    this._nextSpawnTime = this._randomSpawnTime();
    this._bagSpawnTimer = 0;
    this._nextBagSpawnTime = this._randomBagSpawnTime();
    this._treasureSpawnTimer = 0;
    this._nextTreasureSpawnTime = this._randomTreasureSpawnTime();
    this._lastBagCollectValue = 0;
  }

  resize(canvasWidth, groundY) {
    this._canvasWidth = canvasWidth;
    this._groundY = groundY;
  }
}
