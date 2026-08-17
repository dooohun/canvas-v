import * as Y from 'yjs';
import type { NodeStatus, NodeType, PipelineEdge, PipelineNode } from '@repo/shared-types';
import { canConnect } from '@repo/shared-types';

export type YNode = Y.Map<unknown>;
export type YEdge = Y.Map<unknown>;

export interface Position {
  x: number;
  y: number;
}

/** Read-only projection of the Y.Doc for rendering. The Y.Doc stays the only writable source. */
export interface PipelineSnapshot {
  nodes: PipelineNode[];
  edges: PipelineEdge[];
}

const NODE_STATUSES: NodeStatus[] = ['idle', 'pending', 'ready', 'error'];

export function getNodesMap(doc: Y.Doc): Y.Map<YNode> {
  return doc.getMap<YNode>('nodes');
}

export function getEdgesMap(doc: Y.Doc): Y.Map<YEdge> {
  return doc.getMap<YEdge>('edges');
}

function readPosition(value: unknown): Position | null {
  if (typeof value !== 'object' || value === null) return null;
  const { x, y } = value as Partial<Position>;
  if (typeof x !== 'number' || typeof y !== 'number') return null;
  return { x, y };
}

function readString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function readNullableString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function readStatus(value: unknown): NodeStatus {
  return NODE_STATUSES.includes(value as NodeStatus) ? (value as NodeStatus) : 'idle';
}

/**
 * Remote peers may run an older/newer build, so a Y.Map that does not match the
 * current schema is skipped instead of crashing the whole canvas render.
 */
export function readNode(yNode: YNode): PipelineNode | null {
  const id = yNode.get('id');
  const type = yNode.get('type');
  const position = readPosition(yNode.get('position'));
  if (typeof id !== 'string' || position === null) return null;

  switch (type as NodeType) {
    case 'textPrompt':
      return { id, type: 'textPrompt', position, prompt: readString(yNode.get('prompt')) };
    case 'generateImage':
      return {
        id,
        type: 'generateImage',
        position,
        status: readStatus(yNode.get('status')),
        imageUrl: readNullableString(yNode.get('imageUrl')),
        errorMessage: readNullableString(yNode.get('errorMessage')),
      };
    case 'generate3d':
      return {
        id,
        type: 'generate3d',
        position,
        status: readStatus(yNode.get('status')),
        modelUrl: readNullableString(yNode.get('modelUrl')),
        errorMessage: readNullableString(yNode.get('errorMessage')),
      };
    default:
      return null;
  }
}

export function readEdge(yEdge: YEdge): PipelineEdge | null {
  const id = yEdge.get('id');
  const sourceNodeId = yEdge.get('sourceNodeId');
  const targetNodeId = yEdge.get('targetNodeId');
  if (
    typeof id !== 'string' ||
    typeof sourceNodeId !== 'string' ||
    typeof targetNodeId !== 'string'
  ) {
    return null;
  }
  return { id, sourceNodeId, targetNodeId };
}

export function readPipelineSnapshot(doc: Y.Doc): PipelineSnapshot {
  const nodes: PipelineNode[] = [];
  getNodesMap(doc).forEach((yNode) => {
    const node = readNode(yNode);
    if (node) nodes.push(node);
  });

  const edges: PipelineEdge[] = [];
  getEdgesMap(doc).forEach((yEdge) => {
    const edge = readEdge(yEdge);
    if (edge) edges.push(edge);
  });

  return { nodes, edges };
}

function createYNode(type: NodeType, position: Position): { id: string; yNode: YNode } {
  const id = crypto.randomUUID();
  const yNode: YNode = new Y.Map<unknown>();
  yNode.set('id', id);
  yNode.set('type', type);
  yNode.set('position', { ...position });
  switch (type) {
    case 'textPrompt':
      yNode.set('prompt', '');
      break;
    case 'generateImage':
      yNode.set('status', 'idle');
      yNode.set('imageUrl', null);
      yNode.set('errorMessage', null);
      break;
    case 'generate3d':
      yNode.set('status', 'idle');
      yNode.set('modelUrl', null);
      yNode.set('errorMessage', null);
      break;
  }
  return { id, yNode };
}

export function nextSpawnPosition(doc: Y.Doc): Position {
  const offset = getNodesMap(doc).size;
  const column = offset % 3;
  const row = Math.floor(offset / 3);
  return { x: 120 + column * 360, y: 100 + row * 340 };
}

export function addNode(doc: Y.Doc, type: NodeType, position: Position): string {
  const { id, yNode } = createYNode(type, position);
  getNodesMap(doc).set(id, yNode);
  return id;
}

export function updateNodePosition(doc: Y.Doc, id: string, position: Position): void {
  const yNode = getNodesMap(doc).get(id);
  if (!yNode) return;
  yNode.set('position', { ...position });
}

export function updateTextPromptValue(doc: Y.Doc, id: string, prompt: string): void {
  const yNode = getNodesMap(doc).get(id);
  if (!yNode || yNode.get('type') !== 'textPrompt') return;
  yNode.set('prompt', prompt);
}

/** Node removal and its dangling-edge cleanup share one transaction so peers never see orphans. */
export function deleteNode(doc: Y.Doc, id: string): void {
  doc.transact(() => {
    const edges = getEdgesMap(doc);
    const orphanEdgeIds: string[] = [];
    edges.forEach((yEdge, edgeId) => {
      if (yEdge.get('sourceNodeId') === id || yEdge.get('targetNodeId') === id) {
        orphanEdgeIds.push(edgeId);
      }
    });
    for (const edgeId of orphanEdgeIds) edges.delete(edgeId);
    getNodesMap(doc).delete(id);
  });
}

export function addEdge(doc: Y.Doc, sourceNodeId: string, targetNodeId: string): string | null {
  const nodes = getNodesMap(doc);
  const sourceType = nodes.get(sourceNodeId)?.get('type') as NodeType | undefined;
  const targetType = nodes.get(targetNodeId)?.get('type') as NodeType | undefined;
  if (!sourceType || !targetType || !canConnect(sourceType, targetType)) return null;

  const edges = getEdgesMap(doc);
  let duplicate = false;
  edges.forEach((yEdge) => {
    if (yEdge.get('sourceNodeId') === sourceNodeId && yEdge.get('targetNodeId') === targetNodeId) {
      duplicate = true;
    }
  });
  if (duplicate) return null;

  const id = crypto.randomUUID();
  const yEdge: YEdge = new Y.Map<unknown>();
  yEdge.set('id', id);
  yEdge.set('sourceNodeId', sourceNodeId);
  yEdge.set('targetNodeId', targetNodeId);
  edges.set(id, yEdge);
  return id;
}

export function deleteEdge(doc: Y.Doc, id: string): void {
  getEdgesMap(doc).delete(id);
}

export function observePipelineDoc(doc: Y.Doc, listener: () => void): () => void {
  const nodes = getNodesMap(doc);
  const edges = getEdgesMap(doc);
  nodes.observeDeep(listener);
  edges.observeDeep(listener);
  return () => {
    nodes.unobserveDeep(listener);
    edges.unobserveDeep(listener);
  };
}
