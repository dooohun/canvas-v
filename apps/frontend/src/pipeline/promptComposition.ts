import type { PipelineEdge, PipelineNode, TextPromptNode } from '@repo/shared-types';
import { collectIncomingSources } from './fanIn';

export const PROMPT_JOIN_SEPARATOR = '\n';

export function collectPromptSources(
  nodes: PipelineNode[],
  edges: PipelineEdge[],
  targetNodeId: string,
): TextPromptNode[] {
  return collectIncomingSources(nodes, edges, targetNodeId, 'textPrompt');
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
