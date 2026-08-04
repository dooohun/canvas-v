import { ExternalApiError, statusFromUpstreamResponse } from './externalApiError.js';

const MESHY_BASE_URL = 'https://api.meshy.ai/openapi/v1/image-to-3d';
const POLL_INTERVAL_MS = 2000;
const MAX_POLL_ATTEMPTS = 60;

interface MeshyCreateTaskResponse {
  result: string;
}

interface MeshyTaskStatusResponse {
  status: 'PENDING' | 'IN_PROGRESS' | 'SUCCEEDED' | 'FAILED';
  model_urls?: { glb?: string };
}

function authHeaders(apiKey: string) {
  return { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' };
}

async function createTask(apiKey: string, imageUrl: string): Promise<string> {
  const response = await fetch(MESHY_BASE_URL, {
    method: 'POST',
    headers: authHeaders(apiKey),
    body: JSON.stringify({ image_url: imageUrl }),
  });
  if (!response.ok) {
    throw new ExternalApiError(
      'Meshy AI task creation failed',
      statusFromUpstreamResponse(response),
    );
  }
  const body = (await response.json()) as MeshyCreateTaskResponse;
  return body.result;
}

async function pollTask(apiKey: string, taskId: string): Promise<string> {
  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
    const response = await fetch(`${MESHY_BASE_URL}/${taskId}`, { headers: authHeaders(apiKey) });
    if (!response.ok) {
      throw new ExternalApiError(
        'Meshy AI task polling failed',
        statusFromUpstreamResponse(response),
      );
    }
    const body = (await response.json()) as MeshyTaskStatusResponse;
    if (body.status === 'SUCCEEDED' && body.model_urls?.glb) {
      return body.model_urls.glb;
    }
    if (body.status === 'FAILED') {
      throw new ExternalApiError('Meshy AI 3d generation failed', 502);
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
  throw new ExternalApiError('Meshy AI 3d generation timed out', 502);
}

export async function generateModel(imageUrl: string): Promise<Buffer> {
  const apiKey = process.env.MESHY_API_KEY;
  if (!apiKey) {
    throw new ExternalApiError('MESHY_API_KEY is not configured', 502);
  }

  const taskId = await createTask(apiKey, imageUrl);
  const modelUrl = await pollTask(apiKey, taskId);

  const modelResponse = await fetch(modelUrl);
  if (!modelResponse.ok) {
    throw new ExternalApiError(
      'Failed to download generated 3d model',
      statusFromUpstreamResponse(modelResponse),
    );
  }
  return Buffer.from(await modelResponse.arrayBuffer());
}
