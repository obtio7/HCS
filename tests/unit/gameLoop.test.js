import { jest } from '@jest/globals';
import { GameLoop } from '../../js/gameLoop.js';

describe('GameLoop', () => {
  let mockUpdateFn;
  let mockRenderFn;
  let rafCallbacks;
  let rafId;

  beforeEach(() => {
    mockUpdateFn = jest.fn();
    mockRenderFn = jest.fn();
    rafCallbacks = [];
    rafId = 0;

    global.requestAnimationFrame = jest.fn((cb) => {
      rafCallbacks.push(cb);
      return ++rafId;
    });
    global.cancelAnimationFrame = jest.fn();
    global.performance = { now: jest.fn(() => 0) };
  });

  afterEach(() => {
    delete global.requestAnimationFrame;
    delete global.cancelAnimationFrame;
    delete global.performance;
  });

  function simulateFrame(timestamp) {
    const cb = rafCallbacks.shift();
    if (cb) cb(timestamp);
  }

  test('constructor takes updateFn and renderFn callbacks', () => {
    const loop = new GameLoop(mockUpdateFn, mockRenderFn);
    expect(loop).toBeDefined();
  });

  test('isRunning is false initially', () => {
    const loop = new GameLoop(mockUpdateFn, mockRenderFn);
    expect(loop.isRunning).toBe(false);
  });

  test('start() sets isRunning to true and requests animation frame', () => {
    const loop = new GameLoop(mockUpdateFn, mockRenderFn);
    loop.start();
    expect(loop.isRunning).toBe(true);
    expect(global.requestAnimationFrame).toHaveBeenCalled();
  });

  test('start() does nothing if already running', () => {
    const loop = new GameLoop(mockUpdateFn, mockRenderFn);
    loop.start();
    loop.start();
    // requestAnimationFrame called only once from start (plus one from tick)
    expect(global.requestAnimationFrame).toHaveBeenCalledTimes(1);
  });

  test('stop() sets isRunning to false and cancels animation frame', () => {
    const loop = new GameLoop(mockUpdateFn, mockRenderFn);
    loop.start();
    loop.stop();
    expect(loop.isRunning).toBe(false);
    expect(global.cancelAnimationFrame).toHaveBeenCalled();
  });

  test('tick calls updateFn with deltaTime then renderFn', () => {
    global.performance.now.mockReturnValue(0);
    const loop = new GameLoop(mockUpdateFn, mockRenderFn);
    loop.start();

    // Simulate a frame at 16ms (roughly 60fps)
    simulateFrame(16);

    expect(mockUpdateFn).toHaveBeenCalledTimes(1);
    expect(mockRenderFn).toHaveBeenCalledTimes(1);

    // deltaTime should be 16ms / 1000 = 0.016s
    const deltaTime = mockUpdateFn.mock.calls[0][0];
    expect(deltaTime).toBeCloseTo(0.016, 3);
  });

  test('deltaTime is capped at 0.1s to prevent physics explosions', () => {
    global.performance.now.mockReturnValue(0);
    const loop = new GameLoop(mockUpdateFn, mockRenderFn);
    loop.start();

    // Simulate a frame after a long pause (e.g., 2 seconds from tab switch)
    simulateFrame(2000);

    const deltaTime = mockUpdateFn.mock.calls[0][0];
    expect(deltaTime).toBe(0.1);
  });

  test('fps getter returns current frames per second', () => {
    global.performance.now.mockReturnValue(0);
    const loop = new GameLoop(mockUpdateFn, mockRenderFn);
    expect(loop.fps).toBe(0);

    loop.start();

    // Simulate 60 frames over 1 second (16.67ms each)
    let timestamp = 0;
    for (let i = 0; i < 60; i++) {
      timestamp += 16.67;
      simulateFrame(timestamp);
    }

    // After ~1 second of frames, fps should be approximately 60
    expect(loop.fps).toBeGreaterThan(0);
  });

  test('stop prevents further ticks from executing', () => {
    global.performance.now.mockReturnValue(0);
    const loop = new GameLoop(mockUpdateFn, mockRenderFn);
    loop.start();

    simulateFrame(16);
    expect(mockUpdateFn).toHaveBeenCalledTimes(1);

    loop.stop();

    // Even if a callback fires, it should not call update/render
    simulateFrame(32);
    expect(mockUpdateFn).toHaveBeenCalledTimes(1);
  });

  test('loop stops if updateFn throws an error', () => {
    global.performance.now.mockReturnValue(0);
    const errorUpdate = jest.fn(() => { throw new Error('test error'); });
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const loop = new GameLoop(errorUpdate, mockRenderFn);
    loop.start();

    simulateFrame(16);

    expect(loop.isRunning).toBe(false);
    consoleSpy.mockRestore();
  });

  test('loop stops if renderFn throws an error', () => {
    global.performance.now.mockReturnValue(0);
    const errorRender = jest.fn(() => { throw new Error('render error'); });
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const loop = new GameLoop(mockUpdateFn, errorRender);
    loop.start();

    simulateFrame(16);

    expect(loop.isRunning).toBe(false);
    consoleSpy.mockRestore();
  });

  test('updateFn is called before renderFn each frame', () => {
    global.performance.now.mockReturnValue(0);
    const callOrder = [];
    const orderedUpdate = jest.fn(() => callOrder.push('update'));
    const orderedRender = jest.fn(() => callOrder.push('render'));

    const loop = new GameLoop(orderedUpdate, orderedRender);
    loop.start();
    simulateFrame(16);

    expect(callOrder).toEqual(['update', 'render']);
  });
});
