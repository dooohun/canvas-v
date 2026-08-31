import { useMemo } from 'react';
import { CollabProvider } from '@/collab/CollabContext';
import { roomIdFromSearch, useCollabRoom } from '@/collab/useCollabRoom';
import { PipelineCanvas } from '@/components/pipeline/PipelineCanvas';

export function App() {
  const roomId = useMemo(() => roomIdFromSearch(window.location.search), []);
  const { doc, awareness, status } = useCollabRoom(roomId);

  return (
    <CollabProvider doc={doc} awareness={awareness} status={status} roomId={roomId}>
      <PipelineCanvas />
    </CollabProvider>
  );
}
