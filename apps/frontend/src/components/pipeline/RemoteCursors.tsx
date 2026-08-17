import { ViewportPortal } from '@xyflow/react';
import { MousePointer2 } from 'lucide-react';
import type { AwarenessState } from '@repo/shared-types';

interface RemoteCursorsProps {
  remotePresence: AwarenessState[];
}

/** Cursors are stored in flow coordinates, so ViewportPortal keeps them anchored under pan/zoom. */
export function RemoteCursors({ remotePresence }: RemoteCursorsProps) {
  return (
    <ViewportPortal>
      {remotePresence.map((peer) =>
        peer.cursor ? (
          <div
            key={peer.clientId}
            className="pointer-events-none absolute flex items-center gap-1"
            style={{ transform: `translate(${peer.cursor.x}px, ${peer.cursor.y}px)` }}
          >
            <MousePointer2 className="size-4" style={{ color: peer.color, fill: peer.color }} />
            <span
              className="rounded px-1 py-0.5 text-[10px] font-semibold text-white"
              style={{ backgroundColor: peer.color }}
            >
              {peer.name}
            </span>
          </div>
        ) : null,
      )}
    </ViewportPortal>
  );
}
