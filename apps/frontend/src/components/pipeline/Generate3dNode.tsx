import type { NodeProps } from '@xyflow/react';
import { Box, LoaderCircle, Play, TriangleAlert } from 'lucide-react';
import type { Generate3dNode as Generate3dNodeType } from '@repo/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { PipelineNodeData } from '@/pipeline/reactFlowAdapter';
import { ModelViewer } from './ModelViewer';
import { NodeCardShell } from './NodeCardShell';
import { PortHandle } from './PortHandle';

function runLabel(status: Generate3dNodeType['status'], isRunning: boolean): string {
  if (isRunning) return '생성 중...';
  return status === 'idle' ? '3D 생성' : '다시 생성';
}

export function Generate3dNode({ data }: NodeProps) {
  const { pipelineNode, onDeleteNode, onRunNode, remoteSelectors, inputImageUrl, isRunAbandoned } =
    data as unknown as PipelineNodeData;
  const node = pipelineNode as Generate3dNodeType;
  const hasInput = inputImageUrl !== null;
  const isPending = node.status === 'pending';
  const isRunning = isPending && !isRunAbandoned;

  return (
    <NodeCardShell
      title="3D Mesh Synth"
      onDelete={() => onDeleteNode(node.id)}
      remoteSelectors={remoteSelectors}
      headerRight={
        <Badge
          variant="secondary"
          data-testid="generate-3d-status"
          className="font-mono text-[10px] text-slate-500"
        >
          {node.status}
        </Badge>
      }
      className="w-80"
      bodyClassName="flex flex-col gap-3"
    >
      {node.status === 'ready' && node.modelUrl ? (
        <ModelViewer modelUrl={node.modelUrl} />
      ) : (
        <div className="flex aspect-square w-full items-center justify-center rounded-md border border-slate-200 bg-slate-950">
          {isRunning ? (
            <div className="flex flex-col items-center gap-2 text-slate-400">
              <LoaderCircle className="size-[18px] animate-spin" />
              <span className="text-[11px] font-medium">생성 중...</span>
            </div>
          ) : isPending ? (
            <div className="flex flex-col items-center gap-2 px-3 text-amber-400">
              <TriangleAlert className="size-[18px]" />
              <span
                data-testid="generate-3d-abandoned"
                className="text-center text-[11px] font-medium"
              >
                실행하던 사용자의 연결이 끊겼습니다. 다시 실행하세요
              </span>
            </div>
          ) : node.status === 'error' ? (
            <div className="flex flex-col items-center gap-2 px-3 text-rose-400">
              <TriangleAlert className="size-[18px]" />
              <span
                role="alert"
                data-testid="generate-3d-error"
                className="text-center text-[11px] font-medium"
              >
                {node.errorMessage ?? '3D 모델 생성에 실패했습니다'}
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 text-slate-500">
              <Box className="size-[18px]" />
              <span className="font-mono text-[11px]">[3D_VIEWPORT_RENDERER]</span>
            </div>
          )}
        </div>
      )}
      <Button
        type="button"
        size="sm"
        aria-label="3D 생성 실행"
        data-testid="run-generate-3d"
        disabled={isRunning || !hasInput}
        onClick={() => onRunNode(node.id)}
        className="nodrag w-full"
      >
        {isRunning ? (
          <LoaderCircle className="size-4 animate-spin" />
        ) : (
          <Play className="size-4 fill-current" />
        )}
        {runLabel(node.status, isRunning)}
      </Button>
      {!hasInput && !isRunning && (
        <p className="text-center text-[11px] text-slate-500">
          이미지가 생성된 Generate Image 노드를 연결하세요
        </p>
      )}
      <PortHandle variant="input" />
    </NodeCardShell>
  );
}
