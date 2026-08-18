import { describe, expect, it } from 'vitest';
import type { GenerateImageNode, PipelineEdge, PipelineNode } from '@repo/shared-types';
import { selectInputImageUrl, selectInputImageUrlsByNodeId } from '../imageSelection';

function imageNode(
  id: string,
  position: { x: number; y: number },
  overrides: Partial<GenerateImageNode> = {},
): GenerateImageNode {
  return {
    id,
    type: 'generateImage',
    position,
    status: 'ready',
    imageUrl: `/uploads/${id}.png`,
    errorMessage: null,
    pendingRun: null,
    ...overrides,
  };
}

function target(id = 'three-d'): PipelineNode {
  return {
    id,
    type: 'generate3d',
    position: { x: 900, y: 0 },
    status: 'idle',
    modelUrl: null,
    errorMessage: null,
    pendingRun: null,
  };
}

function edge(sourceNodeId: string, targetNodeId: string): PipelineEdge {
  return { id: `${sourceNodeId}->${targetNodeId}`, sourceNodeId, targetNodeId };
}

describe('selectInputImageUrl', () => {
  it('returns null when nothing is connected', () => {
    expect(selectInputImageUrl([target()], [], 'three-d')).toBeNull();
  });

  it('picks the topmost ready image on a fan-in', () => {
    const nodes = [
      target(),
      imageNode('lower', { x: 0, y: 400 }),
      imageNode('upper', { x: 0, y: 0 }),
    ];
    const edges = [edge('lower', 'three-d'), edge('upper', 'three-d')];

    expect(selectInputImageUrl(nodes, edges, 'three-d')).toBe('/uploads/upper.png');
  });

  it('breaks a tie on the same row by x, then by node id', () => {
    const nodes = [
      target(),
      imageNode('right', { x: 300, y: 0 }),
      imageNode('b-left', { x: 0, y: 0 }),
      imageNode('a-left', { x: 0, y: 0 }),
    ];
    const edges = [edge('right', 'three-d'), edge('b-left', 'three-d'), edge('a-left', 'three-d')];

    expect(selectInputImageUrl(nodes, edges, 'three-d')).toBe('/uploads/a-left.png');
  });

  it('skips sources that are not ready and falls through to the next one', () => {
    const nodes = [
      target(),
      imageNode('pending', { x: 0, y: 0 }, { status: 'pending', imageUrl: null }),
      imageNode('failed', { x: 0, y: 100 }, { status: 'error', imageUrl: null }),
      imageNode('done', { x: 0, y: 200 }),
    ];
    const edges = [edge('pending', 'three-d'), edge('failed', 'three-d'), edge('done', 'three-d')];

    expect(selectInputImageUrl(nodes, edges, 'three-d')).toBe('/uploads/done.png');
  });

  it('returns null when every connected image is still unfinished', () => {
    const nodes = [target(), imageNode('a', { x: 0, y: 0 }, { status: 'idle', imageUrl: null })];

    expect(selectInputImageUrl(nodes, [edge('a', 'three-d')], 'three-d')).toBeNull();
  });

  it('ignores edges that point at a different node', () => {
    const nodes = [target(), target('other'), imageNode('a', { x: 0, y: 0 })];

    expect(selectInputImageUrl(nodes, [edge('a', 'other')], 'three-d')).toBeNull();
  });
});

describe('selectInputImageUrlsByNodeId', () => {
  it('maps only generate3d nodes', () => {
    const nodes = [target(), imageNode('a', { x: 0, y: 0 })];
    const byNodeId = selectInputImageUrlsByNodeId(nodes, [edge('a', 'three-d')]);

    expect([...byNodeId.keys()]).toEqual(['three-d']);
    expect(byNodeId.get('three-d')).toBe('/uploads/a.png');
  });
});
