import type { ReactNode } from 'react';
import { Awareness } from 'y-protocols/awareness';
import * as Y from 'yjs';
import { CollabProvider } from '../CollabContext';
import { createLocalIdentity } from '../localIdentity';

export interface CollabHarness {
  doc: Y.Doc;
  awareness: Awareness;
  wrapper: ({ children }: { children: ReactNode }) => ReactNode;
}

export function createCollabHarness(doc = new Y.Doc()): CollabHarness {
  const awareness = new Awareness(doc);
  awareness.setLocalState(createLocalIdentity(awareness.clientID));
  return {
    doc,
    awareness,
    wrapper: ({ children }) => (
      <CollabProvider doc={doc} awareness={awareness} status="connected" roomId="test-room">
        {children}
      </CollabProvider>
    ),
  };
}
