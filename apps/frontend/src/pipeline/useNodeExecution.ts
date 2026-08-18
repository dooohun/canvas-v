import { useCallback } from 'react';
import { requestGenerateImage } from '@/api/generation';
import { useCollab } from '@/collab/CollabContext';
import {
  markGenerateImageReady,
  markNodeError,
  markNodePending,
  readPipelineSnapshot,
} from '@/collab/pipelineDoc';
import { composeInputPrompt } from './promptComposition';

export const NO_INPUT_PROMPT_MESSAGE = '연결된 Text Prompt 노드에 내용이 없습니다';

export interface UseNodeExecutionResult {
  runGenerateImage: (nodeId: string) => Promise<void>;
}

export function useNodeExecution(): UseNodeExecutionResult {
  const { doc, awareness } = useCollab();

  const runGenerateImage = useCallback(
    async (nodeId: string) => {
      const { nodes, edges } = readPipelineSnapshot(doc);
      const prompt = composeInputPrompt(nodes, edges, nodeId);
      if (prompt.length === 0) {
        markNodeError(doc, nodeId, NO_INPUT_PROMPT_MESSAGE);
        return;
      }

      markNodePending(doc, nodeId, awareness.clientID);
      try {
        const imageUrl = await requestGenerateImage(prompt);
        markGenerateImageReady(doc, nodeId, imageUrl);
      } catch (error) {
        markNodeError(doc, nodeId, error instanceof Error ? error.message : '알 수 없는 오류');
      }
    },
    [doc, awareness],
  );

  return { runGenerateImage };
}
