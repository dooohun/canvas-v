import type { PipelineEdge, PipelineNode } from '@repo/shared-types';
import { collectIncomingSources } from './fanIn';

/**
 * `POST /api/generate-3d` takes exactly one image, so a generate3d node with several incoming
 * generateImage nodes uses the first one that is `ready` in fan-in order. `null` means the node
 * has no runnable input yet. See docs/architecture.md "여러 입력(fan-in) 조합 규칙".
 */
export function selectInputImageUrl(
  nodes: PipelineNode[],
  edges: PipelineEdge[],
  targetNodeId: string,
): string | null {
  for (const source of collectIncomingSources(nodes, edges, targetNodeId, 'generateImage')) {
    if (source.status === 'ready' && source.imageUrl) return source.imageUrl;
  }
  return null;
}

export function selectInputImageUrlsByNodeId(
  nodes: PipelineNode[],
  edges: PipelineEdge[],
): Map<string, string | null> {
  const byNodeId = new Map<string, string | null>();
  for (const node of nodes) {
    if (node.type !== 'generate3d') continue;
    byNodeId.set(node.id, selectInputImageUrl(nodes, edges, node.id));
  }
  return byNodeId;
}
