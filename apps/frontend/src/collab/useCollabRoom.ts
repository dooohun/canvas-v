import { useEffect, useMemo, useState } from 'react';
import { Awareness } from 'y-protocols/awareness';
import * as Y from 'yjs';
import { createLocalIdentity } from './localIdentity';
import { YjsWebSocketProvider, type ConnectionStatus } from './YjsWebSocketProvider';
import type { CollabContextValue } from './CollabContext';

const DEV_BACKEND_PORT = '3001';

export function roomIdFromSearch(search: string): string {
  const roomId = new URLSearchParams(search).get('room');
  return roomId && roomId.length > 0 ? roomId : 'default';
}

export function collabWsUrl(roomId: string): string {
  const configured = import.meta.env.VITE_WS_URL as string | undefined;
  if (configured) {
    return `${configured}?room=${encodeURIComponent(roomId)}`;
  }
  const { protocol, hostname, port } = window.location;
  const wsProtocol = protocol === 'https:' ? 'wss:' : 'ws:';
  // In `pnpm dev` the Vite server and the WS server are different origins.
  const wsPort = import.meta.env.DEV ? DEV_BACKEND_PORT : port;
  const host = wsPort ? `${hostname}:${wsPort}` : hostname;
  return `${wsProtocol}//${host}/?room=${encodeURIComponent(roomId)}`;
}

export function useCollabRoom(roomId: string): CollabContextValue {
  const doc = useMemo(() => new Y.Doc(), []);
  const awareness = useMemo(() => {
    const instance = new Awareness(doc);
    instance.setLocalState(createLocalIdentity(instance.clientID));
    return instance;
  }, [doc]);
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');

  useEffect(() => {
    const provider = new YjsWebSocketProvider({
      url: collabWsUrl(roomId),
      doc,
      awareness,
      onStatusChange: setStatus,
    });
    provider.connect();
    return () => {
      provider.destroy();
    };
  }, [doc, awareness, roomId]);

  return { doc, awareness, status, roomId };
}
