// Game configuration - all tunable constants
export const CONFIG = {
  canvas: {
    minWidth: 600,
    minHeight: 150,
    aspectRatio: 4 // width:height
  },
  player: {
    width: 88,
    height: 94,
    duckHeight: 60,
    jumpPeakHeight: 200,
    jumpDuration: 0.65, // longer jump arc to clear obstacles
    hitboxInset: 0.15,
    x: 80, // fixed horizontal position
    animationSpeed: 0.1 // seconds per frame
  },
  obstacles: {
    minGap: 350,
    spawnInterval: { min: 900, max: 2500 },
    types: {
      ground_small: { width: 50, height: 70 },
      ground_tall: { width: 55, height: 90 },
      ground_group: { width: 100, height: 70 },
      aerial: { width: 80, height: 56 }
    }
  },
  difficulty: {
    initialSpeed: 300,
    maxSpeed: 900,
    speedIncrement: 5,
    aerialUnlockSpeed: 450,
    aerialUnlockScore: 300,
    minSpawnRatio: 0.4
  },
  scoring: {
    pointsPer10px: 1,
    milestoneInterval: 100,
    milestoneFlashDuration: 500,
    maxScore: 99999,
    dayNightInterval: 500
  },
  sprites: {
    // Custom background images for day/night
    backgrounds: {
      day: { path: 'assets/sprites/background-day.png' },
      night: { path: 'assets/sprites/background-night.png' }
    },
    // Multiple player characters to choose from
    players: [
      {
        id: 'player1',
        name: 'Jewasaur',
        run: { path: 'assets/sprites/player-run.png', frames: 1 },
        jump: { path: 'assets/sprites/player-jump.png' },
        duck: { path: 'assets/sprites/player-duck.png', frames: 2 }
      },
      {
        id: 'player2',
        name: 'Jewgoblin',
        run: { path: 'assets/sprites/player2-run.png', frames: 1 },
        jump: { path: 'assets/sprites/player2-jump.png' },
        duck: { path: 'assets/sprites/player2-duck.png', frames: 2 }
      },
      {
        id: 'player3',
        name: 'Jewman',
        run: { path: 'assets/sprites/player3-run.png', frames: 1 },
        jump: { path: 'assets/sprites/player3-jump.png' },
        duck: { path: 'assets/sprites/player3-duck.png', frames: 2 }
      }
    ],
    // Default player (used as fallback)
    player: {
      run: { path: 'assets/sprites/player-run.png', frames: 1 },
      jump: { path: 'assets/sprites/player-jump.png' },
      duck: { path: 'assets/sprites/player-duck.png', frames: 2 }
    },
    obstacles: {
      ground_small: { path: 'assets/sprites/cactus-small.png' },
      ground_tall: { path: 'assets/sprites/cactus-tall.png' },
      ground_group: { path: 'assets/sprites/cactus-group.png' },
      aerial: { path: 'assets/sprites/bird.png', frames: 1 }
    },
    ground: { path: 'assets/sprites/ground.png' },
    background: { path: 'assets/sprites/background.png' }
  },
  sounds: {
    jump: 'assets/sounds/jump.mp3',
    crash: 'assets/sounds/crash.mp3',
    milestone: 'assets/sounds/milestone.mp3',
    bgm: 'assets/sounds/bgm.mp3',
    gameoverBgm: 'assets/sounds/gameover-bgm.mp3'
  },
  gameOver: {
    // Multiple videos - one will be randomly selected on each game over
    videos: [
      'assets/videos/gameover1.mp4',
      'assets/videos/gameover2.mp4',
      'assets/videos/gameover3.mp4',
      'assets/videos/gameover4.mp4',
      'assets/videos/gameover5.mp4'
    ]
  },
  timing: {
    restartDelay: 300,
    pauseResponseTime: 100
  },
  colors: {
    day: { background: '#f7f7f7', ground: '#535353', text: '#535353' },
    night: { background: '#1a1a2e', ground: '#c0c0c0', text: '#c0c0c0' }
  }
};
