import { existsSync, unlinkSync } from 'node:fs';
import supertest from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../app.js';
import { ExternalApiError } from '../lib/externalApiError.js';
import { generateImage } from '../lib/openaiClient.js';
import { resolveStoredFilePath } from '../lib/storage.js';

vi.mock('../lib/openaiClient.js', () => ({
  generateImage: vi.fn(),
}));

const mockedGenerateImage = vi.mocked(generateImage);
const writtenFiles: string[] = [];

afterEach(() => {
  vi.resetAllMocks();
  for (const filename of writtenFiles.splice(0)) {
    const filePath = resolveStoredFilePath(filename);
    if (filePath && existsSync(filePath)) {
      unlinkSync(filePath);
    }
  }
});

describe('POST /api/generate-image', () => {
  it('returns 400 when prompt is missing', async () => {
    const response = await supertest(createApp()).post('/api/generate-image').send({});

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'prompt is required' });
  });

  it('returns 400 when prompt is an empty string', async () => {
    const response = await supertest(createApp())
      .post('/api/generate-image')
      .send({ prompt: '   ' });

    expect(response.status).toBe(400);
  });

  it('returns 400 when prompt is not a string', async () => {
    const response = await supertest(createApp()).post('/api/generate-image').send({ prompt: 123 });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'prompt is required' });
  });

  it('returns 502 when the client throws a non-ExternalApiError error', async () => {
    mockedGenerateImage.mockRejectedValue(new Error('unexpected failure'));

    const response = await supertest(createApp())
      .post('/api/generate-image')
      .send({ prompt: 'a cat' });

    expect(response.status).toBe(502);
    expect(response.body).toEqual({ error: 'image generation failed' });
  });

  it('returns imageUrl on success without leaking the API key', async () => {
    mockedGenerateImage.mockResolvedValue(Buffer.from('fake-image-bytes'));

    const response = await supertest(createApp())
      .post('/api/generate-image')
      .send({ prompt: 'a futuristic cyberpunk cityscape' });

    expect(response.status).toBe(200);
    expect(response.body.imageUrl).toMatch(/^\/uploads\/.+/);
    expect(JSON.stringify(response.body)).not.toMatch(/sk-/);
    writtenFiles.push(response.body.imageUrl.replace('/uploads/', ''));
  });

  it('returns 502 when the upstream call fails', async () => {
    mockedGenerateImage.mockRejectedValue(new ExternalApiError('upstream failure', 502));

    const response = await supertest(createApp())
      .post('/api/generate-image')
      .send({ prompt: 'a cat' });

    expect(response.status).toBe(502);
    expect(response.body).toEqual({ error: 'image generation failed' });
  });

  it('returns 429 when rate limited', async () => {
    mockedGenerateImage.mockRejectedValue(new ExternalApiError('slow down', 429));

    const response = await supertest(createApp())
      .post('/api/generate-image')
      .send({ prompt: 'a cat' });

    expect(response.status).toBe(429);
    expect(response.body).toEqual({ error: 'rate limited, try again later' });
  });
});
