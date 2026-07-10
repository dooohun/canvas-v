import type { Edge, Node } from '@xyflow/react';
import type { PipelineEdge, PipelineNode } from '@repo/shared-types';

export interface PipelineNodeHandlers {
  onChangePrompt: (id: string, prompt: string) => void;
  onDeleteNode: (id: string) => void;
}

export interface PipelineNodeData extends PipelineNodeHandlers {
  pipelineNode: PipelineNode;
  [key: string]: unknown;
}

export function toReactFlowEdges(edges: PipelineEdge[]): Edge[] {
  return edges.map((edge) => ({
    id: edge.id,
    source: edge.sourceNodeId,
    target: edge.targetNodeId,
  }));
}

/**
 * Reconciles the domain node list into React Flow's node list, preserving each existing node's
 * current position (owned locally by React Flow while dragging) instead of overwriting it with
 * the domain's last-committed position.
 */
export function reconcileFlowNodes(
  domainNodes: PipelineNode[],
  currentFlowNodes: Node<PipelineNodeData>[],
  handlers: PipelineNodeHandlers,
): Node<PipelineNodeData>[] {
  const currentById = new Map(currentFlowNodes.map((node) => [node.id, node]));
  return domainNodes.map((domainNode) => {
    const existing = currentById.get(domainNode.id);
    return {
      id: domainNode.id,
      type: domainNode.type,
      position: existing?.position ?? domainNode.position,
      data: { pipelineNode: domainNode, ...handlers },
    };
  });
}
