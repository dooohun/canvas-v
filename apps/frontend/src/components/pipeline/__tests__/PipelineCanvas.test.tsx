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
  readPipelineSnapshot,
  updateTextPromptValue,
} from '@/collab/pipelineDoc';
import { PipelineCanvas } from '../PipelineCanvas';

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
