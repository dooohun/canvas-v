import { useCallback, useRef, useSyncExternalStore } from 'react';
import type * as Y from 'yjs';
import type { NodeType, PipelineEdge, PipelineNode } from '@repo/shared-types';
import { useCollab } from '@/collab/CollabContext';
import * as pipelineDoc from '@/collab/pipelineDoc';
import type { PipelineSnapshot } from '@/collab/pipelineDoc';

export interface UsePipelineStateResult {
  nodes: PipelineNode[];
  edges: PipelineEdge[];
  addNode: (type: NodeType) => void;
  updateNodePosition: (id: string, position: { x: number; y: number }) => void;
  updateTextPromptValue: (id: string, prompt: string) => void;
  deleteNode: (id: string) => void;
  addEdge: (sourceNodeId: string, targetNodeId: string) => void;
  deleteEdge: (id: string) => void;
}

/**
 * The Y.Doc is the only source of truth: every mutation writes to it and the
 * React tree renders a cached read-only projection that is invalidated whenever
 * Yjs reports a change (local or remote).
 */
export function usePipelineState(): UsePipelineStateResult {
  const { doc } = useCollab();
  const cacheRef = useRef<{ doc: Y.Doc; snapshot: PipelineSnapshot } | null>(null);

  const subscribe = useCallback(
    (onChange: () => void) =>
      pipelineDoc.observePipelineDoc(doc, () => {
        cacheRef.current = null;
        onChange();
      }),
    [doc],
  );

  const getSnapshot = useCallback(() => {
    if (cacheRef.current === null || cacheRef.current.doc !== doc) {
      cacheRef.current = { doc, snapshot: pipelineDoc.readPipelineSnapshot(doc) };
    }
    return cacheRef.current.snapshot;
  }, [doc]);

  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const addNode = useCallback(
    (type: NodeType) => {
      pipelineDoc.addNode(doc, type, pipelineDoc.nextSpawnPosition(doc));
    },
    [doc],
  );

  const updateNodePosition = useCallback(
    (id: string, position: { x: number; y: number }) => {
      pipelineDoc.updateNodePosition(doc, id, position);
    },
    [doc],
  );

  const updateTextPromptValue = useCallback(
    (id: string, prompt: string) => {
      pipelineDoc.updateTextPromptValue(doc, id, prompt);
    },
    [doc],
  );

  const deleteNode = useCallback(
    (id: string) => {
      pipelineDoc.deleteNode(doc, id);
    },
    [doc],
  );

  const addEdge = useCallback(
    (sourceNodeId: string, targetNodeId: string) => {
      pipelineDoc.addEdge(doc, sourceNodeId, targetNodeId);
    },
    [doc],
  );

  const deleteEdge = useCallback(
    (id: string) => {
      pipelineDoc.deleteEdge(doc, id);
    },
    [doc],
  );

  return {
    nodes: snapshot.nodes,
    edges: snapshot.edges,
    addNode,
    updateNodePosition,
    updateTextPromptValue,
    deleteNode,
    addEdge,
    deleteEdge,
  };
}
