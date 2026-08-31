import type { NodeProps } from '@xyflow/react';
import type { TextPromptNode as TextPromptNodeType } from '@repo/shared-types';
import { Textarea } from '@/components/ui/textarea';
import type { PipelineNodeData } from '@/pipeline/reactFlowAdapter';
import { NodeCardShell } from './NodeCardShell';
import { PortHandle } from './PortHandle';

export function TextPromptNode({ data }: NodeProps) {
  const { pipelineNode, onChangePrompt, onDeleteNode, remoteSelectors } =
    data as unknown as PipelineNodeData;
  const node = pipelineNode as TextPromptNodeType;

  return (
    <NodeCardShell
      title="Text Prompt"
      onDelete={() => onDeleteNode(node.id)}
      remoteSelectors={remoteSelectors}
    >
      <Textarea
        value={node.prompt}
        onChange={(event) => onChangePrompt(node.id, event.target.value)}
        placeholder="Describe what you want to generate..."
        className="nodrag h-24 resize-none font-mono text-[13px]"
      />
      <PortHandle variant="output" />
    </NodeCardShell>
  );
}
