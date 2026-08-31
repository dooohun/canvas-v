import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import * as Y from 'yjs';
import { createCollabHarness } from '@/collab/__tests__/renderWithCollab';
import { addNode as addNodeToDoc, readPipelineSnapshot } from '@/collab/pipelineDoc';
import { usePipelineState } from '../usePipelineState';

function renderPipelineState() {
  const harness = createCollabHarness();
  const { result } = renderHook(() => usePipelineState(), { wrapper: harness.wrapper });
  return { ...harness, result };
}

describe('usePipelineState', () => {
  it('adds nodes of each type into the Y.Doc', () => {
    const { result, doc } = renderPipelineState();

    act(() => {
      result.current.addNode('textPrompt');
      result.current.addNode('generateImage');
      result.current.addNode('generate3d');
    });

    expect(result.current.nodes).toHaveLength(3);
    expect(result.current.nodes.map((node) => node.type)).toEqual([
      'textPrompt',
      'generateImage',
      'generate3d',
    ]);
    expect(doc.getMap('nodes').size).toBe(3);
  });

  it('connects textPrompt -> generateImage and generateImage -> generate3d', () => {
    const { result } = renderPipelineState();

    act(() => {
      result.current.addNode('textPrompt');
      result.current.addNode('generateImage');
      result.current.addNode('generate3d');
    });

    const [textPrompt, generateImage, generate3d] = result.current.nodes;

    act(() => {
      result.current.addEdge(textPrompt!.id, generateImage!.id);
      result.current.addEdge(generateImage!.id, generate3d!.id);
    });

    expect(result.current.edges).toHaveLength(2);
    expect(result.current.edges).toContainEqual(
      expect.objectContaining({ sourceNodeId: textPrompt!.id, targetNodeId: generateImage!.id }),
    );
    expect(result.current.edges).toContainEqual(
      expect.objectContaining({ sourceNodeId: generateImage!.id, targetNodeId: generate3d!.id }),
    );
  });

  it('rejects edges that violate port type rules (text output -> image input)', () => {
    const { result } = renderPipelineState();

    act(() => {
      result.current.addNode('textPrompt');
      result.current.addNode('generate3d');
    });

    const [textPrompt, generate3d] = result.current.nodes;

    act(() => {
      result.current.addEdge(textPrompt!.id, generate3d!.id);
    });

    expect(result.current.edges).toHaveLength(0);
  });

  it('cascades edge deletion when a connected node is deleted', () => {
    const { result } = renderPipelineState();

    act(() => {
      result.current.addNode('textPrompt');
      result.current.addNode('generateImage');
    });

    const [textPrompt, generateImage] = result.current.nodes;

    act(() => {
      result.current.addEdge(textPrompt!.id, generateImage!.id);
    });
    expect(result.current.edges).toHaveLength(1);

    act(() => {
      result.current.deleteNode(textPrompt!.id);
    });

    expect(result.current.nodes).toHaveLength(1);
    expect(result.current.edges).toHaveLength(0);
    expect(generateImage).toBeDefined();
  });

  it('writes prompt edits and positions through to the Y.Doc', () => {
    const { result, doc } = renderPipelineState();

    act(() => {
      result.current.addNode('textPrompt');
    });
    const nodeId = result.current.nodes[0]!.id;

    act(() => {
      result.current.updateTextPromptValue(nodeId, 'neon jellyfish');
      result.current.updateNodePosition(nodeId, { x: 42, y: 43 });
    });

    expect(readPipelineSnapshot(doc).nodes[0]).toMatchObject({
      prompt: 'neon jellyfish',
      position: { x: 42, y: 43 },
    });
  });

  it('re-renders when a remote peer update is applied to the Y.Doc', () => {
    const { result, doc } = renderPipelineState();
    const remoteDoc = new Y.Doc();
    addNodeToDoc(remoteDoc, 'generateImage', { x: 7, y: 8 });

    expect(result.current.nodes).toHaveLength(0);

    act(() => {
      Y.applyUpdate(doc, Y.encodeStateAsUpdate(remoteDoc), 'remote');
    });

    expect(result.current.nodes).toHaveLength(1);
    expect(result.current.nodes[0]).toMatchObject({
      type: 'generateImage',
      position: { x: 7, y: 8 },
    });
  });
});
