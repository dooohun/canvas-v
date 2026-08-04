import { createServer } from 'node:http';
import type { Server as HttpServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import * as decoding from 'lib0/decoding';
import * as encoding from 'lib0/encoding';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { WebSocket } from 'ws';
import * as syncProtocol from 'y-protocols/sync';
import * as Y from 'yjs';
import { attachWebSocketServer } from '../ws-server.js';

const WS_MESSAGE_SYNC = 0;

/**
 * Minimal browserless Yjs-over-WebSocket client that speaks the same protocol a
 * real provider would (docs/ws-protocol.md section 3). Exists only to drive the
 * server integration tests; the production provider lives in collab-canvas.
 */
class TestClient {
  readonly doc = new Y.Doc();
  private readonly ws: WebSocket;
  private resolveSynced!: () => void;
  readonly synced: Promise<void>;

  constructor(baseUrl: string, room: string) {
    this.synced = new Promise((resolve) => {
      this.resolveSynced = resolve;
    });
    this.ws = new WebSocket(`${baseUrl}/?room=${room}`);
    this.ws.binaryType = 'arraybuffer';

    this.ws.on('open', () => {
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, WS_MESSAGE_SYNC);
      syncProtocol.writeSyncStep1(encoder, this.doc);
      this.ws.send(encoding.toUint8Array(encoder));
    });

    this.ws.on('message', (data: ArrayBuffer) => {
      const message = new Uint8Array(data);
      const decoder = decoding.createDecoder(message);
      const messageType = decoding.readVarUint(decoder);
      if (messageType !== WS_MESSAGE_SYNC) return;

      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, WS_MESSAGE_SYNC);
      const syncMessageType = syncProtocol.readSyncMessage(decoder, encoder, this.doc, this);
      if (encoding.length(encoder) > 1) {
        this.ws.send(encoding.toUint8Array(encoder));
      }
      if (syncMessageType === syncProtocol.messageYjsSyncStep2) {
        this.resolveSynced();
      }
    });

    this.doc.on('update', (update: Uint8Array, origin: unknown) => {
      if (origin === this) return;
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, WS_MESSAGE_SYNC);
      syncProtocol.writeUpdate(encoder, update);
      if (this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(encoding.toUint8Array(encoder));
      }
    });
  }

  close(): Promise<void> {
    return new Promise((resolve) => {
      if (this.ws.readyState === WebSocket.CLOSED) {
        resolve();
        return;
      }
      this.ws.once('close', () => resolve());
      this.ws.close();
    });
  }
}

async function waitFor(predicate: () => boolean, timeoutMs = 2000): Promise<void> {
  const start = Date.now();
  while (!predicate()) {
    if (Date.now() - start > timeoutMs) throw new Error('waitFor timed out');
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

describe('ws-server Yjs relay', () => {
  let httpServer: HttpServer;
  let baseUrl: string;
  const clients: TestClient[] = [];

  beforeEach(async () => {
    httpServer = createServer();
    attachWebSocketServer(httpServer);
    await new Promise<void>((resolve) => httpServer.listen(0, resolve));
    const { port } = httpServer.address() as AddressInfo;
    baseUrl = `ws://127.0.0.1:${port}`;
  });

  afterEach(async () => {
    await Promise.all(clients.splice(0).map((c) => c.close()));
    await new Promise<void>((resolve) => httpServer.close(() => resolve()));
  });

  function connect(room: string): TestClient {
    const client = new TestClient(baseUrl, room);
    clients.push(client);
    return client;
  }

  it('completes the SyncStep1/2 handshake for two clients in a room', async () => {
    const a = connect('room-1');
    const b = connect('room-1');
    await Promise.all([a.synced, b.synced]);
    expect(true).toBe(true);
  });

  it('rejects connections without a room query param', async () => {
    const ws = new WebSocket(`${baseUrl}/`);
    const closeInfo = await new Promise<{ code: number; reason: string }>((resolve) => {
      ws.on('close', (code, reason) => resolve({ code, reason: reason.toString() }));
    });
    expect(closeInfo.code).toBe(4400);
    expect(closeInfo.reason).toBe('room query param is required');
  });

  it('relays one client update to the other client', async () => {
    const a = connect('room-2');
    const b = connect('room-2');
    await Promise.all([a.synced, b.synced]);

    a.doc.getMap('nodes').set('n1', 'text-prompt');

    await waitFor(() => b.doc.getMap('nodes').get('n1') === 'text-prompt');
    expect(b.doc.getMap('nodes').get('n1')).toBe('text-prompt');
  });

  it('restores full state to a reconnecting client while another remains (section 5)', async () => {
    const a = connect('room-3');
    const b = connect('room-3');
    await Promise.all([a.synced, b.synced]);

    a.doc.getMap('nodes').set('n1', 'text-prompt');
    b.doc.getMap('edges').set('e1', 'n1->n2');
    await waitFor(() => b.doc.getMap('nodes').get('n1') === 'text-prompt');
    await waitFor(() => a.doc.getMap('edges').get('e1') === 'n1->n2');

    await a.close();

    const aReconnected = connect('room-3');
    await aReconnected.synced;

    await waitFor(() => aReconnected.doc.getMap('nodes').get('n1') === 'text-prompt');
    await waitFor(() => aReconnected.doc.getMap('edges').get('e1') === 'n1->n2');
    expect(aReconnected.doc.getMap('nodes').get('n1')).toBe('text-prompt');
    expect(aReconnected.doc.getMap('edges').get('e1')).toBe('n1->n2');
  });

  it('drops the room state once the last client leaves', async () => {
    const a = connect('room-4');
    await a.synced;
    a.doc.getMap('nodes').set('n1', 'text-prompt');
    await waitFor(() => a.doc.getMap('nodes').get('n1') === 'text-prompt');
    await a.close();

    const aFresh = connect('room-4');
    await aFresh.synced;
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(aFresh.doc.getMap('nodes').get('n1')).toBeUndefined();
  });
});
