import { useCallback, useRef, useState } from 'react';
import type { NodeType, PipelineEdge, PipelineNode } from '@repo/shared-types';
import { canConnect } from '@repo/shared-types';

function createNode(type: NodeType, position: { x: number; y: number }): PipelineNode {
  const id = crypto.randomUUID();
  switch (type) {
    case 'textPrompt':
      return { id, type, position, prompt: '' };
    case 'generateImage':
      return { id, type, position, status: 'idle', imageUrl: null, errorMessage: null };
    case 'generate3d':
      return { id, type, position, status: 'idle', resultUrl: null, errorMessage: null };
  }
}

interface PipelineState {
  nodes: PipelineNode[];
  edges: PipelineEdge[];
}

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

export function usePipelineState(): UsePipelineStateResult {
  const [state, setState] = useState<PipelineState>({ nodes: [], edges: [] });
  const spawnCountRef = useRef(0);

  const addNode = useCallback((type: NodeType) => {
    const offset = spawnCountRef.current;
    spawnCountRef.current += 1;
    const column = offset % 3;
    const row = Math.floor(offset / 3);
    const position = { x: 120 + column * 360, y: 100 + row * 340 };
    setState((prev) => ({
      ...prev,
      nodes: [...prev.nodes, createNode(type, position)],
    }));
  }, []);

  const updateNodePosition = useCallback((id: string, position: { x: number; y: number }) => {
    setState((prev) => ({
      ...prev,
      nodes: prev.nodes.map((node) => (node.id === id ? { ...node, position } : node)),
    }));
  }, []);

  const updateTextPromptValue = useCallback((id: string, prompt: string) => {
    setState((prev) => ({
      ...prev,
      nodes: prev.nodes.map((node) =>
        node.id === id && node.type === 'textPrompt' ? { ...node, prompt } : node,
      ),
    }));
  }, []);

  const deleteNode = useCallback((id: string) => {
    setState((prev) => ({
      nodes: prev.nodes.filter((node) => node.id !== id),
      edges: prev.edges.filter((edge) => edge.sourceNodeId !== id && edge.targetNodeId !== id),
    }));
  }, []);

  const addEdge = useCallback((sourceNodeId: string, targetNodeId: string) => {
    setState((prev) => {
      const sourceNode = prev.nodes.find((node) => node.id === sourceNodeId);
      const targetNode = prev.nodes.find((node) => node.id === targetNodeId);
      if (!sourceNode || !targetNode || !canConnect(sourceNode.type, targetNode.type)) {
        return prev;
      }
      const alreadyConnected = prev.edges.some(
        (edge) => edge.sourceNodeId === sourceNodeId && edge.targetNodeId === targetNodeId,
      );
      if (alreadyConnected) {
        return prev;
      }
      return {
        ...prev,
        edges: [...prev.edges, { id: crypto.randomUUID(), sourceNodeId, targetNodeId }],
      };
    });
  }, []);

  const deleteEdge = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      edges: prev.edges.filter((edge) => edge.id !== id),
    }));
  }, []);

  return {
    nodes: state.nodes,
    edges: state.edges,
    addNode,
    updateNodePosition,
    updateTextPromptValue,
    deleteNode,
    addEdge,
    deleteEdge,
  };
}
