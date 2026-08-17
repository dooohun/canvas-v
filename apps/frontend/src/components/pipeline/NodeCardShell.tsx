import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RemoteSelector } from '@/collab/usePresence';

interface NodeCardShellProps {
  title: string;
  headerRight?: ReactNode;
  onDelete?: () => void;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  remoteSelectors?: RemoteSelector[];
}

export function NodeCardShell({
  title,
  headerRight,
  onDelete,
  children,
  className,
  bodyClassName,
  remoteSelectors,
}: NodeCardShellProps) {
  const selectors = remoteSelectors ?? [];
  const highlightColor = selectors[0]?.color;

  return (
    <div
      className={cn(
        'relative w-72 rounded-lg border border-slate-200 bg-white shadow-[0_1px_1px_rgba(0,0,0,0.05)]',
        className,
      )}
      style={
        highlightColor
          ? { outline: `2px solid ${highlightColor}`, outlineOffset: '2px' }
          : undefined
      }
    >
      {selectors.length > 0 && (
        <div className="absolute -top-6 left-0 flex gap-1">
          {selectors.map((selector) => (
            <span
              key={selector.clientId}
              className="rounded px-1.5 py-0.5 text-[10px] font-semibold text-white"
              style={{ backgroundColor: selector.color }}
            >
              {selector.name}
            </span>
          ))}
        </div>
      )}
      <div className="flex items-center justify-between rounded-t-lg border-b border-slate-200 bg-[rgba(238,244,255,0.3)] px-4 py-2">
        <span className="text-sm font-semibold tracking-[-0.4px] text-slate-900 uppercase">
          {title}
        </span>
        <div className="flex items-center gap-2">
          {headerRight}
          {onDelete && (
            <button
              type="button"
              aria-label={`${title} 노드 삭제`}
              onClick={onDelete}
              className="text-slate-400 hover:text-slate-600"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
      </div>
      <div className={cn('relative p-4', bodyClassName)}>{children}</div>
    </div>
  );
}
