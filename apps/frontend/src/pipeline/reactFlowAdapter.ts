import type { Edge, Node } from '@xyflow/react';
import type { PipelineEdge, PipelineNode } from '@repo/shared-types';
import type { RemoteSelector } from '@/collab/usePresence';

export interface PipelineNodeHandlers {
  onChangePrompt: (id: string, prompt: string) => void;
  onDeleteNode: (id: string) => void;
  onRunNode: (id: string) => void;
}

export interface PipelineNodeData extends PipelineNodeHandlers {
  pipelineNode: PipelineNode;
  remoteSelectors: RemoteSelector[];
  /** Prompt resolved from the incoming edges; empty when the node has no runnable input. */
  inputPrompt: string;
  /** Image resolved from the incoming edges (generate3d only); null when there is none yet. */
  inputImageUrl: string | null;
  /** A `pending` run whose owner is gone; the node stays runnable so it can be recovered. */
  isRunAbandoned: boolean;
  [key: string]: unknown;
}

/** Per-node projections that are derived outside the Y.Doc (presence, resolved inputs). */
export interface ReconcileContext {
  handlers: PipelineNodeHandlers;
  selectorsByNodeId?: Map<string, RemoteSelector[]>;
  inputPromptByNodeId?: Map<string, string>;
  inputImageUrlByNodeId?: Map<string, string | null>;
  abandonedRunNodeIds?: ReadonlySet<string>;
}

const NO_SELECTORS: RemoteSelector[] = [];

export function toReactFlowEdges(edges: PipelineEdge[]): Edge[] {
  return edges.map((edge) => ({
    id: edge.id,
    source: edge.sourceNodeId,
    target: edge.targetNodeId,
  }));
}

/**
 * Reconciles the shared (Yjs) node list into React Flow's node list. A node the
 * local user is currently dragging keeps its live React Flow position — that
 * position is only committed to the Y.Doc on drag end — while every other node
 * takes the shared position so remote moves are visible immediately.
 */
export function reconcileFlowNodes(
  domainNodes: PipelineNode[],
  currentFlowNodes: Node<PipelineNodeData>[],
  context: ReconcileContext,
): Node<PipelineNodeData>[] {
  const {
    handlers,
    selectorsByNodeId,
    inputPromptByNodeId,
    inputImageUrlByNodeId,
    abandonedRunNodeIds,
  } = context;
  const currentById = new Map(currentFlowNodes.map((node) => [node.id, node]));
  return domainNodes.map((domainNode) => {
    const existing = currentById.get(domainNode.id);
    return {
      ...existing,
      id: domainNode.id,
      type: domainNode.type,
      position: existing?.dragging ? existing.position : domainNode.position,
      data: {
        pipelineNode: domainNode,
        remoteSelectors: selectorsByNodeId?.get(domainNode.id) ?? NO_SELECTORS,
        inputPrompt: inputPromptByNodeId?.get(domainNode.id) ?? '',
        inputImageUrl: inputImageUrlByNodeId?.get(domainNode.id) ?? null,
        isRunAbandoned: abandonedRunNodeIds?.has(domainNode.id) ?? false,
        ...handlers,
      },
    };
  });
}
