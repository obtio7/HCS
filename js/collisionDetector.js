export class CollisionDetector {
  static checkCollision(a, b) {
    return (
      a.x < b.x + b.width &&
      a.x + a.width > b.x &&
      a.y < b.y + b.height &&
      a.y + a.height > b.y
    );
  }

  static checkAllCollisions(playerHitbox, obstacles) {
    for (const obstacle of obstacles) {
      if (!obstacle.active) continue;
      if (CollisionDetector.checkCollision(playerHitbox, obstacle.hitbox)) {
        return obstacle;
      }
    }
    return null;
  }
}
