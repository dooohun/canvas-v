import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as Y from 'yjs';
import type { Generate3dNode, GenerateImageNode } from '@repo/shared-types';
import { createCollabHarness } from '@/collab/__tests__/renderWithCollab';
import {
  addEdge,
  addNode,
  markGenerateImageReady,
  readPipelineSnapshot,
  updateTextPromptValue,
} from '@/collab/pipelineDoc';
import {
  NO_INPUT_IMAGE_MESSAGE,
  NO_INPUT_PROMPT_MESSAGE,
  useNodeExecution,
} from '../useNodeExecution';

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function setupPipeline() {
  const harness = createCollabHarness();
  const { doc } = harness;
  const textId = addNode(doc, 'textPrompt', { x: 0, y: 0 });
  const imageId = addNode(doc, 'generateImage', { x: 400, y: 0 });
  updateTextPromptValue(doc, textId, 'a neon jellyfish');
  addEdge(doc, textId, imageId);
  const { result } = renderHook(() => useNodeExecution(), { wrapper: harness.wrapper });
  return { ...harness, textId, imageId, result };
}

function readImageNode(doc: Y.Doc, id: string): GenerateImageNode {
  const node = readPipelineSnapshot(doc).nodes.find((candidate) => candidate.id === id);
  if (node?.type !== 'generateImage') throw new Error('expected a generateImage node');
  return node;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useNodeExecution', () => {
  it('sends the composed prompt and stores the returned image url in the Y.Doc', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { imageUrl: '/uploads/a.png' }));
    vi.stubGlobal('fetch', fetchMock);
    const { doc, imageId, result } = setupPipeline();

    await act(async () => {
      await result.current.runGenerateImage(imageId);
    });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/generate-image',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ prompt: 'a neon jellyfish' }),
      }),
    );
    expect(readImageNode(doc, imageId)).toMatchObject({
      status: 'ready',
      imageUrl: '/uploads/a.png',
      errorMessage: null,
    });
  });

  it('moves through pending before the request resolves and syncs it to a remote peer', async () => {
    let resolveFetch: (response: Response) => void = () => {};
    const pending = new Promise<Response>((resolve) => {
      resolveFetch = resolve;
    });
    vi.stubGlobal(
      'fetch',
      vi.fn(() => pending),
    );
    const { doc, imageId, result } = setupPipeline();
    const peerDoc = new Y.Doc();
    Y.applyUpdate(peerDoc, Y.encodeStateAsUpdate(doc), 'remote');
    doc.on('update', (update: Uint8Array) => Y.applyUpdate(peerDoc, update, 'remote'));

    let run: Promise<void> = Promise.resolve();
    act(() => {
      run = result.current.runGenerateImage(imageId);
    });

    expect(readImageNode(doc, imageId).status).toBe('pending');
    expect(readImageNode(peerDoc, imageId).status).toBe('pending');

    await act(async () => {
      resolveFetch(jsonResponse(200, { imageUrl: '/uploads/b.png' }));
      await run;
    });

    expect(readImageNode(peerDoc, imageId)).toMatchObject({
      status: 'ready',
      imageUrl: '/uploads/b.png',
    });
  });

  it('stores the server error message when generation fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse(502, { error: 'image generation failed' })),
    );
    const { doc, imageId, result } = setupPipeline();

    await act(async () => {
      await result.current.runGenerateImage(imageId);
    });

    expect(readImageNode(doc, imageId)).toMatchObject({
      status: 'error',
      imageUrl: null,
      errorMessage: 'image generation failed',
    });
  });

  it('reports a network failure without leaving the node stuck in pending', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    const { doc, imageId, result } = setupPipeline();

    await act(async () => {
      await result.current.runGenerateImage(imageId);
    });

    expect(readImageNode(doc, imageId)).toMatchObject({
      status: 'error',
      errorMessage: '서버에 연결할 수 없습니다',
    });
  });

  it('does not call the API when no text prompt is connected', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const harness = createCollabHarness();
    const imageId = addNode(harness.doc, 'generateImage', { x: 0, y: 0 });
    const { result } = renderHook(() => useNodeExecution(), { wrapper: harness.wrapper });

    await act(async () => {
      await result.current.runGenerateImage(imageId);
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(readImageNode(harness.doc, imageId)).toMatchObject({
      status: 'error',
      errorMessage: NO_INPUT_PROMPT_MESSAGE,
    });
  });

  it('clears a previous result when the node is re-run', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(jsonResponse(200, { imageUrl: '/uploads/first.png' }))
        .mockResolvedValueOnce(jsonResponse(200, { imageUrl: '/uploads/second.png' })),
    );
    const { doc, imageId, result } = setupPipeline();

    await act(async () => {
      await result.current.runGenerateImage(imageId);
    });
    await act(async () => {
      await result.current.runGenerateImage(imageId);
    });

    expect(readImageNode(doc, imageId).imageUrl).toBe('/uploads/second.png');
  });
});

function read3dNode(doc: Y.Doc, id: string): Generate3dNode {
  const node = readPipelineSnapshot(doc).nodes.find((candidate) => candidate.id === id);
  if (node?.type !== 'generate3d') throw new Error('expected a generate3d node');
  return node;
}

function setup3dPipeline() {
  const harness = createCollabHarness();
  const { doc } = harness;
  const imageId = addNode(doc, 'generateImage', { x: 0, y: 0 });
  const modelId = addNode(doc, 'generate3d', { x: 400, y: 0 });
  markGenerateImageReady(doc, imageId, '/uploads/source.png');
  addEdge(doc, imageId, modelId);
  const { result } = renderHook(() => useNodeExecution(), { wrapper: harness.wrapper });
  return { ...harness, imageId, modelId, result };
}

describe('useNodeExecution — runGenerate3d', () => {
  it('sends the selected image url and stores the returned model url in the Y.Doc', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse(200, { modelUrl: '/uploads/a-model.glb' }));
    vi.stubGlobal('fetch', fetchMock);
    const { doc, modelId, result } = setup3dPipeline();

    await act(async () => {
      await result.current.runGenerate3d(modelId);
    });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/generate-3d',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ imageUrl: '/uploads/source.png' }),
      }),
    );
    expect(read3dNode(doc, modelId)).toMatchObject({
      status: 'ready',
      modelUrl: '/uploads/a-model.glb',
      errorMessage: null,
    });
  });

  it('sends only the first ready image when several are connected', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse(200, { modelUrl: '/uploads/a-model.glb' }));
    vi.stubGlobal('fetch', fetchMock);
    const harness = createCollabHarness();
    const { doc } = harness;
    const modelId = addNode(doc, 'generate3d', { x: 800, y: 0 });
    const lowerId = addNode(doc, 'generateImage', { x: 0, y: 400 });
    const upperId = addNode(doc, 'generateImage', { x: 0, y: 0 });
    markGenerateImageReady(doc, lowerId, '/uploads/lower.png');
    markGenerateImageReady(doc, upperId, '/uploads/upper.png');
    addEdge(doc, lowerId, modelId);
    addEdge(doc, upperId, modelId);
    const { result } = renderHook(() => useNodeExecution(), { wrapper: harness.wrapper });

    await act(async () => {
      await result.current.runGenerate3d(modelId);
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]![1]).toMatchObject({
      body: JSON.stringify({ imageUrl: '/uploads/upper.png' }),
    });
  });

  it('moves through pending and syncs the model url to a remote peer', async () => {
    let resolveFetch: (response: Response) => void = () => {};
    const pending = new Promise<Response>((resolve) => {
      resolveFetch = resolve;
    });
    vi.stubGlobal(
      'fetch',
      vi.fn(() => pending),
    );
    const { doc, modelId, result } = setup3dPipeline();
    const peerDoc = new Y.Doc();
    Y.applyUpdate(peerDoc, Y.encodeStateAsUpdate(doc), 'remote');
    doc.on('update', (update: Uint8Array) => Y.applyUpdate(peerDoc, update, 'remote'));

    let run: Promise<void> = Promise.resolve();
    act(() => {
      run = result.current.runGenerate3d(modelId);
    });

    expect(read3dNode(doc, modelId).status).toBe('pending');
    expect(read3dNode(peerDoc, modelId).status).toBe('pending');
    expect(read3dNode(doc, modelId).pendingRun).not.toBeNull();

    await act(async () => {
      resolveFetch(jsonResponse(200, { modelUrl: '/uploads/b-model.glb' }));
      await run;
    });

    expect(read3dNode(peerDoc, modelId)).toMatchObject({
      status: 'ready',
      modelUrl: '/uploads/b-model.glb',
      pendingRun: null,
    });
  });

  it('does not call the API when no ready image is connected', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const harness = createCollabHarness();
    const { doc } = harness;
    const imageId = addNode(doc, 'generateImage', { x: 0, y: 0 });
    const modelId = addNode(doc, 'generate3d', { x: 400, y: 0 });
    addEdge(doc, imageId, modelId);
    const { result } = renderHook(() => useNodeExecution(), { wrapper: harness.wrapper });

    await act(async () => {
      await result.current.runGenerate3d(modelId);
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(read3dNode(doc, modelId)).toMatchObject({
      status: 'error',
      modelUrl: null,
      errorMessage: NO_INPUT_IMAGE_MESSAGE,
    });
  });

  it('stores the server error message and clears a stale model on failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(jsonResponse(200, { modelUrl: '/uploads/first.glb' }))
        .mockResolvedValueOnce(jsonResponse(502, { error: '3d generation failed' })),
    );
    const { doc, modelId, result } = setup3dPipeline();

    await act(async () => {
      await result.current.runGenerate3d(modelId);
    });
    expect(read3dNode(doc, modelId).modelUrl).toBe('/uploads/first.glb');

    await act(async () => {
      await result.current.runGenerate3d(modelId);
    });

    expect(read3dNode(doc, modelId)).toMatchObject({
      status: 'error',
      modelUrl: null,
      errorMessage: '3d generation failed',
      pendingRun: null,
    });
  });
});
