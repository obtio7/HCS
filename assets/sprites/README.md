# Custom Sprites

Drop your custom images here to replace the default game graphics.

## Expected files:

- `player-run.png` — Sprite sheet with 2 frames side by side (for running animation)
- `player-jump.png` — Single image for jump pose
- `player-duck.png` — Sprite sheet with 2 frames for ducking animation
- `cactus-small.png` — Small ground obstacle
- `cactus-tall.png` — Tall ground obstacle
- `cactus-group.png` — Grouped ground obstacles
- `bird.png` — Sprite sheet with 2 frames for aerial obstacle
- `ground.png` — Ground texture (will tile horizontally)
- `background.png` — Background image (will tile horizontally)

## Constraints:
- Max file size: 512KB
- Max dimensions: 256x256 pixels
- Supported formats: PNG, SVG

If any image is missing or fails to load, the game will use colored rectangles as fallbacks — so the game always works even without custom sprites.
