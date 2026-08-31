import * as decoding from 'lib0/decoding';
import * as encoding from 'lib0/encoding';
import * as syncProtocol from 'y-protocols/sync';
import * as Y from 'yjs';
import { WS_MESSAGE_TYPE } from '@repo/shared-types';
import type { WebSocketLike } from '../YjsWebSocketProvider';

export class FakeWebSocket implements WebSocketLike {
  binaryType = 'blob';
  readyState = 0;
  readonly sent: Uint8Array[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: unknown }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;

  private handshakeFailed = false;

  constructor(readonly url: string) {}

  send(data: Uint8Array): void {
    this.sent.push(new Uint8Array(data));
  }

  close(): void {
    if (this.readyState === 3) return;
    if (this.handshakeFailed) this.onerror?.();
    this.readyState = 3;
    this.onclose?.();
  }

  /**
   * Mimics a WebSocket whose handshake never succeeded: the browser fires `error`,
   * and any `close()` on such a socket fires `error` again before `close`. A handler
   * that answers `error` by calling `close()` therefore recurses until the stack
   * overflows.
   */
  failHandshake(): void {
    this.handshakeFailed = true;
    this.onerror?.();
    this.close();
  }

  open(): void {
    this.readyState = 1;
    this.onopen?.();
  }

  receive(message: Uint8Array): void {
    const copy = new Uint8Array(message);
    this.onmessage?.({ data: copy.buffer });
  }
}

export function envelopeType(message: Uint8Array): number {
  return decoding.readVarUint(decoding.createDecoder(message));
}

export function encodeSyncStep1(doc: Y.Doc): Uint8Array {
  const encoder = encoding.createEncoder();
  encoding.writeVarUint(encoder, WS_MESSAGE_TYPE.SYNC);
  syncProtocol.writeSyncStep1(encoder, doc);
  return encoding.toUint8Array(encoder);
}

export function encodeUpdate(update: Uint8Array): Uint8Array {
  const encoder = encoding.createEncoder();
  encoding.writeVarUint(encoder, WS_MESSAGE_TYPE.SYNC);
  syncProtocol.writeUpdate(encoder, update);
  return encoding.toUint8Array(encoder);
}

/** Applies a SYNC envelope the client sent to `doc`, exactly like the relay server does. */
export function applySyncEnvelope(message: Uint8Array, doc: Y.Doc, origin: unknown): number {
  const decoder = decoding.createDecoder(message);
  const messageType = decoding.readVarUint(decoder);
  if (messageType !== WS_MESSAGE_TYPE.SYNC) {
    throw new Error(`expected SYNC envelope, got ${messageType}`);
  }
  const encoder = encoding.createEncoder();
  return syncProtocol.readSyncMessage(decoder, encoder, doc, origin);
}

export function encodeAwarenessEnvelope(payload: Uint8Array): Uint8Array {
  const encoder = encoding.createEncoder();
  encoding.writeVarUint(encoder, WS_MESSAGE_TYPE.AWARENESS);
  encoding.writeVarUint8Array(encoder, payload);
  return encoding.toUint8Array(encoder);
}

export function readAwarenessPayload(message: Uint8Array): Uint8Array {
  const decoder = decoding.createDecoder(message);
  const messageType = decoding.readVarUint(decoder);
  if (messageType !== WS_MESSAGE_TYPE.AWARENESS) {
    throw new Error(`expected AWARENESS envelope, got ${messageType}`);
  }
  return decoding.readVarUint8Array(decoder);
}
