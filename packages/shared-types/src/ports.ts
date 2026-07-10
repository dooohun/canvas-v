import type { NodeType } from './node.js';

/** See docs/data-model.md section 2. */
export type PortDataType = 'text' | 'image';

interface NodePorts {
  input: PortDataType | null;
  output: PortDataType | null;
}

/**
 * Single source of truth for port compatibility. Client-side connection
 * validation must read this rather than re-encoding the rules elsewhere
 * (docs/architecture.md: the server never sees this at all).
 */
export const NODE_PORTS: Record<NodeType, NodePorts> = {
  textPrompt: { input: null, output: 'text' },
  generateImage: { input: 'text', output: 'image' },
  generate3d: { input: 'image', output: null },
};

/** True when an edge from `sourceType`'s output to `targetType`'s input is valid. */
export function canConnect(sourceType: NodeType, targetType: NodeType): boolean {
  const outputType = NODE_PORTS[sourceType].output;
  const inputType = NODE_PORTS[targetType].input;
  return outputType !== null && inputType !== null && outputType === inputType;
}
