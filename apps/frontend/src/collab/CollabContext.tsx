import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { Awareness } from 'y-protocols/awareness';
import type * as Y from 'yjs';
import type { ConnectionStatus } from './YjsWebSocketProvider';

export interface CollabContextValue {
  doc: Y.Doc;
  awareness: Awareness;
  status: ConnectionStatus;
  roomId: string;
}

const CollabContext = createContext<CollabContextValue | null>(null);

interface CollabProviderProps {
  doc: Y.Doc;
  awareness: Awareness;
  status?: ConnectionStatus;
  roomId?: string;
  children: ReactNode;
}

export function CollabProvider({ doc, awareness, status, roomId, children }: CollabProviderProps) {
  const value = useMemo<CollabContextValue>(
    () => ({ doc, awareness, status: status ?? 'disconnected', roomId: roomId ?? 'local' }),
    [doc, awareness, status, roomId],
  );
  return <CollabContext.Provider value={value}>{children}</CollabContext.Provider>;
}

export function useCollab(): CollabContextValue {
  const value = useContext(CollabContext);
  if (!value) {
    throw new Error('useCollab must be used inside a <CollabProvider>');
  }
  return value;
}
