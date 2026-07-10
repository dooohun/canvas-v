/**
 * See docs/data-model.md section 3. No port id — each node type has at
 * most one input and one output port, so sourceNodeId/targetNodeId alone
 * always determine which port is meant.
 */
export interface PipelineEdge {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
}
