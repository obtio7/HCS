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
      night: { path: 'assets/sprites/background-night.png' },
      mobile: { path: 'assets/sprites/background-mobile.png' }  // Separate background for phone users
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
      },
      {
        id: 'player4',
        name: 'Big Yahu',
        run: { path: 'assets/sprites/player4-run.gif', frames: 1 },
        jump: { path: 'assets/sprites/player4-jump.png' },
        duck: { path: 'assets/sprites/player4-duck.gif', frames: 1 }
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
    gameoverBgm: 'assets/sounds/gameover-bgm.mp3',
    gameoverPlayer2Bgm: 'assets/sounds/gameover-player2-bgm.mp3',
    gameoverPlayer3Bgm: 'assets/sounds/gameover-player3-bgm.mp3',
    gameoverPlayer4Bgm: 'assets/sounds/gameover-player4-bgm.mp3',
    trumpCardBgm: 'assets/sounds/trump-card-bgm.mp3',
    bigstinCardBgm: 'assets/sounds/bigstin-card-bgm.mp3'
  },
  gameOver: {
    // Game over video - plays when game ends
    videos: [
      'assets/videos/gameover.mp4'
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
