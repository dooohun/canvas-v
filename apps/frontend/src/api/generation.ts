export const GENERATE_IMAGE_ENDPOINT = '/api/generate-image';

/** Without this a hanging request would leave the node `pending` forever. */
export const GENERATE_REQUEST_TIMEOUT_MS = 120_000;

const FALLBACK_ERROR_MESSAGE = '이미지 생성에 실패했습니다';
const TIMEOUT_ERROR_MESSAGE = '생성 요청이 시간 초과되었습니다';

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json();
    if (typeof body === 'object' && body !== null && 'error' in body) {
      const { error } = body as { error: unknown };
      if (typeof error === 'string' && error.length > 0) return error;
    }
  } catch {
    // Non-JSON error bodies (proxy/gateway HTML) fall back to the generic message.
  }
  return FALLBACK_ERROR_MESSAGE;
}

/** Resolves to the `/uploads/...` URL from docs/api-spec.md, or throws with a displayable message. */
export async function requestGenerateImage(
  prompt: string,
  timeoutMs: number = GENERATE_REQUEST_TIMEOUT_MS,
): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(GENERATE_IMAGE_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
      signal: controller.signal,
    });
  } catch {
    throw new Error(controller.signal.aborted ? TIMEOUT_ERROR_MESSAGE : '서버에 연결할 수 없습니다');
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  const body: unknown = await response.json();
  const imageUrl =
    typeof body === 'object' && body !== null && 'imageUrl' in body
      ? (body as { imageUrl: unknown }).imageUrl
      : null;
  if (typeof imageUrl !== 'string' || imageUrl.length === 0) {
    throw new Error(FALLBACK_ERROR_MESSAGE);
  }
  return imageUrl;
}
