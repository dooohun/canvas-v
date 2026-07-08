/**
 * A single item on the canvas. See docs/data-model.md section 1.
 * z-order is tracked separately (canvasObjectOrder), not on this shape.
 */
export interface CanvasObject {
  id: string;
  imageUrl: string;
  sourceNodeId: string | null;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}
