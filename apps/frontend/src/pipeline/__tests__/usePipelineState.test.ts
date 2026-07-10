import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { usePipelineState } from '../usePipelineState';

describe('usePipelineState', () => {
  it('adds nodes of each type', () => {
    const { result } = renderHook(() => usePipelineState());

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
  });

  it('connects textPrompt -> generateImage and generateImage -> generate3d', () => {
    const { result } = renderHook(() => usePipelineState());

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
    const { result } = renderHook(() => usePipelineState());

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
    const { result } = renderHook(() => usePipelineState());

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
  });
});
