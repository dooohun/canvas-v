export const GENERATE_IMAGE_ENDPOINT = '/api/generate-image';
export const GENERATE_3D_ENDPOINT = '/api/generate-3d';

/** Without this a hanging request would leave the node `pending` forever. */
export const GENERATE_REQUEST_TIMEOUT_MS = 120_000;

const IMAGE_FALLBACK_ERROR_MESSAGE = '이미지 생성에 실패했습니다';
const MODEL_FALLBACK_ERROR_MESSAGE = '3D 모델 생성에 실패했습니다';
const TIMEOUT_ERROR_MESSAGE = '생성 요청이 시간 초과되었습니다';
const OFFLINE_ERROR_MESSAGE = '서버에 연결할 수 없습니다';

async function readErrorMessage(response: Response, fallbackMessage: string): Promise<string> {
  try {
    const body: unknown = await response.json();
    if (typeof body === 'object' && body !== null && 'error' in body) {
      const { error } = body as { error: unknown };
      if (typeof error === 'string' && error.length > 0) return error;
    }
  } catch {
    // Non-JSON error bodies (proxy/gateway HTML) fall back to the generic message.
  }
  return fallbackMessage;
}

async function requestGeneration(
  endpoint: string,
  payload: Record<string, string>,
  resultKey: string,
  fallbackMessage: string,
  timeoutMs: number,
): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch {
    throw new Error(controller.signal.aborted ? TIMEOUT_ERROR_MESSAGE : OFFLINE_ERROR_MESSAGE);
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, fallbackMessage));
  }

  const body: unknown = await response.json();
  const url =
    typeof body === 'object' && body !== null && resultKey in body
      ? (body as Record<string, unknown>)[resultKey]
      : null;
  if (typeof url !== 'string' || url.length === 0) {
    throw new Error(fallbackMessage);
  }
  return url;
}

/** Resolves to the `/uploads/...` URL from docs/api-spec.md, or throws with a displayable message. */
export function requestGenerateImage(
  prompt: string,
  timeoutMs: number = GENERATE_REQUEST_TIMEOUT_MS,
): Promise<string> {
  return requestGeneration(
    GENERATE_IMAGE_ENDPOINT,
    { prompt },
    'imageUrl',
    IMAGE_FALLBACK_ERROR_MESSAGE,
    timeoutMs,
  );
}

/** Resolves to the `/uploads/....glb` URL from docs/api-spec.md, or throws a displayable message. */
export function requestGenerate3d(
  imageUrl: string,
  timeoutMs: number = GENERATE_REQUEST_TIMEOUT_MS,
): Promise<string> {
  return requestGeneration(
    GENERATE_3D_ENDPOINT,
    { imageUrl },
    'modelUrl',
    MODEL_FALLBACK_ERROR_MESSAGE,
    timeoutMs,
  );
}
