import type { CanvasObject } from '@repo/shared-types';
import { WS_MESSAGE_TYPE } from '@repo/shared-types';
import { describe, expect, it } from 'vitest';

describe('@repo/shared-types', () => {
  it('is importable and usable from the frontend workspace', () => {
    const object: CanvasObject = {
      id: 'example',
      imageUrl: '',
      sourceNodeId: null,
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      rotation: 0,
    };

    expect(object.id).toBe('example');
    expect(WS_MESSAGE_TYPE.SYNC).toBe(0);
  });
});
