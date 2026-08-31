import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ModelViewer, WEBGL_UNAVAILABLE_MESSAGE } from '../ModelViewer';

const sceneMock = vi.hoisted(() => ({
  create: vi.fn(),
  dispose: vi.fn(),
}));

vi.mock('@/three/modelScene', () => ({
  createModelScene: sceneMock.create,
  MODEL_LOAD_ERROR_MESSAGE: '3D 모델을 불러오지 못했습니다',
}));

beforeEach(() => {
  sceneMock.create.mockReset();
  sceneMock.dispose.mockReset();
  sceneMock.create.mockReturnValue({ dispose: sceneMock.dispose });
});

describe('ModelViewer', () => {
  it('builds the scene on the rendered canvas with the given model url', () => {
    render(<ModelViewer modelUrl="/uploads/a-model.glb" />);

    const canvas = screen.getByTestId('model-viewer-canvas');
    expect(sceneMock.create).toHaveBeenCalledTimes(1);
    expect(sceneMock.create.mock.calls[0]![0]).toMatchObject({
      canvas,
      modelUrl: '/uploads/a-model.glb',
    });
  });

  it('rebuilds the scene when the model url changes and disposes the previous one', () => {
    const { rerender } = render(<ModelViewer modelUrl="/uploads/first.glb" />);

    rerender(<ModelViewer modelUrl="/uploads/second.glb" />);

    expect(sceneMock.dispose).toHaveBeenCalledTimes(1);
    expect(sceneMock.create.mock.calls[1]![0]).toMatchObject({ modelUrl: '/uploads/second.glb' });
    expect(screen.getByTestId('model-viewer-canvas')).toHaveAttribute(
      'data-model-url',
      '/uploads/second.glb',
    );
  });

  it('disposes the scene on unmount', () => {
    const { unmount } = render(<ModelViewer modelUrl="/uploads/a.glb" />);

    unmount();

    expect(sceneMock.dispose).toHaveBeenCalledTimes(1);
  });

  it('shows a message instead of crashing when WebGL is unavailable', () => {
    sceneMock.create.mockImplementation(() => {
      throw new Error('Error creating WebGL context.');
    });

    render(<ModelViewer modelUrl="/uploads/a.glb" />);

    expect(screen.getByTestId('model-viewer-message')).toHaveTextContent(WEBGL_UNAVAILABLE_MESSAGE);
  });

  it('surfaces a model load failure reported by the scene', () => {
    sceneMock.create.mockImplementation(({ onError }: { onError?: (message: string) => void }) => {
      onError?.('3D 모델을 불러오지 못했습니다');
      return { dispose: sceneMock.dispose };
    });

    render(<ModelViewer modelUrl="/uploads/missing.glb" />);

    expect(screen.getByTestId('model-viewer-message')).toHaveTextContent(
      '3D 모델을 불러오지 못했습니다',
    );
  });
});
