import { useCallback, useMemo, useRef } from 'react';
import {
  Background,
  BackgroundVariant,
  Controls,
  ReactFlow,
  useNodesState,
  type Connection,
  type Node,
  type NodeChange,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { usePipelineState } from '@/pipeline/usePipelineState';
import {
  reconcileFlowNodes,
  toReactFlowEdges,
  type PipelineNodeData,
} from '@/pipeline/reactFlowAdapter';
import { AddNodeToolbar } from './AddNodeToolbar';
import { TextPromptNode } from './TextPromptNode';
import { GenerateImageNode } from './GenerateImageNode';
import { Generate3dNode } from './Generate3dNode';

const nodeTypes = {
  textPrompt: TextPromptNode,
  generateImage: GenerateImageNode,
  generate3d: Generate3dNode,
};

export function PipelineCanvas() {
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

  const nodeHandlers = useMemo(
    () => ({ onChangePrompt: updateTextPromptValue, onDeleteNode: deleteNode }),
    [updateTextPromptValue, deleteNode],
  );

  // Reconciled during render, not in a useEffect: an Effect would commit the stale list first
  // and only patch it in on a second render pass, causing a visible flicker/lag on every change.
  const [flowNodes, setFlowNodes, onFlowNodesChangeInternal] = useNodesState<
    Node<PipelineNodeData>
  >(reconcileFlowNodes(nodes, [], nodeHandlers));
  const prevNodesRef = useRef(nodes);
  if (prevNodesRef.current !== nodes) {
    prevNodesRef.current = nodes;
    setFlowNodes((current) => reconcileFlowNodes(nodes, current, nodeHandlers));
  }

  const flowEdges = useMemo(() => toReactFlowEdges(edges), [edges]);

  const handleNodesChange = useCallback(
    (changes: NodeChange<Node<PipelineNodeData>>[]) => {
      // Only our own toolbar/delete buttons may remove a node — drop React Flow's own
      // 'remove' changes (e.g. keyboard delete) so the domain state can't desync.
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

  return (
    <div className="relative h-screen w-screen bg-[#f8f9ff]">
      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        nodeTypes={nodeTypes}
        onNodesChange={handleNodesChange}
        onConnect={handleConnect}
        onEdgesDelete={handleEdgesDelete}
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
      </ReactFlow>
      <div className="pointer-events-none absolute inset-x-0 bottom-8 flex justify-center">
        <div className="pointer-events-auto">
          <AddNodeToolbar onAddNode={addNode} />
        </div>
      </div>
    </div>
  );
}
