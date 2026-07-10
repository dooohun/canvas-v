import { Handle, Position } from '@xyflow/react';
import { cn } from '@/lib/utils';

interface PortHandleProps {
  variant: 'input' | 'output';
}

export function PortHandle({ variant }: PortHandleProps) {
  const isOutput = variant === 'output';
  return (
    <Handle
      type={isOutput ? 'source' : 'target'}
      position={isOutput ? Position.Right : Position.Left}
      className={cn(
        '!size-3 !rounded-full !border-2 !border-white !shadow-[0_0_0_1px_#e2e8f0]',
        isOutput ? '!bg-slate-900' : '!bg-slate-400',
      )}
    />
  );
}
