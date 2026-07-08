import type { GraphNode } from '@repo/shared-types';
import { WS_MESSAGE_TYPE } from '@repo/shared-types';
import { describe, expect, it } from 'vitest';

describe('@repo/shared-types', () => {
  it('is importable and usable from the backend workspace', () => {
    const node: GraphNode = {
      id: 'example',
      prompt: 'a cat',
      status: 'pending',
      imageUrl: null,
      errorMessage: null,
      parentNodeId: null,
      position: { x: 0, y: 0 },
      createdAt: 0,
    };

    expect(node.status).toBe('pending');
    expect(WS_MESSAGE_TYPE.AWARENESS).toBe(1);
  });
});
