import { existsSync, unlinkSync } from 'node:fs';
import supertest from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../app.js';
import { ExternalApiError } from '../lib/externalApiError.js';
import { generateModel } from '../lib/meshyClient.js';
import { resolveStoredFilePath } from '../lib/storage.js';

vi.mock('../lib/meshyClient.js', () => ({
  generateModel: vi.fn(),
}));

const mockedGenerateModel = vi.mocked(generateModel);
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

describe('POST /api/generate-3d', () => {
  it('returns 400 when imageUrl is missing', async () => {
    const response = await supertest(createApp()).post('/api/generate-3d').send({});

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'imageUrl is required' });
  });

  it('returns 400 when imageUrl is not a path we serve', async () => {
    const response = await supertest(createApp())
      .post('/api/generate-3d')
      .send({ imageUrl: 'https://example.com/image.png' });

    expect(response.status).toBe(400);
  });

  it('returns 400 when imageUrl is not a string', async () => {
    const response = await supertest(createApp()).post('/api/generate-3d').send({ imageUrl: 42 });

    expect(response.status).toBe(400);
  });

  it('returns 502 when the client throws a non-ExternalApiError error', async () => {
    mockedGenerateModel.mockRejectedValue(new Error('unexpected failure'));

    const response = await supertest(createApp())
      .post('/api/generate-3d')
      .send({ imageUrl: '/uploads/some-generated-image.png' });

    expect(response.status).toBe(502);
    expect(response.body).toEqual({ error: '3d generation failed' });
  });

  it('returns modelUrl on success without leaking the API key', async () => {
    mockedGenerateModel.mockResolvedValue(Buffer.from('fake-glb-bytes'));

    const response = await supertest(createApp())
      .post('/api/generate-3d')
      .send({ imageUrl: '/uploads/some-generated-image.png' });

    expect(response.status).toBe(200);
    expect(response.body.modelUrl).toMatch(/^\/uploads\/.+/);
    expect(JSON.stringify(response.body)).not.toMatch(/sk-/);
    expect(mockedGenerateModel).toHaveBeenCalledWith(
      expect.stringContaining('/uploads/some-generated-image.png'),
    );
    writtenFiles.push(response.body.modelUrl.replace('/uploads/', ''));
  });

  it('returns 502 when the upstream call fails', async () => {
    mockedGenerateModel.mockRejectedValue(new ExternalApiError('upstream failure', 502));

    const response = await supertest(createApp())
      .post('/api/generate-3d')
      .send({ imageUrl: '/uploads/some-generated-image.png' });

    expect(response.status).toBe(502);
    expect(response.body).toEqual({ error: '3d generation failed' });
  });

  it('returns 429 when rate limited', async () => {
    mockedGenerateModel.mockRejectedValue(new ExternalApiError('slow down', 429));

    const response = await supertest(createApp())
      .post('/api/generate-3d')
      .send({ imageUrl: '/uploads/some-generated-image.png' });

    expect(response.status).toBe(429);
    expect(response.body).toEqual({ error: 'rate limited, try again later' });
  });
});
