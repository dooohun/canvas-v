import { afterEach, describe, expect, it, vi } from 'vitest';
import { Mesh, MeshStandardMaterial, SphereGeometry } from 'three';
import { createModelScene } from '../modelScene';

const DRAW_CALLS_PER_RENDER = 1;
const IDLE_TICKS = 120;

const rendererState = vi.hoisted(() => ({
  instances: [] as { animationLoop: (() => void) | null; renderCalls: number }[],
}));

vi.mock('three', async (importOriginal) => {
  const actual = await importOriginal<typeof import('three')>();
  class WebGLRendererStub {
    domElement: HTMLCanvasElement;
    animationLoop: (() => void) | null = null;
    renderCalls = 0;
    info = { render: { calls: 0 } };

    constructor({ canvas }: { canvas: HTMLCanvasElement }) {
      this.domElement = canvas;
      rendererState.instances.push(this);
    }
    setPixelRatio() {}
    setSize() {}
    setAnimationLoop(loop: (() => void) | null) {
      this.animationLoop = loop;
    }
    render() {
      this.renderCalls += 1;
      this.info.render.calls = DRAW_CALLS_PER_RENDER;
    }
    dispose() {}
  }
  return { ...actual, WebGLRenderer: WebGLRendererStub };
});

vi.mock('three/examples/jsm/loaders/GLTFLoader.js', () => ({
  GLTFLoader: class {
    load(_url: string, onLoad: (gltf: { scene: Mesh }) => void) {
      onLoad({ scene: new Mesh(new SphereGeometry(1, 8, 8), new MeshStandardMaterial()) });
    }
  },
}));

afterEach(() => {
  rendererState.instances.length = 0;
  document.body.replaceChildren();
});

function setup() {
  const canvas = document.createElement('canvas');
  document.body.append(canvas);
  const handle = createModelScene({ canvas, modelUrl: '/uploads/model.glb' });
  return { handle, renderer: rendererState.instances[0]! };
}

/**
 * Benchmark for the `optimization-pass` feature. Before on-demand drawing the loop rendered every
 * tick: 120 ticks produced 120 frames / 120 draw calls (measured on this same harness).
 */
describe('idle render budget', () => {
  it('draws only the frames the scene actually needs while nobody interacts with it', () => {
    const { handle, renderer } = setup();

    for (let tick = 0; tick < IDLE_TICKS; tick += 1) renderer.animationLoop?.();

    const stats = handle.getStats();
    console.info(
      `[render-budget] ticks=${stats.ticks} rendered frames=${stats.frames} draw calls=${stats.drawCalls}`,
    );
    expect(stats.ticks).toBe(IDLE_TICKS);
    expect(renderer.renderCalls).toBe(1);
    expect(stats.drawCalls).toBe(DRAW_CALLS_PER_RENDER);

    handle.dispose();
  });

  it('still draws every frame of a camera move, so interaction stays smooth', () => {
    const { handle, renderer } = setup();
    const tick = renderer.animationLoop!;
    tick();

    for (let i = 0; i < 30; i += 1) {
      handle.camera.position.multiplyScalar(1.01);
      handle.controls.update();
      tick();
    }

    expect(handle.getStats().frames).toBe(31);

    handle.dispose();
  });
});
