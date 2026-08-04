import type { IncomingMessage, Server as HttpServer } from 'node:http';
import { WS_MESSAGE_TYPE } from '@repo/shared-types';
import * as decoding from 'lib0/decoding';
import * as encoding from 'lib0/encoding';
import { type RawData, WebSocket, WebSocketServer } from 'ws';
import * as awarenessProtocol from 'y-protocols/awareness';
import * as syncProtocol from 'y-protocols/sync';
import * as Y from 'yjs';

/**
 * A room is one Y.Doc kept in server memory plus the sockets currently editing
 * it. The server applies Yjs's generic CRDT merge (Y.applyUpdate) so it can
 * answer new clients' handshakes, but never inspects the document's domain
 * structure — see docs/ws-protocol.md section 0.
 */
interface Room {
  doc: Y.Doc;
  awareness: awarenessProtocol.Awareness;
  clients: Set<WebSocket>;
  /** clientIDs whose awareness state each socket introduced, so they can be removed on disconnect. */
  controlledIds: Map<WebSocket, Set<number>>;
}

function toUint8Array(data: RawData): Uint8Array {
  if (Array.isArray(data)) {
    return new Uint8Array(Buffer.concat(data));
  }
  if (data instanceof ArrayBuffer) {
    return new Uint8Array(data);
  }
  return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
}

function send(conn: WebSocket, payload: Uint8Array): void {
  if (conn.readyState !== WebSocket.CONNECTING && conn.readyState !== WebSocket.OPEN) {
    return;
  }
  conn.send(payload, (error) => {
    if (error) conn.close();
  });
}

function broadcast(room: Room, sender: WebSocket, payload: Uint8Array): void {
  for (const client of room.clients) {
    if (client !== sender) send(client, payload);
  }
}

export function attachWebSocketServer(httpServer: HttpServer): WebSocketServer {
  const wss = new WebSocketServer({ server: httpServer });
  const rooms = new Map<string, Room>();

  function getOrCreateRoom(roomId: string): Room {
    let room = rooms.get(roomId);
    if (room) return room;

    const doc = new Y.Doc();
    const awareness = new awarenessProtocol.Awareness(doc);
    awareness.setLocalState(null);
    const controlledIds = new Map<WebSocket, Set<number>>();

    awareness.on(
      'update',
      ({ added, removed }: { added: number[]; removed: number[] }, origin: unknown) => {
        if (!(origin instanceof WebSocket)) return;
        const ids = controlledIds.get(origin);
        if (!ids) return;
        for (const id of added) ids.add(id);
        for (const id of removed) ids.delete(id);
      },
    );

    room = { doc, awareness, clients: new Set(), controlledIds };
    rooms.set(roomId, room);
    return room;
  }

  wss.on('connection', (conn: WebSocket, request: IncomingMessage) => {
    const url = new URL(request.url ?? '', 'http://localhost');
    const roomIdParam = url.searchParams.get('room');
    if (!roomIdParam) {
      conn.close(4400, 'room query param is required');
      return;
    }
    const roomId = roomIdParam;

    const room = getOrCreateRoom(roomId);
    room.clients.add(conn);
    room.controlledIds.set(conn, new Set());

    {
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, WS_MESSAGE_TYPE.SYNC);
      syncProtocol.writeSyncStep1(encoder, room.doc);
      send(conn, encoding.toUint8Array(encoder));
    }

    const awarenessStates = room.awareness.getStates();
    if (awarenessStates.size > 0) {
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, WS_MESSAGE_TYPE.AWARENESS);
      encoding.writeVarUint8Array(
        encoder,
        awarenessProtocol.encodeAwarenessUpdate(room.awareness, Array.from(awarenessStates.keys())),
      );
      send(conn, encoding.toUint8Array(encoder));
    }

    conn.on('message', (data: RawData) => {
      const message = toUint8Array(data);
      const decoder = decoding.createDecoder(message);
      const messageType = decoding.readVarUint(decoder);

      if (messageType === WS_MESSAGE_TYPE.SYNC) {
        const encoder = encoding.createEncoder();
        encoding.writeVarUint(encoder, WS_MESSAGE_TYPE.SYNC);
        const syncMessageType = syncProtocol.readSyncMessage(decoder, encoder, room.doc, conn);

        if (syncMessageType === syncProtocol.messageYjsSyncStep1) {
          send(conn, encoding.toUint8Array(encoder));
        } else if (syncMessageType === syncProtocol.messageYjsUpdate) {
          broadcast(room, conn, message);
        }
        return;
      }

      if (messageType === WS_MESSAGE_TYPE.AWARENESS) {
        awarenessProtocol.applyAwarenessUpdate(
          room.awareness,
          decoding.readVarUint8Array(decoder),
          conn,
        );
        broadcast(room, conn, message);
      }
    });

    let cleanedUp = false;
    function cleanup(): void {
      if (cleanedUp) return;
      cleanedUp = true;
      room.clients.delete(conn);

      const ids = room.controlledIds.get(conn);
      room.controlledIds.delete(conn);
      if (ids && ids.size > 0) {
        awarenessProtocol.removeAwarenessStates(room.awareness, Array.from(ids), null);
        const encoder = encoding.createEncoder();
        encoding.writeVarUint(encoder, WS_MESSAGE_TYPE.AWARENESS);
        encoding.writeVarUint8Array(
          encoder,
          awarenessProtocol.encodeAwarenessUpdate(room.awareness, Array.from(ids)),
        );
        broadcast(room, conn, encoding.toUint8Array(encoder));
      }

      if (room.clients.size === 0) {
        room.awareness.destroy();
        room.doc.destroy();
        rooms.delete(roomId);
      }
    }

    conn.on('close', cleanup);
    conn.on('error', cleanup);
  });

  return wss;
}
