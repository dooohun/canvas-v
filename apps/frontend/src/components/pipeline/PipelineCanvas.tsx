import { useCallback, useMemo, useRef, type PointerEvent as ReactPointerEvent } from 'react';
import {
  Background,
  BackgroundVariant,
  Controls,
  ReactFlow,
  ReactFlowProvider,
  useNodesState,
  useReactFlow,
  type Connection,
  type Node,
  type NodeChange,
  type OnSelectionChangeParams,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { AwarenessState } from '@repo/shared-types';
import { useCollab } from '@/collab/CollabContext';
import { groupSelectorsByNodeId, useLocalPresence, useRemotePresence } from '@/collab/usePresence';
import { usePipelineState } from '@/pipeline/usePipelineState';
import { useNodeExecution } from '@/pipeline/useNodeExecution';
import { composeInputPromptsByNodeId } from '@/pipeline/promptComposition';
import { collectAbandonedRunNodeIds } from '@/pipeline/runState';
import {
  reconcileFlowNodes,
  toReactFlowEdges,
  type PipelineNodeData,
} from '@/pipeline/reactFlowAdapter';
import { AddNodeToolbar } from './AddNodeToolbar';
import { PresenceBar } from './PresenceBar';
import { RemoteCursors } from './RemoteCursors';
import { TextPromptNode } from './TextPromptNode';
import { GenerateImageNode } from './GenerateImageNode';
import { Generate3dNode } from './Generate3dNode';

const CURSOR_THROTTLE_MS = 40;

const nodeTypes = {
  textPrompt: TextPromptNode,
  generateImage: GenerateImageNode,
  generate3d: Generate3dNode,
};

export function PipelineCanvas() {
  return (
    <ReactFlowProvider>
      <PipelineCanvasInner />
    </ReactFlowProvider>
  );
}

function PipelineCanvasInner() {
  const { awareness, status, roomId } = useCollab();
  const {
    nodes,
    edges,
    addNode,
    updateNodePosition,
    updateTextPromptValue,
    deleteNode,
    addEdge,
    deleteEdge,
  } = usePipelineState();
  const { runGenerateImage } = useNodeExecution();
  const remotePresence = useRemotePresence();
  const { setSelectedNodeId, setCursor } = useLocalPresence();
  const { screenToFlowPosition } = useReactFlow();

  const localState = awareness.getLocalState() as AwarenessState | null;
  const selectorsByNodeId = useMemo(() => groupSelectorsByNodeId(remotePresence), [remotePresence]);
  const inputPromptByNodeId = useMemo(
    () => composeInputPromptsByNodeId(nodes, edges),
    [nodes, edges],
  );
  const abandonedRunNodeIds = useMemo(() => {
    const activeClientIds = new Set([
      awareness.clientID,
      ...remotePresence.map((state) => state.clientId),
    ]);
    return collectAbandonedRunNodeIds(nodes, activeClientIds);
  }, [nodes, remotePresence, awareness]);

  const handleRunNode = useCallback(
    (id: string) => {
      void runGenerateImage(id);
    },
    [runGenerateImage],
  );

  const reconcileContext = useMemo(
    () => ({
      handlers: {
        onChangePrompt: updateTextPromptValue,
        onDeleteNode: deleteNode,
        onRunNode: handleRunNode,
      },
      selectorsByNodeId,
      inputPromptByNodeId,
      abandonedRunNodeIds,
    }),
    [
      updateTextPromptValue,
      deleteNode,
      handleRunNode,
      selectorsByNodeId,
      inputPromptByNodeId,
      abandonedRunNodeIds,
    ],
  );

  // Reconciled during render, not in a useEffect: an Effect would commit the stale list first
  // and only patch it in on a second render pass, causing a visible flicker/lag on every change.
  const [flowNodes, setFlowNodes, onFlowNodesChangeInternal] = useNodesState<
    Node<PipelineNodeData>
  >(reconcileFlowNodes(nodes, [], reconcileContext));
  const prevInputsRef = useRef({ nodes, reconcileContext });
  if (
    prevInputsRef.current.nodes !== nodes ||
    prevInputsRef.current.reconcileContext !== reconcileContext
  ) {
    prevInputsRef.current = { nodes, reconcileContext };
    setFlowNodes((current) => reconcileFlowNodes(nodes, current, reconcileContext));
  }

  const flowEdges = useMemo(() => toReactFlowEdges(edges), [edges]);

  const handleNodesChange = useCallback(
    (changes: NodeChange<Node<PipelineNodeData>>[]) => {
      // Only our own toolbar/delete buttons may remove a node — drop React Flow's own
      // 'remove' changes (e.g. keyboard delete) so the shared state can't desync.
      const applicable = changes.filter((change) => change.type !== 'remove');
      onFlowNodesChangeInternal(applicable);
      for (const change of applicable) {
        if (change.type === 'position' && change.position && change.dragging === false) {
          updateNodePosition(change.id, change.position);
        }
      }
    },
    [onFlowNodesChangeInternal, updateNodePosition],
  );

  const handleConnect = useCallback(
    (connection: Connection) => {
      if (connection.source && connection.target) {
        addEdge(connection.source, connection.target);
      }
    },
    [addEdge],
  );

  const handleEdgesDelete = useCallback(
    (deletedEdges: { id: string }[]) => {
      for (const edge of deletedEdges) {
        deleteEdge(edge.id);
      }
    },
    [deleteEdge],
  );

  const handleSelectionChange = useCallback(
    ({ nodes: selectedNodes }: OnSelectionChangeParams) => {
      setSelectedNodeId(selectedNodes[0]?.id ?? null);
    },
    [setSelectedNodeId],
  );

  const lastCursorSentAtRef = useRef(0);
  const handlePointerMove = useCallback(
    (event: ReactPointerEvent) => {
      const now = Date.now();
      if (now - lastCursorSentAtRef.current < CURSOR_THROTTLE_MS) return;
      lastCursorSentAtRef.current = now;
      setCursor(screenToFlowPosition({ x: event.clientX, y: event.clientY }));
    },
    [screenToFlowPosition, setCursor],
  );

  const handlePointerLeave = useCallback(() => {
    setCursor(null);
  }, [setCursor]);

  return (
    <div
      className="relative h-screen w-screen bg-[#f8f9ff]"
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        nodeTypes={nodeTypes}
        onNodesChange={handleNodesChange}
        onConnect={handleConnect}
        onEdgesDelete={handleEdgesDelete}
        onSelectionChange={handleSelectionChange}
        deleteKeyCode={['Backspace', 'Delete']}
        nodesFocusable
        edgesFocusable
        fitView
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1.5} color="#cbd5e1" />
        <Controls
          className="!rounded-lg !border !border-slate-200 !bg-white !shadow-lg"
          showInteractive={false}
        />
        <RemoteCursors remotePresence={remotePresence} />
      </ReactFlow>
      <div className="pointer-events-none absolute inset-x-0 top-4 flex justify-center">
        <div className="pointer-events-auto">
          <PresenceBar
            roomId={roomId}
            status={status}
            localName={localState?.name ?? '나'}
            localColor={localState?.color ?? '#94a3b8'}
            remotePresence={remotePresence}
          />
        </div>
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-8 flex justify-center">
        <div className="pointer-events-auto">
          <AddNodeToolbar onAddNode={addNode} />
        </div>
      </div>
    </div>
  );
}
