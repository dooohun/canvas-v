import * as decoding from 'lib0/decoding';
import * as encoding from 'lib0/encoding';
import * as awarenessProtocol from 'y-protocols/awareness';
import * as syncProtocol from 'y-protocols/sync';
import * as Y from 'yjs';
import { WS_MESSAGE_TYPE } from '@repo/shared-types';

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected';

/**
 * Minimal structural type of the browser WebSocket that this provider needs, so
 * tests can drive the protocol through an in-memory double.
 */
export interface WebSocketLike {
  binaryType: string;
  readyState: number;
  send(data: Uint8Array): void;
  close(): void;
  onopen: (() => void) | null;
  onmessage: ((event: { data: unknown }) => void) | null;
  onclose: (() => void) | null;
  onerror: (() => void) | null;
}

export interface YjsWebSocketProviderOptions {
  url: string;
  doc: Y.Doc;
  awareness: awarenessProtocol.Awareness;
  createSocket?: (url: string) => WebSocketLike;
  onStatusChange?: (status: ConnectionStatus) => void;
  reconnectDelayMs?: number;
}

const SOCKET_OPEN = 1;

function defaultCreateSocket(url: string): WebSocketLike {
  return new WebSocket(url) as unknown as WebSocketLike;
}

function toUint8Array(data: unknown): Uint8Array | null {
  if (data instanceof ArrayBuffer) return new Uint8Array(data);
  if (ArrayBuffer.isView(data)) {
    return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  }
  return null;
}

/**
 * Client half of docs/ws-protocol.md. y-websocket is deliberately not used: the
 * server speaks a custom envelope (messageType + y-protocols payload), but every
 * byte inside that envelope is still produced by y-protocols/lib0.
 */
export class YjsWebSocketProvider {
  private readonly options: YjsWebSocketProviderOptions;
  private socket: WebSocketLike | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private destroyed = false;
  private statusValue: ConnectionStatus = 'disconnected';

  constructor(options: YjsWebSocketProviderOptions) {
    this.options = options;
    this.options.doc.on('update', this.handleDocUpdate);
    this.options.awareness.on('update', this.handleAwarenessUpdate);
  }

  get status(): ConnectionStatus {
    return this.statusValue;
  }

  connect(): void {
    if (this.destroyed || this.socket) return;
    this.setStatus('connecting');
    const createSocket = this.options.createSocket ?? defaultCreateSocket;
    const socket = createSocket(this.options.url);
    socket.binaryType = 'arraybuffer';
    this.socket = socket;

    socket.onopen = () => {
      if (this.socket !== socket) return;
      this.setStatus('connected');
      this.sendSyncStep1();
      this.sendLocalAwareness();
    };
    socket.onmessage = (event) => {
      if (this.socket !== socket) return;
      const message = toUint8Array(event.data);
      if (message) this.handleMessage(message);
    };
    socket.onclose = () => {
      if (this.socket !== socket) return;
      this.handleDisconnect();
    };
    socket.onerror = () => {
      if (this.socket !== socket) return;
      this.handleDisconnect();
    };
  }

  destroy(): void {
    this.destroyed = true;
    this.options.doc.off('update', this.handleDocUpdate);
    this.options.awareness.off('update', this.handleAwarenessUpdate);
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    const socket = this.socket;
    this.socket = null;
    socket?.close();
    this.setStatus('disconnected');
  }

  private setStatus(status: ConnectionStatus): void {
    if (this.statusValue === status) return;
    this.statusValue = status;
    this.options.onStatusChange?.(status);
  }

  private send(payload: Uint8Array): void {
    const socket = this.socket;
    if (!socket || socket.readyState !== SOCKET_OPEN) return;
    socket.send(payload);
  }

  private sendSyncStep1(): void {
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, WS_MESSAGE_TYPE.SYNC);
    syncProtocol.writeSyncStep1(encoder, this.options.doc);
    this.send(encoding.toUint8Array(encoder));
  }

  private sendLocalAwareness(): void {
    const { awareness } = this.options;
    if (awareness.getLocalState() === null) return;
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, WS_MESSAGE_TYPE.AWARENESS);
    encoding.writeVarUint8Array(
      encoder,
      awarenessProtocol.encodeAwarenessUpdate(awareness, [awareness.clientID]),
    );
    this.send(encoding.toUint8Array(encoder));
  }

  private handleMessage(message: Uint8Array): void {
    const decoder = decoding.createDecoder(message);
    const messageType = decoding.readVarUint(decoder);

    if (messageType === WS_MESSAGE_TYPE.SYNC) {
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, WS_MESSAGE_TYPE.SYNC);
      syncProtocol.readSyncMessage(decoder, encoder, this.options.doc, this);
      if (encoding.length(encoder) > 1) {
        this.send(encoding.toUint8Array(encoder));
      }
      return;
    }

    if (messageType === WS_MESSAGE_TYPE.AWARENESS) {
      awarenessProtocol.applyAwarenessUpdate(
        this.options.awareness,
        decoding.readVarUint8Array(decoder),
        this,
      );
    }
  }

  private handleDisconnect(): void {
    this.socket = null;
    const { awareness } = this.options;
    const staleClients = Array.from(awareness.getStates().keys()).filter(
      (clientId) => clientId !== awareness.clientID,
    );
    if (staleClients.length > 0) {
      awarenessProtocol.removeAwarenessStates(awareness, staleClients, this);
    }
    this.setStatus('disconnected');
    if (this.destroyed) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, this.options.reconnectDelayMs ?? 1000);
  }

  private readonly handleDocUpdate = (update: Uint8Array, origin: unknown): void => {
    if (origin === this) return;
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, WS_MESSAGE_TYPE.SYNC);
    syncProtocol.writeUpdate(encoder, update);
    this.send(encoding.toUint8Array(encoder));
  };

  private readonly handleAwarenessUpdate = (
    changes: { added: number[]; updated: number[]; removed: number[] },
    origin: unknown,
  ): void => {
    if (origin === this) return;
    const changedClients = [...changes.added, ...changes.updated, ...changes.removed];
    if (changedClients.length === 0) return;
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, WS_MESSAGE_TYPE.AWARENESS);
    encoding.writeVarUint8Array(
      encoder,
      awarenessProtocol.encodeAwarenessUpdate(this.options.awareness, changedClients),
    );
    this.send(encoding.toUint8Array(encoder));
  };
}
