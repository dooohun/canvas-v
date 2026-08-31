import type { NodeProps } from '@xyflow/react';
import { ImageIcon, LoaderCircle, Play, TriangleAlert } from 'lucide-react';
import type { GenerateImageNode as GenerateImageNodeType } from '@repo/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { PipelineNodeData } from '@/pipeline/reactFlowAdapter';
import { NodeCardShell } from './NodeCardShell';
import { PortHandle } from './PortHandle';

function runLabel(status: GenerateImageNodeType['status'], isRunning: boolean): string {
  if (isRunning) return '생성 중...';
  return status === 'idle' ? '이미지 생성' : '다시 생성';
}

export function GenerateImageNode({ data }: NodeProps) {
  const { pipelineNode, onDeleteNode, onRunNode, remoteSelectors, inputPrompt, isRunAbandoned } =
    data as unknown as PipelineNodeData;
  const node = pipelineNode as GenerateImageNodeType;
  const hasInput = inputPrompt.length > 0;
  const isPending = node.status === 'pending';
  const isRunning = isPending && !isRunAbandoned;

  return (
    <NodeCardShell
      title="Generate Image"
      onDelete={() => onDeleteNode(node.id)}
      remoteSelectors={remoteSelectors}
      bodyClassName="flex flex-col gap-3 p-4"
      headerRight={
        <Badge
          variant="secondary"
          data-testid="generate-image-status"
          className="font-mono text-[10px] text-slate-500"
        >
          {node.status}
        </Badge>
      }
    >
      <div className="flex w-full items-center justify-center rounded-md border-2 border-dashed border-slate-200 bg-[#eef4ff] py-8">
        {node.status === 'ready' && node.imageUrl ? (
          <img
            src={node.imageUrl}
            alt="생성된 이미지"
            className="h-full w-full rounded-md object-cover"
          />
        ) : isRunning ? (
          <div className="flex flex-col items-center gap-2 text-slate-500">
            <LoaderCircle className="size-[18px] animate-spin" />
            <span className="text-[11px] font-medium">생성 중...</span>
          </div>
        ) : isPending ? (
          <div className="flex flex-col items-center gap-2 px-3 text-amber-600">
            <TriangleAlert className="size-[18px]" />
            <span
              data-testid="generate-image-abandoned"
              className="text-center text-[11px] font-medium"
            >
              실행하던 사용자의 연결이 끊겼습니다. 다시 실행하세요
            </span>
          </div>
        ) : node.status === 'error' ? (
          <div className="flex flex-col items-center gap-2 px-3 text-rose-600">
            <TriangleAlert className="size-[18px]" />
            <span
              role="alert"
              data-testid="generate-image-error"
              className="text-center text-[11px] font-medium"
            >
              {node.errorMessage ?? '이미지 생성에 실패했습니다'}
            </span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-slate-500">
            <ImageIcon className="size-[18px]" />
            <span className="text-[11px] font-medium">Empty Output</span>
          </div>
        )}
      </div>
      <Button
        type="button"
        size="sm"
        aria-label="이미지 생성 실행"
        data-testid="run-generate-image"
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
          Text Prompt 노드를 연결하고 내용을 입력하세요
        </p>
      )}
      <PortHandle variant="input" />
      <PortHandle variant="output" />
    </NodeCardShell>
  );
}
