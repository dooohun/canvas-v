import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { applyAwarenessUpdate, Awareness, encodeAwarenessUpdate } from 'y-protocols/awareness';
import * as Y from 'yjs';
import { createCollabHarness } from '@/collab/__tests__/renderWithCollab';
import {
  addEdge,
  addNode,
  getNodesMap,
  markGenerateImageReady,
  readPipelineSnapshot,
  updateTextPromptValue,
} from '@/collab/pipelineDoc';
import { PipelineCanvas } from '../PipelineCanvas';

const sceneMock = vi.hoisted(() => ({ create: vi.fn(), dispose: vi.fn() }));

vi.mock('@/three/modelScene', () => ({
  createModelScene: sceneMock.create.mockReturnValue({ dispose: sceneMock.dispose }),
  MODEL_LOAD_ERROR_MESSAGE: '3D 모델을 불러오지 못했습니다',
}));

function renderCanvas() {
  const harness = createCollabHarness();
  const view = render(<PipelineCanvas />, { wrapper: harness.wrapper });
  return { ...harness, view };
}

describe('PipelineCanvas', () => {
  it('renders add-node buttons for all three node types', () => {
    renderCanvas();

    expect(screen.getByRole('button', { name: /text node/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /image node/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /3d node/i })).toBeInTheDocument();
  });

  it('adds a Text Prompt node card when the toolbar button is clicked', async () => {
    const user = userEvent.setup();
    const { doc } = renderCanvas();

    await user.click(screen.getByRole('button', { name: /text node/i }));

    expect(screen.getByText('Text Prompt')).toBeInTheDocument();
    expect(readPipelineSnapshot(doc).nodes).toHaveLength(1);
  });

  it('adds Generate Image and Generate 3D node cards when their toolbar buttons are clicked', async () => {
    const user = userEvent.setup();
    renderCanvas();

    await user.click(screen.getByRole('button', { name: /image node/i }));
    await user.click(screen.getByRole('button', { name: /3d node/i }));

    expect(screen.getByText('Generate Image')).toBeInTheDocument();
    expect(screen.getByText('3D Mesh Synth')).toBeInTheDocument();
  });

  it('renders a node created by a remote peer', () => {
    const { doc } = renderCanvas();
    const remoteDoc = new Y.Doc();
    addNode(remoteDoc, 'generateImage', { x: 0, y: 0 });

    act(() => {
      Y.applyUpdate(doc, Y.encodeStateAsUpdate(remoteDoc), 'remote');
    });

    expect(screen.getByText('Generate Image')).toBeInTheDocument();
  });

  it('shows the connection status and a remote collaborator selecting a node', () => {
    const { doc, awareness } = renderCanvas();
    let nodeId = '';
    act(() => {
      nodeId = addNode(doc, 'textPrompt', { x: 0, y: 0 });
    });

    expect(screen.getByTestId('connection-status')).toHaveTextContent('연결됨');

    const peerAwareness = new Awareness(new Y.Doc());
    peerAwareness.setLocalState({
      clientId: peerAwareness.clientID,
      name: 'Falcon-002',
      color: '#3b82f6',
      cursor: null,
      selectedNodeId: nodeId,
    });

    act(() => {
      applyAwarenessUpdate(
        awareness,
        encodeAwarenessUpdate(peerAwareness, [peerAwareness.clientID]),
        'remote',
      );
    });

    expect(screen.getAllByText('Falcon-002').length).toBe(2);
  });
});

describe('PipelineCanvas — Generate Image 실행', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function renderConnectedPipeline() {
    const rendered = renderCanvas();
    let imageId = '';
    act(() => {
      const textId = addNode(rendered.doc, 'textPrompt', { x: 0, y: 0 });
      imageId = addNode(rendered.doc, 'generateImage', { x: 400, y: 0 });
      updateTextPromptValue(rendered.doc, textId, 'a neon jellyfish');
      addEdge(rendered.doc, textId, imageId);
    });
    return { ...rendered, imageId };
  }

  /** Mimics a peer that started a run and then vanished without writing a terminal state. */
  function startRemoteRun(doc: Y.Doc, imageId: string, clientId: number) {
    act(() => {
      doc.transact(() => {
        const yNode = getNodesMap(doc).get(imageId)!;
        yNode.set('status', 'pending');
        yNode.set('pendingRun', { clientId, startedAt: Date.now() });
      });
    });
  }

  function announcePeer(awareness: Awareness): number {
    const peerAwareness = new Awareness(new Y.Doc());
    peerAwareness.setLocalState({
      clientId: peerAwareness.clientID,
      name: 'Falcon-002',
      color: '#3b82f6',
      cursor: null,
      selectedNodeId: null,
    });
    act(() => {
      applyAwarenessUpdate(
        awareness,
        encodeAwarenessUpdate(peerAwareness, [peerAwareness.clientID]),
        'remote',
      );
    });
    return peerAwareness.clientID;
  }

  it('disables the run button until a text prompt with content is connected', async () => {
    const { doc } = renderCanvas();
    let imageId = '';
    act(() => {
      imageId = addNode(doc, 'generateImage', { x: 0, y: 0 });
    });

    const runButton = screen.getByTestId('run-generate-image');
    expect(runButton).toBeDisabled();
    expect(screen.getByText('Text Prompt 노드를 연결하고 내용을 입력하세요')).toBeInTheDocument();

    act(() => {
      const textId = addNode(doc, 'textPrompt', { x: 0, y: 200 });
      updateTextPromptValue(doc, textId, 'a neon jellyfish');
      addEdge(doc, textId, imageId);
    });

    await waitFor(() => {
      expect(screen.getByTestId('run-generate-image')).toBeEnabled();
    });
  });

  it('renders pending then the generated image after a successful run', async () => {
    let resolveFetch: (response: Response) => void = () => {};
    vi.stubGlobal(
      'fetch',
      vi.fn(
        () =>
          new Promise<Response>((resolve) => {
            resolveFetch = resolve;
          }),
      ),
    );
    const user = userEvent.setup();
    renderConnectedPipeline();

    await user.click(screen.getByTestId('run-generate-image'));

    expect(screen.getByTestId('generate-image-status')).toHaveTextContent('pending');
    expect(screen.getByTestId('run-generate-image')).toBeDisabled();

    await act(async () => {
      resolveFetch(
        new Response(JSON.stringify({ imageUrl: '/uploads/a.png' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId('generate-image-status')).toHaveTextContent('ready');
    });
    expect(screen.getByAltText('생성된 이미지')).toHaveAttribute('src', '/uploads/a.png');
  });

  it('renders the server error message when the run fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: 'rate limited, try again later' }), {
          status: 429,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );
    const user = userEvent.setup();
    renderConnectedPipeline();

    await user.click(screen.getByTestId('run-generate-image'));

    await waitFor(() => {
      expect(screen.getByTestId('generate-image-error')).toHaveTextContent(
        'rate limited, try again later',
      );
    });
    expect(screen.getByTestId('generate-image-status')).toHaveTextContent('error');
    expect(screen.getByTestId('run-generate-image')).toBeEnabled();
  });

  it('keeps the run locked while the peer that started it is still connected', () => {
    const { doc, awareness, imageId } = renderConnectedPipeline();
    const peerClientId = announcePeer(awareness);

    startRemoteRun(doc, imageId, peerClientId);

    expect(screen.getByTestId('run-generate-image')).toBeDisabled();
    expect(screen.queryByTestId('generate-image-abandoned')).not.toBeInTheDocument();
  });

  it('lets a pending run be recovered after its owner disconnects', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ imageUrl: '/uploads/recovered.png' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );
    const user = userEvent.setup();
    const { doc, imageId } = renderConnectedPipeline();

    startRemoteRun(doc, imageId, 987_654);

    expect(screen.getByTestId('generate-image-abandoned')).toBeInTheDocument();
    const runButton = screen.getByTestId('run-generate-image');
    expect(runButton).toBeEnabled();

    await user.click(runButton);

    await waitFor(() => {
      expect(screen.getByTestId('generate-image-status')).toHaveTextContent('ready');
    });
    expect(screen.getByAltText('생성된 이미지')).toHaveAttribute('src', '/uploads/recovered.png');
  });

  it('shows a remote peer’s execution state', async () => {
    const { doc, awareness, imageId } = renderConnectedPipeline();
    const peerClientId = announcePeer(awareness);
    const remoteDoc = new Y.Doc();
    Y.applyUpdate(remoteDoc, Y.encodeStateAsUpdate(doc));
    remoteDoc.transact(() => {
      const yNode = getNodesMap(remoteDoc).get(imageId)!;
      yNode.set('status', 'pending');
      yNode.set('pendingRun', { clientId: peerClientId, startedAt: Date.now() });
    });

    act(() => {
      Y.applyUpdate(doc, Y.encodeStateAsUpdate(remoteDoc), 'remote');
    });

    await waitFor(() => {
      expect(screen.getByTestId('generate-image-status')).toHaveTextContent('pending');
    });
    expect(screen.getByTestId('run-generate-image')).toBeDisabled();
  });
});

describe('PipelineCanvas — Generate 3D 실행', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    sceneMock.create.mockClear();
  });

  function render3dPipeline({ withReadyImage }: { withReadyImage: boolean }) {
    const rendered = renderCanvas();
    let modelId = '';
    act(() => {
      const imageId = addNode(rendered.doc, 'generateImage', { x: 0, y: 0 });
      modelId = addNode(rendered.doc, 'generate3d', { x: 400, y: 0 });
      if (withReadyImage) markGenerateImageReady(rendered.doc, imageId, '/uploads/source.png');
      addEdge(rendered.doc, imageId, modelId);
    });
    return { ...rendered, modelId };
  }

  it('keeps the run button disabled until a connected image is ready', async () => {
    const { doc } = render3dPipeline({ withReadyImage: false });

    expect(screen.getByTestId('run-generate-3d')).toBeDisabled();
    expect(
      screen.getByText('이미지가 생성된 Generate Image 노드를 연결하세요'),
    ).toBeInTheDocument();

    act(() => {
      const imageId = readPipelineSnapshot(doc).nodes.find(
        (node) => node.type === 'generateImage',
      )!.id;
      markGenerateImageReady(doc, imageId, '/uploads/source.png');
    });

    await waitFor(() => {
      expect(screen.getByTestId('run-generate-3d')).toBeEnabled();
    });
  });

  it('renders pending, then mounts the Three.js viewer with the returned model url', async () => {
    let resolveFetch: (response: Response) => void = () => {};
    vi.stubGlobal(
      'fetch',
      vi.fn(
        () =>
          new Promise<Response>((resolve) => {
            resolveFetch = resolve;
          }),
      ),
    );
    const user = userEvent.setup();
    render3dPipeline({ withReadyImage: true });

    await user.click(screen.getByTestId('run-generate-3d'));

    expect(screen.getByTestId('generate-3d-status')).toHaveTextContent('pending');
    expect(screen.getByTestId('run-generate-3d')).toBeDisabled();

    await act(async () => {
      resolveFetch(
        new Response(JSON.stringify({ modelUrl: '/uploads/a-model.glb' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId('generate-3d-status')).toHaveTextContent('ready');
    });
    expect(screen.getByTestId('model-viewer-canvas')).toHaveAttribute(
      'data-model-url',
      '/uploads/a-model.glb',
    );
    expect(sceneMock.create).toHaveBeenCalledWith(
      expect.objectContaining({ modelUrl: '/uploads/a-model.glb' }),
    );
  });

  it('renders the server error message when the 3D run fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: '3d generation failed' }), {
          status: 502,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );
    const user = userEvent.setup();
    render3dPipeline({ withReadyImage: true });

    await user.click(screen.getByTestId('run-generate-3d'));

    await waitFor(() => {
      expect(screen.getByTestId('generate-3d-error')).toHaveTextContent('3d generation failed');
    });
    expect(screen.getByTestId('run-generate-3d')).toBeEnabled();
    expect(screen.queryByTestId('model-viewer-canvas')).not.toBeInTheDocument();
  });

  it('shows a remote peer’s 3D result without running anything locally', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const { doc, modelId } = render3dPipeline({ withReadyImage: true });
    const remoteDoc = new Y.Doc();
    Y.applyUpdate(remoteDoc, Y.encodeStateAsUpdate(doc));
    remoteDoc.transact(() => {
      const yNode = getNodesMap(remoteDoc).get(modelId)!;
      yNode.set('status', 'ready');
      yNode.set('modelUrl', '/uploads/remote-model.glb');
    });

    act(() => {
      Y.applyUpdate(doc, Y.encodeStateAsUpdate(remoteDoc), 'remote');
    });

    await waitFor(() => {
      expect(screen.getByTestId('generate-3d-status')).toHaveTextContent('ready');
    });
    expect(screen.getByTestId('model-viewer-canvas')).toHaveAttribute(
      'data-model-url',
      '/uploads/remote-model.glb',
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('lets a pending 3D run be recovered after its owner disconnects', () => {
    const { doc, modelId } = render3dPipeline({ withReadyImage: true });

    act(() => {
      doc.transact(() => {
        const yNode = getNodesMap(doc).get(modelId)!;
        yNode.set('status', 'pending');
        yNode.set('pendingRun', { clientId: 987_654, startedAt: Date.now() });
      });
    });

    expect(screen.getByTestId('generate-3d-abandoned')).toBeInTheDocument();
    expect(screen.getByTestId('run-generate-3d')).toBeEnabled();
  });
});
