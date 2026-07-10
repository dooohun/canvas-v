/** See docs/data-model.md section 1. */
export type NodeType = 'textPrompt' | 'generateImage' | 'generate3d';

export type NodeStatus = 'idle' | 'pending' | 'ready' | 'error';

interface NodeBase {
  id: string;
  position: { x: number; y: number };
}

/** Start node — no input port, its `prompt` value is the output. */
export interface TextPromptNode extends NodeBase {
  type: 'textPrompt';
  prompt: string;
}

/**
 * Input text is not stored here — it's resolved at execution time from the
 * connected TextPromptNode(s) via edges, to avoid duplicating that state.
 */
export interface GenerateImageNode extends NodeBase {
  type: 'generateImage';
  status: NodeStatus;
  imageUrl: string | null;
  errorMessage: string | null;
}

/**
 * Terminal node — no output port. `resultUrl` is deliberately neutral: see
 * docs/architecture.md "열린 질문" for whether this is a texture-mapped
 * preview or a generated 3D asset URL.
 */
export interface Generate3dNode extends NodeBase {
  type: 'generate3d';
  status: NodeStatus;
  resultUrl: string | null;
  errorMessage: string | null;
}

export type PipelineNode = TextPromptNode | GenerateImageNode | Generate3dNode;
