/** See docs/data-model.md section 2. */
export type NodeStatus = 'pending' | 'ready' | 'error';

export interface GraphNode {
  id: string;
  prompt: string;
  status: NodeStatus;
  imageUrl: string | null;
  errorMessage: string | null;
  parentNodeId: string | null;
  position: { x: number; y: number };
  createdAt: number;
}

export interface GraphEdge {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
}
