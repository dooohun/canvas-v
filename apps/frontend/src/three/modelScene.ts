import {
  AmbientLight,
  Box3,
  DirectionalLight,
  Mesh,
  PerspectiveCamera,
  Scene,
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

export interface ModelSceneHandle {
  scene: Scene;
  camera: PerspectiveCamera;
  renderer: WebGLRenderer;
  controls: OrbitControls;
  dispose: () => void;
}

function disposeObject(root: Object3D): void {
  root.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    object.geometry.dispose();
    const material = object.material as Material | Material[];
    if (Array.isArray(material)) {
      for (const entry of material) entry.dispose();
    } else {
      material.dispose();
    }
  });
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
    },
    undefined,
    () => onError?.(MODEL_LOAD_ERROR_MESSAGE),
  );

  renderer.setAnimationLoop(() => {
    controls.update();
    renderer.render(scene, camera);
  });

  return {
    scene,
    camera,
    renderer,
    controls,
    dispose: () => {
      disposed = true;
      renderer.setAnimationLoop(null);
      controls.dispose();
      if (model) {
        scene.remove(model);
        disposeObject(model);
      }
      renderer.dispose();
    },
  };
}
