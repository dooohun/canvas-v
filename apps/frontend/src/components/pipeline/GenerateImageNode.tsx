import type { NodeProps } from '@xyflow/react';
import { ImageIcon } from 'lucide-react';
import type { GenerateImageNode as GenerateImageNodeType } from '@repo/shared-types';
import { Badge } from '@/components/ui/badge';
import type { PipelineNodeData } from '@/pipeline/reactFlowAdapter';
import { NodeCardShell } from './NodeCardShell';
import { PortHandle } from './PortHandle';

export function GenerateImageNode({ data }: NodeProps) {
  const { pipelineNode, onDeleteNode } = data as unknown as PipelineNodeData;
  const node = pipelineNode as GenerateImageNodeType;

  return (
    <NodeCardShell
      title="Generate Image"
      onDelete={() => onDeleteNode(node.id)}
      headerRight={
        <Badge variant="secondary" className="font-mono text-[10px] text-slate-500">
          {node.status}
        </Badge>
      }
    >
      <div className="flex w-full items-center justify-center rounded-md border-2 border-dashed border-slate-200 bg-[#eef4ff] py-8">
        {node.imageUrl ? (
          <img src={node.imageUrl} alt="" className="h-full w-full rounded-md object-cover" />
        ) : (
          <div className="flex flex-col items-center gap-2 text-slate-500">
            <ImageIcon className="size-[18px]" />
            <span className="text-[11px] font-medium">
              {node.status === 'error' ? (node.errorMessage ?? 'Error') : 'Empty Output'}
            </span>
          </div>
        )}
      </div>
      <PortHandle variant="input" />
      <PortHandle variant="output" />
    </NodeCardShell>
  );
}
