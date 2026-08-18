import {
  AmbientLight,
  Box3,
  DirectionalLight,
  Mesh,
  PerspectiveCamera,
  Scene,
  Texture,
  Vector3,
  WebGLRenderer,
  type Material,
  type Object3D,
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export const MODEL_LOAD_ERROR_MESSAGE = '3D 모델을 불러오지 못했습니다';

/** Fallback size for a canvas that has not been laid out yet (jsdom, or a hidden node card). */
const FALLBACK_SIZE = 256;
const CAMERA_DISTANCE_FACTOR = 2.2;

export interface ModelSceneOptions {
  canvas: HTMLCanvasElement;
  modelUrl: string;
  onError?: (message: string) => void;
}

/** Counters for the optimization benchmark; cumulative since the scene was created. */
export interface ModelSceneStats {
  /** Animation loop invocations (one per browser frame while the scene is alive). */
  ticks: number;
  /** Frames actually handed to `renderer.render` — with on-demand drawing this trails `ticks`. */
  frames: number;
  /** Sum of `renderer.info.render.calls` over those frames. */
  drawCalls: number;
  /** Wall time spent inside `renderer.render`. */
  renderMs: number;
}

export interface ModelSceneHandle {
  scene: Scene;
  camera: PerspectiveCamera;
  renderer: WebGLRenderer;
  controls: OrbitControls;
  getStats: () => ModelSceneStats;
  dispose: () => void;
}

function disposeMaterial(material: Material): void {
  for (const value of Object.values(material)) {
    if (value instanceof Texture) value.dispose();
  }
  material.dispose();
}

function disposeObject(root: Object3D): void {
  root.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    object.geometry.dispose();
    const material = object.material as Material | Material[];
    if (Array.isArray(material)) {
      for (const entry of material) disposeMaterial(entry);
    } else {
      disposeMaterial(material);
    }
  });
}

/** Opt-in so the per-second measurement log never runs for ordinary users. */
function statsLoggingEnabled(): boolean {
  if (!import.meta.env.DEV) return false;
  return new URLSearchParams(globalThis.location?.search ?? '').has('three-stats');
}

/**
 * Centers the model at the origin and pulls the camera back far enough to frame it, so that
 * models of any scale (Meshy output has no fixed unit) fill the node preview the same way.
 */
function frameModel(model: Object3D, camera: PerspectiveCamera, controls: OrbitControls): void {
  const box = new Box3().setFromObject(model);
  const size = box.getSize(new Vector3());
  const center = box.getCenter(new Vector3());
  model.position.sub(center);

  const radius = Math.max(size.x, size.y, size.z) || 1;
  const distance = radius * CAMERA_DISTANCE_FACTOR;
  camera.position.set(distance, distance * 0.6, distance);
  camera.near = distance / 100;
  camera.far = distance * 100;
  camera.updateProjectionMatrix();
  controls.target.set(0, 0, 0);
  controls.update();
}

export function createModelScene({
  canvas,
  modelUrl,
  onError,
}: ModelSceneOptions): ModelSceneHandle {
  const width = canvas.clientWidth || FALLBACK_SIZE;
  const height = canvas.clientHeight || FALLBACK_SIZE;

  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio ?? 1, 2));
  renderer.setSize(width, height, false);

  const scene = new Scene();
  scene.add(new AmbientLight(0xffffff, 1.6));
  const keyLight = new DirectionalLight(0xffffff, 2.2);
  keyLight.position.set(3, 5, 4);
  scene.add(keyLight);

  const camera = new PerspectiveCamera(45, width / height, 0.1, 1000);
  camera.position.set(2, 1.2, 2);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.enablePan = false;

  let model: Object3D | null = null;
  let disposed = false;
  let needsRender = true;
  const requestRender = () => {
    needsRender = true;
  };
  controls.addEventListener('change', requestRender);

  new GLTFLoader().load(
    modelUrl,
    (gltf) => {
      if (disposed) {
        disposeObject(gltf.scene);
        return;
      }
      model = gltf.scene;
      frameModel(model, camera, controls);
      scene.add(model);
      requestRender();
    },
    undefined,
    () => onError?.(MODEL_LOAD_ERROR_MESSAGE),
  );

  const stats: ModelSceneStats = { ticks: 0, frames: 0, drawCalls: 0, renderMs: 0 };
  const logStats = statsLoggingEnabled();
  let windowStartedAt = performance.now();
  let windowStart: ModelSceneStats = { ...stats };

  renderer.setAnimationLoop(() => {
    stats.ticks += 1;
    // `controls.update()` re-emits `change` while damping settles, which is what keeps the
    // on-demand loop drawing until the camera comes to rest.
    controls.update();
    if (needsRender) {
      needsRender = false;
      const startedAt = performance.now();
      renderer.render(scene, camera);
      stats.frames += 1;
      stats.drawCalls += renderer.info.render.calls;
      stats.renderMs += performance.now() - startedAt;
    }

    if (!logStats) return;
    const windowMs = performance.now() - windowStartedAt;
    if (windowMs < 1000) return;
    const perSecond = (value: number) => (value / (windowMs / 1000)).toFixed(1);
    const frames = stats.frames - windowStart.frames;
    console.info(
      `[three-stats] ${modelUrl} — ticks/s ${perSecond(stats.ticks - windowStart.ticks)}, ` +
        `rendered frames/s ${perSecond(frames)}, ` +
        `draw calls/s ${perSecond(stats.drawCalls - windowStart.drawCalls)}, ` +
        `avg render ${frames === 0 ? 0 : ((stats.renderMs - windowStart.renderMs) / frames).toFixed(3)}ms`,
    );
    windowStartedAt = performance.now();
    windowStart = { ...stats };
  });

  return {
    scene,
    camera,
    renderer,
    controls,
    getStats: () => ({ ...stats }),
    dispose: () => {
      disposed = true;
      renderer.setAnimationLoop(null);
      controls.removeEventListener('change', requestRender);
      controls.dispose();
      if (model) {
        scene.remove(model);
        disposeObject(model);
      }
      renderer.dispose();
    },
  };
}
