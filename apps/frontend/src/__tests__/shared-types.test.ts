import type { GenerateImageNode, TextPromptNode } from '@repo/shared-types';
import { canConnect, NODE_PORTS, WS_MESSAGE_TYPE } from '@repo/shared-types';
import { describe, expect, it } from 'vitest';

describe('@repo/shared-types', () => {
  it('is importable and usable from the frontend workspace', () => {
    const textPrompt: TextPromptNode = {
      id: 'text-1',
      type: 'textPrompt',
      position: { x: 0, y: 0 },
      prompt: 'a cat',
    };
    const generateImage: GenerateImageNode = {
      id: 'image-1',
      type: 'generateImage',
      position: { x: 200, y: 0 },
      status: 'idle',
      imageUrl: null,
      errorMessage: null,
    };

    expect(textPrompt.prompt).toBe('a cat');
    expect(generateImage.status).toBe('idle');
    expect(WS_MESSAGE_TYPE.SYNC).toBe(0);
  });

  it('validates edges using NODE_PORTS only (text-to-text, image-to-image)', () => {
    expect(canConnect('textPrompt', 'generateImage')).toBe(true);
    expect(canConnect('generateImage', 'generate3d')).toBe(true);
    expect(canConnect('textPrompt', 'generate3d')).toBe(false);
    expect(canConnect('generateImage', 'textPrompt')).toBe(false);
    expect(NODE_PORTS.textPrompt.output).toBe('text');
    expect(NODE_PORTS.generate3d.output).toBeNull();
  });
});
