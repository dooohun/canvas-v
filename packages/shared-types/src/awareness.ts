/**
 * Per-client volatile state carried by y-protocols/awareness, not persisted
 * on the Y.Doc. See docs/data-model.md section 4.
 */
export interface AwarenessState {
  clientId: number;
  name: string;
  color: string;
  cursor: { x: number; y: number } | null;
  selectedNodeId: string | null;
}
