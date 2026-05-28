import { jest } from '@jest/globals';

// Mock all subsystem modules before importing Game
jest.unstable_mockModule('../../js/gameLoop.js', () => ({
  GameLoop: jest.fn().mockImplementation((updateFn, renderFn) => ({
    start: jest.fn(),
    stop: jest.fn(),
    get isRunning() { return false; }
  }))
}));

jest.unstable_mockModule('../../js/inputHandler.js', () => ({
  InputHandler: jest.fn().mockImplementation(() => ({
    enable: jest.fn(),
    disable: jest.fn(),
    resetFrame: jest.fn(),
    get jumpPressed() { return false; },
    get duckHeld() { return false; },
    get startPressed() { return false; },
    get pausePressed() { return false; }
  }))
}));

jest.unstable_mockModule('../../js/player.js', () => ({
  Player: jest.fn().mockImplementation(() => ({
    setGroundY: jest.fn(),
    jump: jest.fn(),
    duck: jest.fn(),
    releaseDuck: jest.fn(),
    update: jest.fn(),
    render: jest.fn(),
    reset: jest.fn(),
    get hitbox() { return { x: 50, y: 100, width: 30, height: 40 }; }
  }))
}));

jest.unstable_mockModule('../../js/obstacleManager.js', () => ({
  ObstacleManager: jest.fn().mockImplementation(() => ({
    update: jest.fn(),
    render: jest.fn(),
    reset: jest.fn(),
    resize: jest.fn(),
    get activeObstacles() { return []; }
  }))
}));

jest.unstable_mockModule('../../js/collisionDetector.js', () => ({
  CollisionDetector: {
    checkAllCollisions: jest.fn().mockReturnValue(null)
  }
}));

jest.unstable_mockModule('../../js/scoreSystem.js', () => ({
  ScoreSystem: jest.fn().mockImplementation(() => ({
    update: jest.fn().mockReturnValue(false),
    reset: jest.fn(),
    saveHighScore: jest.fn(),
    get score() { return 0; },
    get displayScore() { return '00000'; },
    get displayHighScore() { return 'HI 00000'; },
    get isMilestoneFlashing() { return false; }
  }))
}));

jest.unstable_mockModule('../../js/difficultyManager.js', () => ({
  DifficultyManager: jest.fn().mockImplementation(() => ({
    update: jest.fn(),
    reset: jest.fn(),
    get gameSpeed() { return 300; },
    get aerialObstaclesEnabled() { return false; },
    get spawnIntervalRange() { return { min: 800, max: 2500 }; }
  }))
}));

jest.unstable_mockModule('../../js/spriteManager.js', () => ({
  SpriteManager: jest.fn().mockImplementation(() => ({
    loadAll: jest.fn().mockResolvedValue(undefined),
    getSprite: jest.fn(),
    getSpriteSheet: jest.fn()
  }))
}));

jest.unstable_mockModule('../../js/groundRenderer.js', () => ({
  GroundRenderer: jest.fn().mockImplementation(() => ({
    update: jest.fn(),
    render: jest.fn(),
    reset: jest.fn(),
    resize: jest.fn()
  }))
}));

jest.unstable_mockModule('../../js/backgroundRenderer.js', () => ({
  BackgroundRenderer: jest.fn().mockImplementation(() => ({
    update: jest.fn(),
    render: jest.fn(),
    reset: jest.fn(),
    resize: jest.fn(),
    get isNight() { return false; }
  }))
}));

jest.unstable_mockModule('../../js/audioManager.js', () => ({
  AudioManager: jest.fn().mockImplementation(() => ({
    loadAll: jest.fn().mockResolvedValue(undefined),
    play: jest.fn(),
    toggleMute: jest.fn(),
    initOnInteraction: jest.fn(),
    get isMuted() { return false; }
  }))
}));

jest.unstable_mockModule('../../js/uiRenderer.js', () => ({
  UIRenderer: jest.fn().mockImplementation(() => ({
    renderStartScreen: jest.fn(),
    renderHUD: jest.fn(),
    renderGameOver: jest.fn(),
    renderPauseOverlay: jest.fn(),
    renderMuteButton: jest.fn(),
    get muteButtonBounds() { return { x: 10, y: 10, width: 30, height: 30 }; }
  }))
}));

// Now import Game after mocks are set up
const { Game } = await import('../../js/game.js');

function createMockCanvas() {
  return {
    width: 800,
    height: 200,
    getContext: jest.fn(() => ({
      clearRect: jest.fn(),
      fillRect: jest.fn(),
      fillText: jest.fn(),
      drawImage: jest.fn(),
      save: jest.fn(),
      restore: jest.fn(),
      filter: 'none'
    })),
    getBoundingClientRect: jest.fn(() => ({ left: 0, top: 0, width: 800, height: 200 })),
    addEventListener: jest.fn()
  };
}

describe('Game State Machine', () => {
  let game;
  let canvas;

  beforeEach(() => {
    canvas = createMockCanvas();
    game = new Game(canvas);
  });

  describe('initial state', () => {
    test('starts in loading state', () => {
      expect(game.state).toBe('loading');
    });
  });

  describe('setState() valid transitions', () => {
    test('loading → ready', () => {
      game.setState('ready');
      expect(game.state).toBe('ready');
    });

    test('ready → running', () => {
      game.setState('ready');
      game.setState('running');
      expect(game.state).toBe('running');
    });

    test('running → paused', () => {
      game.setState('ready');
      game.setState('running');
      game.setState('paused');
      expect(game.state).toBe('paused');
    });

    test('paused → running', () => {
      game.setState('ready');
      game.setState('running');
      game.setState('paused');
      game.setState('running');
      expect(game.state).toBe('running');
    });

    test('running → gameover', () => {
      game.setState('ready');
      game.setState('running');
      game.setState('gameover');
      expect(game.state).toBe('gameover');
    });

    test('gameover → running', () => {
      game.setState('ready');
      game.setState('running');
      game.setState('gameover');
      game.setState('running');
      expect(game.state).toBe('running');
    });
  });

  describe('setState() invalid transitions', () => {
    test('loading → running throws', () => {
      expect(() => game.setState('running')).toThrow('Invalid state transition');
    });

    test('loading → paused throws', () => {
      expect(() => game.setState('paused')).toThrow('Invalid state transition');
    });

    test('loading → gameover throws', () => {
      expect(() => game.setState('gameover')).toThrow('Invalid state transition');
    });

    test('ready → paused throws', () => {
      game.setState('ready');
      expect(() => game.setState('paused')).toThrow('Invalid state transition');
    });

    test('ready → gameover throws', () => {
      game.setState('ready');
      expect(() => game.setState('gameover')).toThrow('Invalid state transition');
    });

    test('paused → gameover throws', () => {
      game.setState('ready');
      game.setState('running');
      game.setState('paused');
      expect(() => game.setState('gameover')).toThrow('Invalid state transition');
    });

    test('gameover → ready throws', () => {
      game.setState('ready');
      game.setState('running');
      game.setState('gameover');
      expect(() => game.setState('ready')).toThrow('Invalid state transition');
    });

    test('gameover → paused throws', () => {
      game.setState('ready');
      game.setState('running');
      game.setState('gameover');
      expect(() => game.setState('paused')).toThrow('Invalid state transition');
    });
  });

  describe('init()', () => {
    test('transitions from loading to ready', async () => {
      await game.init();
      expect(game.state).toBe('ready');
    });
  });

  describe('start()', () => {
    test('transitions from ready to running', async () => {
      await game.init();
      game.start();
      expect(game.state).toBe('running');
    });

    test('throws if called from loading state', () => {
      expect(() => game.start()).toThrow('Invalid state transition');
    });
  });

  describe('pause()', () => {
    test('transitions from running to paused', async () => {
      await game.init();
      game.start();
      game.pause();
      expect(game.state).toBe('paused');
    });

    test('throws if called from ready state', async () => {
      await game.init();
      expect(() => game.pause()).toThrow('Invalid state transition');
    });
  });

  describe('resume()', () => {
    test('transitions from paused to running', async () => {
      await game.init();
      game.start();
      game.pause();
      game.resume();
      expect(game.state).toBe('running');
    });

    test('throws if called from running state', async () => {
      await game.init();
      game.start();
      // running → running is not a valid transition via resume (which calls setState('running'))
      // Actually paused → running is valid, but running → running is not
      expect(() => game.resume()).toThrow('Invalid state transition');
    });
  });

  describe('gameOver()', () => {
    test('transitions from running to gameover', async () => {
      await game.init();
      game.start();
      game.gameOver();
      expect(game.state).toBe('gameover');
    });

    test('throws if called from paused state', async () => {
      await game.init();
      game.start();
      game.pause();
      expect(() => game.gameOver()).toThrow('Invalid state transition');
    });
  });

  describe('restart()', () => {
    test('transitions from gameover to running', async () => {
      await game.init();
      game.start();
      game.gameOver();
      game.restart();
      expect(game.state).toBe('running');
    });

    test('throws if called from running state', async () => {
      await game.init();
      game.start();
      // running → running is not valid
      expect(() => game.restart()).toThrow('Invalid state transition');
    });
  });

  describe('resize()', () => {
    test('updates canvas dimensions', () => {
      game.resize(1024, 256);
      expect(canvas.width).toBe(1024);
      expect(canvas.height).toBe(256);
    });
  });

  describe('update()', () => {
    test('does not process game logic when state is not running', async () => {
      await game.init();
      // In 'ready' state, update should not throw
      expect(() => game.update(0.016)).not.toThrow();
    });
  });

  describe('render()', () => {
    test('does not throw in any state', async () => {
      await game.init();
      expect(() => game.render()).not.toThrow();

      game.start();
      expect(() => game.render()).not.toThrow();

      game.pause();
      expect(() => game.render()).not.toThrow();

      game.resume();
      game.gameOver();
      expect(() => game.render()).not.toThrow();
    });
  });

  describe('constructor', () => {
    test('stores canvas and creates context', () => {
      expect(canvas.getContext).toHaveBeenCalledWith('2d');
    });

    test('creates a GameLoop instance', async () => {
      const { GameLoop } = await import('../../js/gameLoop.js');
      expect(GameLoop).toHaveBeenCalled();
    });
  });
});
