import { ExternalApiError, statusFromUpstreamResponse } from './externalApiError.js';

const OPENAI_IMAGES_URL = 'https://api.openai.com/v1/images/generations';

interface OpenAiImagesResponse {
  data: { b64_json: string }[];
}

export async function generateImage(prompt: string): Promise<Buffer> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new ExternalApiError('OPENAI_API_KEY is not configured', 502);
  }

  const response = await fetch(OPENAI_IMAGES_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model: 'gpt-image-1', prompt }),
  });

  if (!response.ok) {
    throw new ExternalApiError(
      'OpenAI image generation failed',
      statusFromUpstreamResponse(response),
    );
  }

  const body = (await response.json()) as OpenAiImagesResponse;
  const b64 = body.data[0]?.b64_json;
  if (!b64) {
    throw new ExternalApiError('OpenAI response missing image data', 502);
  }
  return Buffer.from(b64, 'base64');
}
