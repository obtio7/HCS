import { CONFIG } from './config.js';

export class CoinManager {
  constructor(canvasWidth, groundY, scale = 1.0) {
    this._canvasWidth = canvasWidth;
    this._groundY = groundY;
    this._scale = scale;  // Mobile scale factor
    this._coins = [];
    this._pennyBags = []; // Penny bags that give 5-10 pennies
    this._treasureChests = []; // Treasure chests that give 15-20 pennies
    this._trumpCards = []; // Trump cards that double pennies for 20 seconds
    this._einsteinCards = []; // Einstein cards that slow down time
    this._collected = 0;
    this._spawnTimer = 0;
    this._nextSpawnTime = this._randomSpawnTime();
    this._bagSpawnTimer = 0;
    this._nextBagSpawnTime = this._randomBagSpawnTime();
    this._treasureSpawnTimer = 0;
    this._nextTreasureSpawnTime = this._randomTreasureSpawnTime();
    
    // Random chance-based spawning for cards (instead of fixed timers)
    this._trumpCardSpawnCooldown = 10; // Initial cooldown before first possible spawn
    this._einsteinCardSpawnCooldown = 10;
    this._minCardSpawnCooldown = 20; // Minimum 20 seconds between same card type spawns
    this._cardSpawnChancePerSecond = 0.04; // 4% chance per second to spawn each card type
    
    this._lastBagCollectValue = 0;
    
    // Trump Card power-up state
    this._trumpCardActive = false;
    this._trumpCardTimer = 0;
    this._trumpCardDuration = 20; // 20 seconds of double pennies
    this._trumpCardJustCollected = false; // Flag to notify game.js
    
    // Einstein Card power-up state (slow motion)
    this._einsteinCardActive = false;
    this._einsteinCardTimer = 0;
    this._einsteinCardDuration = 15; // 15 seconds of slow motion
    this._einsteinCardJustCollected = false;
  }

  get collected() { return this._collected; }
  get activeCoins() { return this._coins.filter(c => c.active); }
  get activePennyBags() { return this._pennyBags.filter(b => b.active); }
  get activeTreasureChests() { return this._treasureChests.filter(t => t.active); }
  get activeTrumpCards() { return this._trumpCards.filter(t => t.active); }
  get activeEinsteinCards() { return this._einsteinCards.filter(e => e.active); }
  get lastBagCollectValue() { return this._lastBagCollectValue; }
  get trumpCardActive() { return this._trumpCardActive; }
  get trumpCardTimeRemaining() { return Math.ceil(this._trumpCardTimer); }
  get trumpCardJustCollected() { 
    const val = this._trumpCardJustCollected;
    this._trumpCardJustCollected = false; // Reset after reading
    return val;
  }
  get pennyMultiplier() { return this._trumpCardActive ? 2 : 1; }
  get einsteinCardActive() { return this._einsteinCardActive; }
  get einsteinCardTimeRemaining() { return Math.ceil(this._einsteinCardTimer); }
  get einsteinCardJustCollected() {
    const val = this._einsteinCardJustCollected;
    this._einsteinCardJustCollected = false;
    return val;
  }
  get speedMultiplier() { return 1; } // No longer slows down - Ghost Mode instead
  get isGhostMode() { return this._einsteinCardActive; } // Ghost mode when Bigstin card active

  update(deltaTime, gameSpeed, playerHitbox) {
    // Update Trump Card timer
    if (this._trumpCardActive) {
      this._trumpCardTimer -= deltaTime;
      if (this._trumpCardTimer <= 0) {
        this._trumpCardActive = false;
        this._trumpCardTimer = 0;
      }
    }

    // Update Einstein Card timer
    if (this._einsteinCardActive) {
      this._einsteinCardTimer -= deltaTime;
      if (this._einsteinCardTimer <= 0) {
        this._einsteinCardActive = false;
        this._einsteinCardTimer = 0;
      }
    }

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

    // Random chance-based spawning for Trump Cards
    if (this._trumpCardSpawnCooldown > 0) {
      this._trumpCardSpawnCooldown -= deltaTime;
    } else {
      // Roll for spawn chance each frame
      const trumpSpawnChance = this._cardSpawnChancePerSecond * deltaTime;
      if (Math.random() < trumpSpawnChance) {
        this._spawnTrumpCard(gameSpeed);
        this._trumpCardSpawnCooldown = this._minCardSpawnCooldown; // Reset cooldown
      }
    }

    // Random chance-based spawning for Einstein/Bigstin Cards
    if (this._einsteinCardSpawnCooldown > 0) {
      this._einsteinCardSpawnCooldown -= deltaTime;
    } else {
      // Roll for spawn chance each frame
      const einsteinSpawnChance = this._cardSpawnChancePerSecond * deltaTime;
      if (Math.random() < einsteinSpawnChance) {
        this._spawnEinsteinCard(gameSpeed);
        this._einsteinCardSpawnCooldown = this._minCardSpawnCooldown; // Reset cooldown
      }
    }

    // Penny multiplier based on Trump Card
    const multiplier = this._trumpCardActive ? 2 : 1;

    // Update coins
    for (const coin of this._coins) {
      if (!coin.active) continue;

      coin.x -= gameSpeed * deltaTime;
      coin.animTimer += deltaTime;

      // Check collection (overlap with player)
      if (this._checkCollect(coin, playerHitbox)) {
        coin.active = false;
        coin.collected = true;
        this._collected += multiplier; // Apply multiplier
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
        // Give 5-10 random pennies (doubled if Trump Card active)
        const basePennyValue = 5 + Math.floor(Math.random() * 6); // 5 to 10
        const pennyValue = basePennyValue * multiplier;
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
        // Give 15-20 random pennies (doubled if Trump Card active)
        const basePennyValue = 15 + Math.floor(Math.random() * 6); // 15 to 20
        const pennyValue = basePennyValue * multiplier;
        this._collected += pennyValue;
        this._lastBagCollectValue = pennyValue;
        chest.collectValue = pennyValue;
      }

      // Remove if off screen
      if (chest.x + chest.width < 0) {
        chest.active = false;
      }
    }

    // Update Trump Cards
    for (const card of this._trumpCards) {
      if (!card.active) continue;

      card.x -= gameSpeed * deltaTime;
      card.animTimer += deltaTime;

      // Check collection
      if (this._checkCollectTrumpCard(card, playerHitbox)) {
        card.active = false;
        card.collected = true;
        // Activate Trump Card power-up
        this._trumpCardActive = true;
        this._trumpCardTimer = this._trumpCardDuration;
        this._trumpCardJustCollected = true;
      }

      // Remove if off screen
      if (card.x + card.width < 0) {
        card.active = false;
      }
    }

    // Update Einstein Cards
    for (const card of this._einsteinCards) {
      if (!card.active) continue;

      card.x -= gameSpeed * deltaTime;
      card.animTimer += deltaTime;

      // Check collection
      if (this._checkCollectEinsteinCard(card, playerHitbox)) {
        card.active = false;
        card.collected = true;
        // Activate Einstein Card power-up (slow motion)
        this._einsteinCardActive = true;
        this._einsteinCardTimer = this._einsteinCardDuration;
        this._einsteinCardJustCollected = true;
      }

      // Remove if off screen
      if (card.x + card.width < 0) {
        card.active = false;
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

    // Render Trump Cards
    for (const card of this._trumpCards) {
      if (!card.active) continue;

      const x = card.x;
      const y = card.y;
      const w = card.width;
      const h = card.height;
      const bounce = Math.sin(card.animTimer * 3) * 5;
      const rotate = Math.sin(card.animTimer * 2) * 0.1;

      ctx.save();
      ctx.translate(x + w / 2, y + h / 2 + bounce);
      ctx.rotate(rotate);

      // Card glow (red/gold patriotic)
      ctx.fillStyle = isNight ? 'rgba(255, 50, 50, 0.4)' : 'rgba(255, 100, 50, 0.35)';
      ctx.beginPath();
      ctx.ellipse(0, 0, w * 0.8, h * 0.7, 0, 0, Math.PI * 2);
      ctx.fill();

      // Card body (white with gold border)
      const cardGradient = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
      cardGradient.addColorStop(0, '#fff8e7');
      cardGradient.addColorStop(0.5, '#ffffff');
      cardGradient.addColorStop(1, '#fff8e7');
      ctx.fillStyle = cardGradient;
      ctx.beginPath();
      ctx.roundRect(-w / 2, -h / 2, w, h, 6);
      ctx.fill();

      // Gold border
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(-w / 2 + 2, -h / 2 + 2, w - 4, h - 4, 4);
      ctx.stroke();

      // Red inner border
      ctx.strokeStyle = '#cc0000';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(-w / 2 + 5, -h / 2 + 5, w - 10, h - 10, 3);
      ctx.stroke();

      // "TRUMP" text at top
      ctx.fillStyle = '#cc0000';
      ctx.font = `bold ${h * 0.15}px Arial, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('TRUMP', 0, -h * 0.28);

      // Star in center
      ctx.fillStyle = '#ffd700';
      this._drawStar(ctx, 0, h * 0.05, w * 0.25, 5);

      // "CARD" text at bottom
      ctx.fillStyle = '#cc0000';
      ctx.font = `bold ${h * 0.12}px Arial, sans-serif`;
      ctx.fillText('CARD', 0, h * 0.32);

      // "2X" indicator
      ctx.fillStyle = '#006400';
      ctx.font = `bold ${h * 0.1}px Arial, sans-serif`;
      ctx.fillText('2X PENNY', 0, -h * 0.42);

      ctx.restore();

      // Sparkle effects around card
      const sparklePhase = card.animTimer * 8;
      ctx.fillStyle = 'rgba(255, 215, 0, 0.9)';
      for (let i = 0; i < 6; i++) {
        const angle = sparklePhase + i * (Math.PI * 2 / 6);
        const sparkleX = x + w / 2 + Math.cos(angle) * w * 0.7;
        const sparkleY = y + h / 2 + bounce + Math.sin(angle) * h * 0.6;
        const sparkleSize = 3 + Math.sin(sparklePhase + i) * 2;
        ctx.beginPath();
        ctx.arc(sparkleX, sparkleY, sparkleSize, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Render Einstein Cards
    for (const card of this._einsteinCards) {
      if (!card.active) continue;

      const x = card.x;
      const y = card.y;
      const w = card.width;
      const h = card.height;
      const bounce = Math.sin(card.animTimer * 2.5) * 4;
      const rotate = Math.sin(card.animTimer * 1.5) * 0.08;

      ctx.save();
      ctx.translate(x + w / 2, y + h / 2 + bounce);
      ctx.rotate(rotate);

      // Card glow (blue/purple science theme)
      ctx.fillStyle = isNight ? 'rgba(100, 150, 255, 0.4)' : 'rgba(80, 120, 255, 0.35)';
      ctx.beginPath();
      ctx.ellipse(0, 0, w * 0.8, h * 0.7, 0, 0, Math.PI * 2);
      ctx.fill();

      // Card body (light blue gradient)
      const cardGradient = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
      cardGradient.addColorStop(0, '#e8f4fc');
      cardGradient.addColorStop(0.5, '#ffffff');
      cardGradient.addColorStop(1, '#e8f4fc');
      ctx.fillStyle = cardGradient;
      ctx.beginPath();
      ctx.roundRect(-w / 2, -h / 2, w, h, 6);
      ctx.fill();

      // Blue border
      ctx.strokeStyle = '#2196f3';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(-w / 2 + 2, -h / 2 + 2, w - 4, h - 4, 4);
      ctx.stroke();

      // Purple inner border
      ctx.strokeStyle = '#9c27b0';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(-w / 2 + 5, -h / 2 + 5, w - 10, h - 10, 3);
      ctx.stroke();

      // "BIGSTIN" text at top
      ctx.fillStyle = '#1565c0';
      ctx.font = `bold ${h * 0.13}px Arial, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('BIGSTIN', 0, -h * 0.32);

      // E=mc² formula in center
      ctx.fillStyle = '#9c27b0';
      ctx.font = `bold ${h * 0.18}px Arial, sans-serif`;
      ctx.fillText('E=mc²', 0, h * 0.02);

      // "CARD" text at bottom
      ctx.fillStyle = '#1565c0';
      ctx.font = `bold ${h * 0.1}px Arial, sans-serif`;
      ctx.fillText('CARD', 0, h * 0.28);

      // "GHOST MODE" indicator
      ctx.fillStyle = '#7b1fa2';
      ctx.font = `bold ${h * 0.09}px Arial, sans-serif`;
      ctx.fillText('GHOST MODE', 0, -h * 0.44);

      // Brain icon (simple)
      ctx.fillStyle = '#e91e63';
      ctx.beginPath();
      ctx.arc(-w * 0.25, h * 0.02, w * 0.08, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(-w * 0.18, h * 0.0, w * 0.06, 0, Math.PI * 2);
      ctx.fill();

      // Atom symbol on right
      ctx.strokeStyle = '#2196f3';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(w * 0.22, h * 0.02, w * 0.1, w * 0.04, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(w * 0.22, h * 0.02, w * 0.1, w * 0.04, Math.PI / 3, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(w * 0.22, h * 0.02, w * 0.1, w * 0.04, -Math.PI / 3, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#2196f3';
      ctx.beginPath();
      ctx.arc(w * 0.22, h * 0.02, w * 0.03, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();

      // Sparkle effects around card (blue/purple)
      const sparklePhase2 = card.animTimer * 6;
      for (let i = 0; i < 6; i++) {
        const angle = sparklePhase2 + i * (Math.PI * 2 / 6);
        const sparkleX = x + w / 2 + Math.cos(angle) * w * 0.7;
        const sparkleY = y + h / 2 + bounce + Math.sin(angle) * h * 0.6;
        const sparkleSize = 2.5 + Math.sin(sparklePhase2 + i) * 1.5;
        ctx.fillStyle = i % 2 === 0 ? 'rgba(33, 150, 243, 0.9)' : 'rgba(156, 39, 176, 0.9)';
        ctx.beginPath();
        ctx.arc(sparkleX, sparkleY, sparkleSize, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
  }

  _spawnCoin(gameSpeed) {
    const size = Math.round(20 * this._scale);
    const x = this._canvasWidth + Math.random() * 100;

    // Random height — some on ground, some in air (jumpable)
    // Scale the height offsets for mobile
    const rand = Math.random();
    let y;
    if (rand < 0.5) {
      // On ground level
      y = this._groundY - size - 5;
    } else if (rand < 0.8) {
      // Mid-air (reachable by jumping) - scale the jump height
      y = this._groundY - size - Math.round(60 * this._scale) - Math.random() * Math.round(30 * this._scale);
    } else {
      // High up - scale the height
      y = this._groundY - size - Math.round(90 * this._scale) - Math.random() * Math.round(20 * this._scale);
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
    const width = Math.round(35 * this._scale);
    const height = Math.round(40 * this._scale);
    const x = this._canvasWidth + Math.random() * 150;

    // Penny bags spawn on ground or slightly elevated
    const rand = Math.random();
    let y;
    if (rand < 0.7) {
      // On ground level
      y = this._groundY - height - 5;
    } else {
      // Slightly elevated (reachable by small jump) - scale the height
      y = this._groundY - height - Math.round(40 * this._scale) - Math.random() * Math.round(20 * this._scale);
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
    const width = Math.round(45 * this._scale);
    const height = Math.round(38 * this._scale);
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

  _spawnTrumpCard(gameSpeed) {
    const width = Math.round(40 * this._scale);
    const height = Math.round(55 * this._scale);
    const x = this._canvasWidth + Math.random() * 200;

    // Trump Cards spawn at various heights - scale the heights
    const rand = Math.random();
    let y;
    if (rand < 0.5) {
      // On ground level
      y = this._groundY - height - 5;
    } else if (rand < 0.8) {
      // Mid-air
      y = this._groundY - height - Math.round(50 * this._scale) - Math.random() * Math.round(30 * this._scale);
    } else {
      // High up
      y = this._groundY - height - Math.round(80 * this._scale) - Math.random() * Math.round(20 * this._scale);
    }

    // Reuse inactive card or create new
    let card = this._trumpCards.find(c => !c.active);
    if (!card) {
      card = { active: false };
      this._trumpCards.push(card);
    }

    card.active = true;
    card.x = x;
    card.y = y;
    card.width = width;
    card.height = height;
    card.animTimer = Math.random() * Math.PI * 2;
    card.collected = false;
  }

  _checkCollectTrumpCard(card, playerHitbox) {
    return (
      playerHitbox.x < card.x + card.width &&
      playerHitbox.x + playerHitbox.width > card.x &&
      playerHitbox.y < card.y + card.height &&
      playerHitbox.y + playerHitbox.height > card.y
    );
  }

  _drawStar(ctx, cx, cy, radius, points) {
    const outerRadius = radius;
    const innerRadius = radius * 0.4;
    
    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const r = i % 2 === 0 ? outerRadius : innerRadius;
      const angle = (i * Math.PI) / points - Math.PI / 2;
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.closePath();
    ctx.fill();
  }

  _spawnEinsteinCard(gameSpeed) {
    const width = Math.round(40 * this._scale);
    const height = Math.round(55 * this._scale);
    const x = this._canvasWidth + Math.random() * 200;

    // Einstein Cards spawn at various heights - scale the heights
    const rand = Math.random();
    let y;
    if (rand < 0.5) {
      // On ground level
      y = this._groundY - height - 5;
    } else if (rand < 0.8) {
      // Mid-air
      y = this._groundY - height - Math.round(50 * this._scale) - Math.random() * Math.round(30 * this._scale);
    } else {
      // High up
      y = this._groundY - height - Math.round(80 * this._scale) - Math.random() * Math.round(20 * this._scale);
    }

    // Reuse inactive card or create new
    let card = this._einsteinCards.find(c => !c.active);
    if (!card) {
      card = { active: false };
      this._einsteinCards.push(card);
    }

    card.active = true;
    card.x = x;
    card.y = y;
    card.width = width;
    card.height = height;
    card.animTimer = Math.random() * Math.PI * 2;
    card.collected = false;
  }

  _checkCollectEinsteinCard(card, playerHitbox) {
    return (
      playerHitbox.x < card.x + card.width &&
      playerHitbox.x + playerHitbox.width > card.x &&
      playerHitbox.y < card.y + card.height &&
      playerHitbox.y + playerHitbox.height > card.y
    );
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
    for (const card of this._trumpCards) {
      card.active = false;
    }
    for (const card of this._einsteinCards) {
      card.active = false;
    }
    this._collected = 0;
    this._spawnTimer = 0;
    this._nextSpawnTime = this._randomSpawnTime();
    this._bagSpawnTimer = 0;
    this._nextBagSpawnTime = this._randomBagSpawnTime();
    this._treasureSpawnTimer = 0;
    this._nextTreasureSpawnTime = this._randomTreasureSpawnTime();
    // Reset card spawn cooldowns (random initial cooldown for variety)
    this._trumpCardSpawnCooldown = 10 + Math.random() * 10; // 10-20 seconds initial cooldown
    this._einsteinCardSpawnCooldown = 10 + Math.random() * 10;
    this._lastBagCollectValue = 0;
    this._trumpCardActive = false;
    this._trumpCardTimer = 0;
    this._trumpCardJustCollected = false;
    this._einsteinCardActive = false;
    this._einsteinCardTimer = 0;
    this._einsteinCardJustCollected = false;
  }

  resize(canvasWidth, groundY) {
    this._canvasWidth = canvasWidth;
    this._groundY = groundY;
  }
}
