import { useCallback, useRef, useSyncExternalStore } from 'react';
import type { AwarenessState } from '@repo/shared-types';
import { useCollab } from './CollabContext';
import { isAwarenessState } from './localIdentity';

export interface RemoteSelector {
  clientId: number;
  name: string;
  color: string;
}

export function useRemotePresence(): AwarenessState[] {
  const { awareness } = useCollab();
  const cacheRef = useRef<AwarenessState[] | null>(null);

  const subscribe = useCallback(
    (onChange: () => void) => {
      // Local cursor updates fire 'change' too; ignoring them keeps every mouse
      // move from re-rendering the whole canvas.
      const listener = (changes: { added: number[]; updated: number[]; removed: number[] }) => {
        const changed = [...changes.added, ...changes.updated, ...changes.removed];
        if (changed.every((clientId) => clientId === awareness.clientID)) return;
        cacheRef.current = null;
        onChange();
      };
      awareness.on('change', listener);
      return () => {
        awareness.off('change', listener);
      };
    },
    [awareness],
  );

  const getSnapshot = useCallback(() => {
    if (cacheRef.current === null) {
      const states: AwarenessState[] = [];
      awareness.getStates().forEach((state, clientId) => {
        if (clientId === awareness.clientID) return;
        if (isAwarenessState(state)) states.push(state);
      });
      states.sort((a, b) => a.clientId - b.clientId);
      cacheRef.current = states;
    }
    return cacheRef.current;
  }, [awareness]);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function useLocalPresence() {
  const { awareness } = useCollab();

  const setSelectedNodeId = useCallback(
    (selectedNodeId: string | null) => {
      if ((awareness.getLocalState() as AwarenessState | null)?.selectedNodeId === selectedNodeId) {
        return;
      }
      awareness.setLocalStateField('selectedNodeId', selectedNodeId);
    },
    [awareness],
  );

  const setCursor = useCallback(
    (cursor: { x: number; y: number } | null) => {
      awareness.setLocalStateField('cursor', cursor);
    },
    [awareness],
  );

  return { setSelectedNodeId, setCursor };
}

export function groupSelectorsByNodeId(states: AwarenessState[]): Map<string, RemoteSelector[]> {
  const byNodeId = new Map<string, RemoteSelector[]>();
  for (const state of states) {
    if (!state.selectedNodeId) continue;
    const selectors = byNodeId.get(state.selectedNodeId) ?? [];
    selectors.push({ clientId: state.clientId, name: state.name, color: state.color });
    byNodeId.set(state.selectedNodeId, selectors);
  }
  return byNodeId;
}
