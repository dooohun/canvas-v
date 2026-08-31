import type { AwarenessState } from '@repo/shared-types';
import type { ConnectionStatus } from '@/collab/YjsWebSocketProvider';

const STATUS_LABEL: Record<ConnectionStatus, string> = {
  connecting: '연결 중',
  connected: '연결됨',
  disconnected: '연결 끊김',
};

const STATUS_COLOR: Record<ConnectionStatus, string> = {
  connecting: 'bg-amber-400',
  connected: 'bg-emerald-500',
  disconnected: 'bg-slate-400',
};

interface PresenceBarProps {
  roomId: string;
  status: ConnectionStatus;
  localName: string;
  localColor: string;
  remotePresence: AwarenessState[];
}

export function PresenceBar({
  roomId,
  status,
  localName,
  localColor,
  remotePresence,
}: PresenceBarProps) {
  return (
    <div
      data-testid="presence-bar"
      className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white/90 px-3 py-2 shadow-lg backdrop-blur"
    >
      <span className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
        <span className={`size-2 rounded-full ${STATUS_COLOR[status]}`} aria-hidden />
        <span data-testid="connection-status">{STATUS_LABEL[status]}</span>
      </span>
      <span className="font-mono text-[11px] text-slate-400">room: {roomId}</span>
      <span className="h-4 w-px bg-slate-200" aria-hidden />
      <ul className="flex items-center gap-2">
        <li className="flex items-center gap-1 text-xs text-slate-700">
          <span className="size-2.5 rounded-full" style={{ backgroundColor: localColor }} />
          {localName} (나)
        </li>
        {remotePresence.map((peer) => (
          <li key={peer.clientId} className="flex items-center gap-1 text-xs text-slate-700">
            <span className="size-2.5 rounded-full" style={{ backgroundColor: peer.color }} />
            {peer.name}
          </li>
        ))}
      </ul>
    </div>
  );
}
