import { useEffect, useRef, useState } from 'react';
import { createModelScene } from '@/three/modelScene';

export const WEBGL_UNAVAILABLE_MESSAGE = '이 환경에서는 3D 미리보기를 표시할 수 없습니다';

interface ModelViewerProps {
  modelUrl: string;
}

/**
 * `nodrag`/`nowheel` keep React Flow from panning the canvas while OrbitControls is handling the
 * same pointer/wheel gestures inside the node card.
 */
export function ModelViewer({ modelUrl }: ModelViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setErrorMessage(null);

    try {
      const handle = createModelScene({ canvas, modelUrl, onError: setErrorMessage });
      return () => handle.dispose();
    } catch {
      setErrorMessage(WEBGL_UNAVAILABLE_MESSAGE);
      return;
    }
  }, [modelUrl]);

  return (
    <div className="nodrag nowheel relative aspect-square w-full overflow-hidden rounded-md bg-slate-950">
      <canvas
        ref={canvasRef}
        data-testid="model-viewer-canvas"
        data-model-url={modelUrl}
        aria-label="생성된 3D 모델"
        className="h-full w-full cursor-grab active:cursor-grabbing"
      />
      {errorMessage && (
        <span
          data-testid="model-viewer-message"
          className="absolute inset-0 flex items-center justify-center px-3 text-center font-mono text-[11px] text-slate-400"
        >
          {errorMessage}
        </span>
      )}
    </div>
  );
}
