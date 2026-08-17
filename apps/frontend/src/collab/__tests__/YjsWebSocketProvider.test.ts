import { afterEach, describe, expect, it, vi } from 'vitest';
import * as awarenessProtocol from 'y-protocols/awareness';
import * as syncProtocol from 'y-protocols/sync';
import * as Y from 'yjs';
import { WS_MESSAGE_TYPE } from '@repo/shared-types';
import { addNode, getNodesMap, readPipelineSnapshot } from '../pipelineDoc';
import { YjsWebSocketProvider } from '../YjsWebSocketProvider';
import {
  applySyncEnvelope,
  encodeAwarenessEnvelope,
  encodeSyncStep1,
  encodeUpdate,
  envelopeType,
  FakeWebSocket,
  readAwarenessPayload,
} from './fakeWebSocket';

interface Harness {
  doc: Y.Doc;
  awareness: awarenessProtocol.Awareness;
  provider: YjsWebSocketProvider;
  sockets: FakeWebSocket[];
  socket: () => FakeWebSocket;
}

const harnesses: Harness[] = [];

function createHarness(): Harness {
  const doc = new Y.Doc();
  const awareness = new awarenessProtocol.Awareness(doc);
  const sockets: FakeWebSocket[] = [];
  const provider = new YjsWebSocketProvider({
    url: 'ws://test/?room=r1',
    doc,
    awareness,
    createSocket: (url) => {
      const socket = new FakeWebSocket(url);
      sockets.push(socket);
      return socket;
    },
  });
  const harness: Harness = {
    doc,
    awareness,
    provider,
    sockets,
    socket: () => sockets[sockets.length - 1]!,
  };
  harnesses.push(harness);
  return harness;
}

afterEach(() => {
  while (harnesses.length > 0) harnesses.pop()!.provider.destroy();
  vi.useRealTimers();
});

describe('YjsWebSocketProvider', () => {
  it('sends a SyncStep1 envelope once the socket opens', () => {
    const { provider, socket } = createHarness();
    provider.connect();
    socket().open();

    const [first] = socket().sent;
    expect(first).toBeDefined();
    expect(envelopeType(first!)).toBe(WS_MESSAGE_TYPE.SYNC);

    const serverDoc = new Y.Doc();
    expect(applySyncEnvelope(first!, serverDoc, 'server')).toBe(syncProtocol.messageYjsSyncStep1);
  });

  it('answers the server SyncStep1 with a SyncStep2 that carries the local document', () => {
    const { doc, provider, socket } = createHarness();
    addNode(doc, 'textPrompt', { x: 10, y: 20 });
    provider.connect();
    socket().open();

    const serverDoc = new Y.Doc();
    socket().receive(encodeSyncStep1(serverDoc));

    const reply = socket().sent.at(-1)!;
    expect(applySyncEnvelope(reply, serverDoc, 'server')).toBe(syncProtocol.messageYjsSyncStep2);
    expect(readPipelineSnapshot(serverDoc).nodes).toHaveLength(1);
  });

  it('relays local document changes as SYNC update envelopes', () => {
    const { doc, provider, socket } = createHarness();
    provider.connect();
    socket().open();
    const sentBefore = socket().sent.length;

    addNode(doc, 'generateImage', { x: 0, y: 0 });

    const update = socket().sent.at(-1)!;
    expect(socket().sent.length).toBe(sentBefore + 1);
    const serverDoc = new Y.Doc();
    expect(applySyncEnvelope(update, serverDoc, 'server')).toBe(syncProtocol.messageYjsUpdate);
    expect(readPipelineSnapshot(serverDoc).nodes[0]?.type).toBe('generateImage');
  });

  it('applies remote updates to the local document without echoing them back', () => {
    const { doc, provider, socket } = createHarness();
    provider.connect();
    socket().open();

    const remoteDoc = new Y.Doc();
    addNode(remoteDoc, 'generate3d', { x: 5, y: 6 });
    const sentBefore = socket().sent.length;
    socket().receive(encodeUpdate(Y.encodeStateAsUpdate(remoteDoc)));

    expect(readPipelineSnapshot(doc).nodes[0]?.type).toBe('generate3d');
    expect(socket().sent.length).toBe(sentBefore);
  });

  it('sends and receives awareness envelopes', () => {
    const { awareness, provider, socket } = createHarness();
    provider.connect();
    socket().open();

    awareness.setLocalState({
      clientId: awareness.clientID,
      name: 'Otter-001',
      color: '#ef4444',
      cursor: null,
      selectedNodeId: 'node-1',
    });

    const message = socket().sent.at(-1)!;
    expect(envelopeType(message)).toBe(WS_MESSAGE_TYPE.AWARENESS);

    const peerDoc = new Y.Doc();
    const peerAwareness = new awarenessProtocol.Awareness(peerDoc);
    awarenessProtocol.applyAwarenessUpdate(peerAwareness, readAwarenessPayload(message), 'server');
    expect(peerAwareness.getStates().get(awareness.clientID)).toMatchObject({
      name: 'Otter-001',
      selectedNodeId: 'node-1',
    });
  });

  it('drops remote awareness states and reconnects after the socket closes', () => {
    vi.useFakeTimers();
    const { awareness, provider, sockets, socket } = createHarness();
    provider.connect();
    socket().open();

    const peerDoc = new Y.Doc();
    const peerAwareness = new awarenessProtocol.Awareness(peerDoc);
    peerAwareness.setLocalState({
      clientId: peerAwareness.clientID,
      name: 'Falcon-002',
      color: '#3b82f6',
      cursor: null,
      selectedNodeId: null,
    });
    socket().receive(
      encodeAwarenessEnvelope(
        awarenessProtocol.encodeAwarenessUpdate(peerAwareness, [peerAwareness.clientID]),
      ),
    );
    expect(awareness.getStates().has(peerAwareness.clientID)).toBe(true);

    socket().close();
    expect(provider.status).toBe('disconnected');
    expect(awareness.getStates().has(peerAwareness.clientID)).toBe(false);

    vi.advanceTimersByTime(1000);
    expect(sockets).toHaveLength(2);
    socket().open();
    expect(provider.status).toBe('connected');
  });

  it('schedules exactly one reconnect when the connection fails before opening', () => {
    vi.useFakeTimers();
    const { provider, sockets, socket } = createHarness();
    provider.connect();

    expect(() => socket().failHandshake()).not.toThrow();
    expect(provider.status).toBe('disconnected');
    expect(sockets).toHaveLength(1);

    vi.advanceTimersByTime(1000);
    expect(sockets).toHaveLength(2);

    vi.advanceTimersByTime(5000);
    expect(sockets).toHaveLength(2);

    sockets[1]!.open();
    expect(provider.status).toBe('connected');
  });

  it('converges two providers connected through a relay that mimics the server', () => {
    const a = createHarness();
    const b = createHarness();
    a.provider.connect();
    b.provider.connect();
    a.socket().open();
    b.socket().open();

    const serverDoc = new Y.Doc();
    const pump = (from: Harness, to: Harness) => {
      let message = from.socket().sent.shift();
      while (message) {
        if (envelopeType(message) === WS_MESSAGE_TYPE.SYNC) {
          const type = applySyncEnvelope(message, serverDoc, 'server');
          if (type === syncProtocol.messageYjsUpdate) to.socket().receive(message);
        }
        message = from.socket().sent.shift();
      }
    };

    addNode(a.doc, 'textPrompt', { x: 1, y: 1 });
    pump(a, b);
    b.socket().receive(encodeUpdate(Y.encodeStateAsUpdate(serverDoc)));

    expect(readPipelineSnapshot(b.doc).nodes).toHaveLength(1);

    getNodesMap(b.doc).forEach((node) => node.set('prompt', 'hello from B'));
    pump(b, a);
    a.socket().receive(encodeUpdate(Y.encodeStateAsUpdate(serverDoc)));

    const [nodeOnA] = readPipelineSnapshot(a.doc).nodes;
    expect(nodeOnA).toMatchObject({ type: 'textPrompt', prompt: 'hello from B' });
  });
});
