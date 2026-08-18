import type { PipelineEdge, PipelineNode, TextPromptNode } from '@repo/shared-types';

export const PROMPT_JOIN_SEPARATOR = '\n';

/**
 * Fan-in order is derived from canvas position (top-to-bottom, then left-to-right,
 * node id as the final tie-break) rather than edge creation order: every peer holds the
 * same positions, so every peer composes the identical prompt string.
 * See docs/architecture.md "여러 입력을 어떻게 조합하는지".
 */
function compareByCanvasPosition(a: PipelineNode, b: PipelineNode): number {
  if (a.position.y !== b.position.y) return a.position.y - b.position.y;
  if (a.position.x !== b.position.x) return a.position.x - b.position.x;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

export function collectPromptSources(
  nodes: PipelineNode[],
  edges: PipelineEdge[],
  targetNodeId: string,
): TextPromptNode[] {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const sources = new Map<string, TextPromptNode>();
  for (const edge of edges) {
    if (edge.targetNodeId !== targetNodeId) continue;
    const source = nodeById.get(edge.sourceNodeId);
    if (source?.type === 'textPrompt') sources.set(source.id, source);
  }
  return [...sources.values()].sort(compareByCanvasPosition);
}

/** Empty string means the node has no runnable input (no edges, or only blank prompts). */
export function composeInputPrompt(
  nodes: PipelineNode[],
  edges: PipelineEdge[],
  targetNodeId: string,
): string {
  return collectPromptSources(nodes, edges, targetNodeId)
    .map((node) => node.prompt.trim())
    .filter((prompt) => prompt.length > 0)
    .join(PROMPT_JOIN_SEPARATOR);
}

export function composeInputPromptsByNodeId(
  nodes: PipelineNode[],
  edges: PipelineEdge[],
): Map<string, string> {
  const byNodeId = new Map<string, string>();
  for (const node of nodes) {
    if (node.type !== 'generateImage') continue;
    byNodeId.set(node.id, composeInputPrompt(nodes, edges, node.id));
  }
  return byNodeId;
}
