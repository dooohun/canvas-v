import { describe, expect, it } from 'vitest';
import type { GenerateImageNode, NodeStatus, PipelineNode } from '@repo/shared-types';
import { collectAbandonedRunNodeIds, isRunAbandoned, RUN_TIMEOUT_MS } from '../runState';

const NOW = 1_700_000_000_000;

function imageNode(
  id: string,
  status: NodeStatus,
  pendingRun: GenerateImageNode['pendingRun'] = null,
): PipelineNode {
  return {
    id,
    type: 'generateImage',
    position: { x: 0, y: 0 },
    status,
    imageUrl: null,
    errorMessage: null,
    pendingRun,
  };
}

describe('isRunAbandoned', () => {
  it('is false for a run whose owner is still connected', () => {
    const node = imageNode('a', 'pending', { clientId: 7, startedAt: NOW - 1_000 });

    expect(isRunAbandoned(node, new Set([7]), NOW)).toBe(false);
  });

  it('is true once the owner disappears from awareness', () => {
    const node = imageNode('a', 'pending', { clientId: 7, startedAt: NOW - 1_000 });

    expect(isRunAbandoned(node, new Set([9]), NOW)).toBe(true);
  });

  it('is true for a connected owner whose run outlived the timeout', () => {
    const node = imageNode('a', 'pending', {
      clientId: 7,
      startedAt: NOW - RUN_TIMEOUT_MS - 1,
    });

    expect(isRunAbandoned(node, new Set([7]), NOW)).toBe(true);
  });

  it('is true for a pending node written by an older build without run ownership', () => {
    expect(isRunAbandoned(imageNode('a', 'pending'), new Set([7]), NOW)).toBe(true);
  });

  it('is false for nodes that are not pending', () => {
    for (const status of ['idle', 'ready', 'error'] as const) {
      expect(isRunAbandoned(imageNode('a', status), new Set(), NOW)).toBe(false);
    }
  });

  it('is false for text prompt nodes, which never run', () => {
    const node: PipelineNode = { id: 't', type: 'textPrompt', position: { x: 0, y: 0 }, prompt: '' };

    expect(isRunAbandoned(node, new Set(), NOW)).toBe(false);
  });

  it('collects only the abandoned node ids', () => {
    const nodes = [
      imageNode('live', 'pending', { clientId: 7, startedAt: NOW }),
      imageNode('abandoned', 'pending', { clientId: 8, startedAt: NOW }),
      imageNode('ready', 'ready'),
    ];

    expect(collectAbandonedRunNodeIds(nodes, new Set([7]), NOW)).toEqual(new Set(['abandoned']));
  });
});
