import type { NodeType, PipelineEdge, PipelineNode } from '@repo/shared-types';

/**
 * Fan-in order is derived from canvas position (top-to-bottom, then left-to-right,
 * node id as the final tie-break) rather than edge creation order: every peer holds the
 * same positions, so every peer resolves the identical input.
 * See docs/architecture.md "여러 입력(fan-in) 조합 규칙".
 */
export function compareByCanvasPosition(a: PipelineNode, b: PipelineNode): number {
  if (a.position.y !== b.position.y) return a.position.y - b.position.y;
  if (a.position.x !== b.position.x) return a.position.x - b.position.x;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/** Incoming sources of the given type, deduplicated by node id and in fan-in order. */
export function collectIncomingSources<T extends NodeType>(
  nodes: PipelineNode[],
  edges: PipelineEdge[],
  targetNodeId: string,
  sourceType: T,
): Extract<PipelineNode, { type: T }>[] {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const sources = new Map<string, Extract<PipelineNode, { type: T }>>();
  for (const edge of edges) {
    if (edge.targetNodeId !== targetNodeId) continue;
    const source = nodeById.get(edge.sourceNodeId);
    if (source?.type === sourceType) {
      sources.set(source.id, source as Extract<PipelineNode, { type: T }>);
    }
  }
  return [...sources.values()].sort(compareByCanvasPosition);
}
