import { afterEach, describe, expect, it, vi } from 'vitest';
import { Mesh, MeshStandardMaterial, PerspectiveCamera, Scene, SphereGeometry } from 'three';
import { createModelScene, MODEL_LOAD_ERROR_MESSAGE } from '../modelScene';

/**
 * jsdom has no WebGL context, so the renderer is the one piece that has to be stubbed; Scene,
 * camera, lights and OrbitControls all run for real against the stubbed canvas.
 */
const rendererState = vi.hoisted(() => ({
  instances: [] as {
    domElement: HTMLCanvasElement;
    size: [number, number] | null;
    animationLoop: unknown;
    disposed: boolean;
    renderCalls: number;
  }[],
}));

vi.mock('three', async (importOriginal) => {
  const actual = await importOriginal<typeof import('three')>();
  class WebGLRendererStub {
    domElement: HTMLCanvasElement;
    size: [number, number] | null = null;
    animationLoop: unknown = null;
    disposed = false;
    renderCalls = 0;

    constructor({ canvas }: { canvas: HTMLCanvasElement }) {
      this.domElement = canvas;
      rendererState.instances.push(this);
    }
    setPixelRatio() {}
    setSize(width: number, height: number) {
      this.size = [width, height];
    }
    setAnimationLoop(loop: unknown) {
      this.animationLoop = loop;
    }
    render() {
      this.renderCalls += 1;
    }
    dispose() {
      this.disposed = true;
    }
  }
  return { ...actual, WebGLRenderer: WebGLRendererStub };
});

const loaderState = vi.hoisted(() => ({
  requestedUrls: [] as string[],
  fail: false,
}));

vi.mock('three/examples/jsm/loaders/GLTFLoader.js', () => ({
  GLTFLoader: class {
    load(
      url: string,
      onLoad: (gltf: { scene: Mesh }) => void,
      _onProgress: undefined,
      onError: (error: unknown) => void,
    ) {
      loaderState.requestedUrls.push(url);
      if (loaderState.fail) {
        onError(new Error('404'));
        return;
      }
      const mesh = new Mesh(new SphereGeometry(2, 8, 8), new MeshStandardMaterial());
      mesh.position.set(10, 10, 10);
      onLoad({ scene: mesh });
    }
  },
}));

function setup(modelUrl = '/uploads/model.glb', onError?: (message: string) => void) {
  const canvas = document.createElement('canvas');
  document.body.append(canvas);
  return createModelScene({ canvas, modelUrl, onError });
}

afterEach(() => {
  rendererState.instances.length = 0;
  loaderState.requestedUrls.length = 0;
  loaderState.fail = false;
  document.body.replaceChildren();
});

describe('createModelScene', () => {
  it('initializes a scene, camera, renderer and orbit controls on the given canvas', () => {
    const handle = setup();

    expect(handle.scene).toBeInstanceOf(Scene);
    expect(handle.camera).toBeInstanceOf(PerspectiveCamera);
    expect(rendererState.instances).toHaveLength(1);
    expect(rendererState.instances[0]!.size).toEqual([256, 256]);
    expect(handle.controls.object).toBe(handle.camera);
    expect(handle.controls.domElement).toBe(rendererState.instances[0]!.domElement);
    expect(handle.controls.enableDamping).toBe(true);

    handle.dispose();
  });

  it('loads the model from the given url and adds it to the scene', () => {
    const handle = setup('/uploads/abc-model.glb');

    expect(loaderState.requestedUrls).toEqual(['/uploads/abc-model.glb']);
    expect(handle.scene.children.some((child) => child instanceof Mesh)).toBe(true);

    handle.dispose();
  });

  it('centers the loaded model and pulls the camera back to frame it', () => {
    const handle = setup();
    const mesh = handle.scene.children.find((child) => child instanceof Mesh)!;

    expect(mesh.position.length()).toBeLessThan(1e-6);
    expect(handle.camera.position.length()).toBeGreaterThan(1);
    expect(handle.controls.target.length()).toBe(0);

    handle.dispose();
  });

  it('reports a load failure instead of throwing', () => {
    loaderState.fail = true;
    const onError = vi.fn();

    const handle = setup('/uploads/missing.glb', onError);

    expect(onError).toHaveBeenCalledWith(MODEL_LOAD_ERROR_MESSAGE);
    expect(handle.scene.children.some((child) => child instanceof Mesh)).toBe(false);

    handle.dispose();
  });

  it('renders on each animation frame and tears everything down on dispose', () => {
    const handle = setup();
    const renderer = rendererState.instances[0]!;

    expect(typeof renderer.animationLoop).toBe('function');
    (renderer.animationLoop as () => void)();
    expect(renderer.renderCalls).toBe(1);

    handle.dispose();

    expect(renderer.animationLoop).toBeNull();
    expect(renderer.disposed).toBe(true);
    expect(handle.scene.children.some((child) => child instanceof Mesh)).toBe(false);
  });
});
