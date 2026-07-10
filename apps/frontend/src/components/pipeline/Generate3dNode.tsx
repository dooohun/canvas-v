import type { NodeProps } from '@xyflow/react';
import type { Generate3dNode as Generate3dNodeType } from '@repo/shared-types';
import { Badge } from '@/components/ui/badge';
import type { PipelineNodeData } from '@/pipeline/reactFlowAdapter';
import { NodeCardShell } from './NodeCardShell';
import { PortHandle } from './PortHandle';

export function Generate3dNode({ data }: NodeProps) {
  const { pipelineNode, onDeleteNode } = data as unknown as PipelineNodeData;
  const node = pipelineNode as Generate3dNodeType;

  return (
    <NodeCardShell
      title="3D Mesh Synth"
      onDelete={() => onDeleteNode(node.id)}
      headerRight={
        <Badge variant="secondary" className="font-mono text-[10px] text-slate-500">
          {node.status}
        </Badge>
      }
      className="w-80"
      bodyClassName="flex flex-col gap-4"
    >
      <div className="flex aspect-square w-full items-center justify-center rounded-md border border-slate-200 bg-slate-950">
        <span className="font-mono text-[11px] text-slate-500">
          {node.status === 'error' ? (node.errorMessage ?? '[ERROR]') : '[3D_VIEWPORT_RENDERER]'}
        </span>
      </div>
      <PortHandle variant="input" />
    </NodeCardShell>
  );
}
