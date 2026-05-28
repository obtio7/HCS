export class GroundRenderer {
  constructor(canvasWidth, groundY) {
    this._canvasWidth = canvasWidth;
    this._groundY = groundY;
    this._scrollX = 0;
    this._tileWidth = 600;
  }

  update(deltaTime, gameSpeed) {
    this._scrollX += gameSpeed * deltaTime;
    if (this._scrollX >= this._tileWidth) {
      this._scrollX -= this._tileWidth;
    }
  }

  render(ctx, spriteManager, isNight = false) {
    const sprite = spriteManager ? spriteManager.getGroundSprite() : null;

    if (sprite && sprite.image) {
      this._tileWidth = sprite.image.width;
      const y = this._groundY;
      const h = 12;
      let x = -(this._scrollX % this._tileWidth);
      while (x < this._canvasWidth) {
        ctx.drawImage(sprite.image, x, y, this._tileWidth, h);
        x += this._tileWidth;
      }
    } else {
      // Fallback: draw a clean ground line
      const groundColor = isNight ? '#c0c0c0' : '#444444';

      // Main ground line
      ctx.strokeStyle = groundColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, this._groundY);
      ctx.lineTo(this._canvasWidth, this._groundY);
      ctx.stroke();

      // Subtle ground texture — small dashes
      ctx.strokeStyle = isNight ? '#888888' : '#aaaaaa';
      ctx.lineWidth = 1;
      const offset = this._scrollX % 40;
      for (let x = -offset; x < this._canvasWidth; x += 40) {
        const hash = Math.abs(Math.sin(x * 0.5) * 100) % 1;
        if (hash > 0.4) {
          ctx.beginPath();
          ctx.moveTo(x, this._groundY + 5);
          ctx.lineTo(x + 8 + hash * 10, this._groundY + 5);
          ctx.stroke();
        }
        if (hash > 0.7) {
          ctx.beginPath();
          ctx.moveTo(x + 15, this._groundY + 9);
          ctx.lineTo(x + 20, this._groundY + 9);
          ctx.stroke();
        }
      }
    }
  }

  reset() {
    this._scrollX = 0;
  }

  resize(canvasWidth, groundY) {
    this._canvasWidth = canvasWidth;
    this._groundY = groundY;
  }
}
