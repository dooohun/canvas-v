import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NodeCardShellProps {
  title: string;
  headerRight?: ReactNode;
  onDelete?: () => void;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}

export function NodeCardShell({
  title,
  headerRight,
  onDelete,
  children,
  className,
  bodyClassName,
}: NodeCardShellProps) {
  return (
    <div
      className={cn(
        'w-72 rounded-lg border border-slate-200 bg-white shadow-[0_1px_1px_rgba(0,0,0,0.05)]',
        className,
      )}
    >
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
