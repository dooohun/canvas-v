import { describe, expect, it } from 'vitest';
import * as Y from 'yjs';
import {
  addEdge,
  addNode,
  deleteEdge,
  deleteNode,
  getNodesMap,
  readPipelineSnapshot,
  updateNodePosition,
  updateTextPromptValue,
} from '../pipelineDoc';

function sync(from: Y.Doc, to: Y.Doc): void {
  Y.applyUpdate(to, Y.encodeStateAsUpdate(from, Y.encodeStateVector(to)));
}

describe('pipelineDoc', () => {
  it('stores nodes and edges as Y.Map entries', () => {
    const doc = new Y.Doc();
    const textId = addNode(doc, 'textPrompt', { x: 0, y: 0 });
    const imageId = addNode(doc, 'generateImage', { x: 100, y: 0 });
    addEdge(doc, textId, imageId);

    expect(doc.getMap('nodes').size).toBe(2);
    expect(doc.getMap('edges').size).toBe(1);
    expect(readPipelineSnapshot(doc).nodes.map((node) => node.type)).toEqual([
      'textPrompt',
      'generateImage',
    ]);
  });

  it('rejects edges that violate port type rules and duplicates', () => {
    const doc = new Y.Doc();
    const textId = addNode(doc, 'textPrompt', { x: 0, y: 0 });
    const meshId = addNode(doc, 'generate3d', { x: 100, y: 0 });
    const imageId = addNode(doc, 'generateImage', { x: 50, y: 0 });

    expect(addEdge(doc, textId, meshId)).toBeNull();
    expect(addEdge(doc, textId, imageId)).not.toBeNull();
    expect(addEdge(doc, textId, imageId)).toBeNull();
    expect(readPipelineSnapshot(doc).edges).toHaveLength(1);
  });

  it('deletes a node and its edges in one transaction', () => {
    const doc = new Y.Doc();
    const textId = addNode(doc, 'textPrompt', { x: 0, y: 0 });
    const imageId = addNode(doc, 'generateImage', { x: 100, y: 0 });
    const edgeId = addEdge(doc, textId, imageId)!;

    let transactions = 0;
    doc.on('afterTransaction', () => {
      transactions += 1;
    });
    deleteNode(doc, textId);

    expect(transactions).toBe(1);
    expect(readPipelineSnapshot(doc).nodes).toHaveLength(1);
    expect(readPipelineSnapshot(doc).edges).toHaveLength(0);
    expect(doc.getMap('edges').has(edgeId)).toBe(false);
  });

  it('deletes edges independently', () => {
    const doc = new Y.Doc();
    const textId = addNode(doc, 'textPrompt', { x: 0, y: 0 });
    const imageId = addNode(doc, 'generateImage', { x: 100, y: 0 });
    const edgeId = addEdge(doc, textId, imageId)!;

    deleteEdge(doc, edgeId);

    expect(readPipelineSnapshot(doc).edges).toHaveLength(0);
    expect(readPipelineSnapshot(doc).nodes).toHaveLength(2);
  });

  it('skips Y.Maps that do not match the node schema instead of throwing', () => {
    const doc = new Y.Doc();
    const bogus = new Y.Map<unknown>();
    bogus.set('id', 'x');
    bogus.set('type', 'unknownType');
    getNodesMap(doc).set('x', bogus);

    expect(readPipelineSnapshot(doc).nodes).toHaveLength(0);
  });

  it('merges concurrent edits from two documents (CRDT convergence)', () => {
    const docA = new Y.Doc();
    const docB = new Y.Doc();

    const sharedId = addNode(docA, 'textPrompt', { x: 0, y: 0 });
    sync(docA, docB);
    expect(readPipelineSnapshot(docB).nodes).toHaveLength(1);

    // Concurrent, non-conflicting edits: A adds a node, B edits the shared node.
    addNode(docA, 'generateImage', { x: 400, y: 0 });
    updateTextPromptValue(docB, sharedId, 'a cat riding a bike');
    sync(docA, docB);
    sync(docB, docA);

    const snapshotA = readPipelineSnapshot(docA);
    const snapshotB = readPipelineSnapshot(docB);
    expect(snapshotA.nodes).toHaveLength(2);
    expect(snapshotB.nodes).toHaveLength(2);
    expect(snapshotA.nodes.find((node) => node.id === sharedId)).toMatchObject({
      prompt: 'a cat riding a bike',
    });
  });

  it('resolves a conflicting move of the same node deterministically on both peers', () => {
    const docA = new Y.Doc();
    const docB = new Y.Doc();
    const nodeId = addNode(docA, 'textPrompt', { x: 0, y: 0 });
    sync(docA, docB);

    updateNodePosition(docA, nodeId, { x: 100, y: 100 });
    updateNodePosition(docB, nodeId, { x: 900, y: 900 });
    sync(docA, docB);
    sync(docB, docA);

    const positionA = readPipelineSnapshot(docA).nodes[0]!.position;
    const positionB = readPipelineSnapshot(docB).nodes[0]!.position;
    expect(positionA).toEqual(positionB);
    expect([100, 900]).toContain(positionA.x);
  });

  it('keeps a node deleted on one peer while the other edited it', () => {
    const docA = new Y.Doc();
    const docB = new Y.Doc();
    const textId = addNode(docA, 'textPrompt', { x: 0, y: 0 });
    const imageId = addNode(docA, 'generateImage', { x: 300, y: 0 });
    addEdge(docA, textId, imageId);
    sync(docA, docB);

    deleteNode(docA, textId);
    updateTextPromptValue(docB, textId, 'edited while being deleted');
    sync(docA, docB);
    sync(docB, docA);

    expect(readPipelineSnapshot(docA).nodes.map((node) => node.id)).toEqual([imageId]);
    expect(readPipelineSnapshot(docB).nodes.map((node) => node.id)).toEqual([imageId]);
    expect(readPipelineSnapshot(docA).edges).toHaveLength(0);
    expect(readPipelineSnapshot(docB).edges).toHaveLength(0);
  });
});
