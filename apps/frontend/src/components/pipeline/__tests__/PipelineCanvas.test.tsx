import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { applyAwarenessUpdate, Awareness, encodeAwarenessUpdate } from 'y-protocols/awareness';
import * as Y from 'yjs';
import { createCollabHarness } from '@/collab/__tests__/renderWithCollab';
import { addNode, readPipelineSnapshot } from '@/collab/pipelineDoc';
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
