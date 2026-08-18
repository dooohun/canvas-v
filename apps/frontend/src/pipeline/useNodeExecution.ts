import { useCallback } from 'react';
import { requestGenerate3d, requestGenerateImage } from '@/api/generation';
import { useCollab } from '@/collab/CollabContext';
import {
  markGenerate3dReady,
  markGenerateImageReady,
  markNodeError,
  markNodePending,
  readPipelineSnapshot,
} from '@/collab/pipelineDoc';
import { selectInputImageUrl } from './imageSelection';
import { composeInputPrompt } from './promptComposition';

export const NO_INPUT_PROMPT_MESSAGE = '연결된 Text Prompt 노드에 내용이 없습니다';
export const NO_INPUT_IMAGE_MESSAGE = '연결된 Generate Image 노드에 완성된 이미지가 없습니다';

export interface UseNodeExecutionResult {
  runGenerateImage: (nodeId: string) => Promise<void>;
  runGenerate3d: (nodeId: string) => Promise<void>;
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

  const runGenerate3d = useCallback(
    async (nodeId: string) => {
      const { nodes, edges } = readPipelineSnapshot(doc);
      const imageUrl = selectInputImageUrl(nodes, edges, nodeId);
      if (imageUrl === null) {
        markNodeError(doc, nodeId, NO_INPUT_IMAGE_MESSAGE);
        return;
      }

      markNodePending(doc, nodeId, awareness.clientID);
      try {
        const modelUrl = await requestGenerate3d(imageUrl);
        markGenerate3dReady(doc, nodeId, modelUrl);
      } catch (error) {
        markNodeError(doc, nodeId, error instanceof Error ? error.message : '알 수 없는 오류');
      }
    },
    [doc, awareness],
  );

  return { runGenerateImage, runGenerate3d };
}
