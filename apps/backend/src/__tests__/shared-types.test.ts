// Import-verification only (shared-types feature requirement). The actual
// server runtime (src/app.ts, src/ws-server.ts) must never import these —
// see docs/architecture.md "서버는 도메인 구조를 절대 들여다보지 않는다".
import type { Generate3dNode, PipelineEdge } from '@repo/shared-types';
import { canConnect, WS_MESSAGE_TYPE } from '@repo/shared-types';
import { describe, expect, it } from 'vitest';

describe('@repo/shared-types', () => {
  it('is importable and usable from the backend workspace', () => {
    const generate3d: Generate3dNode = {
      id: '3d-1',
      type: 'generate3d',
      position: { x: 400, y: 0 },
      status: 'pending',
      resultUrl: null,
      errorMessage: null,
    };
    const edge: PipelineEdge = {
      id: 'edge-1',
      sourceNodeId: 'image-1',
      targetNodeId: generate3d.id,
    };

    expect(generate3d.status).toBe('pending');
    expect(edge.targetNodeId).toBe('3d-1');
    expect(WS_MESSAGE_TYPE.AWARENESS).toBe(1);
  });

  it('validates edges using NODE_PORTS only (text-to-text, image-to-image)', () => {
    expect(canConnect('textPrompt', 'generateImage')).toBe(true);
    expect(canConnect('generateImage', 'generate3d')).toBe(true);
    expect(canConnect('textPrompt', 'textPrompt')).toBe(false);
  });
});
