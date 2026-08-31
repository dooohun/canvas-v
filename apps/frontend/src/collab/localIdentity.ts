import type { AwarenessState } from '@repo/shared-types';

const PRESENCE_COLORS = [
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#06b6d4',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
];

const PRESENCE_ANIMALS = [
  'Otter',
  'Falcon',
  'Panda',
  'Lynx',
  'Heron',
  'Koala',
  'Ibex',
  'Gecko',
  'Puffin',
  'Marten',
];

export function createLocalIdentity(clientId: number): AwarenessState {
  return {
    clientId,
    name: `${PRESENCE_ANIMALS[clientId % PRESENCE_ANIMALS.length]}-${String(clientId % 1000).padStart(3, '0')}`,
    color: PRESENCE_COLORS[clientId % PRESENCE_COLORS.length]!,
    cursor: null,
    selectedNodeId: null,
  };
}

export function isAwarenessState(value: unknown): value is AwarenessState {
  if (typeof value !== 'object' || value === null) return false;
  const state = value as Partial<AwarenessState>;
  return (
    typeof state.clientId === 'number' &&
    typeof state.name === 'string' &&
    typeof state.color === 'string'
  );
}
