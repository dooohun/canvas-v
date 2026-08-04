import { existsSync, unlinkSync } from 'node:fs';
import supertest from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import { createApp } from '../app.js';
import { resolveStoredFilePath, saveBuffer } from '../lib/storage.js';

const writtenFiles: string[] = [];

afterEach(() => {
  for (const filename of writtenFiles.splice(0)) {
    const filePath = resolveStoredFilePath(filename);
    if (filePath && existsSync(filePath)) {
      unlinkSync(filePath);
    }
  }
});

describe('GET /uploads/:filename', () => {
  it('serves an existing file with 200', async () => {
    const { filename } = saveBuffer(Buffer.from('fake-png-bytes'), 'photo.png');
    writtenFiles.push(filename);

    const response = await supertest(createApp()).get(`/uploads/${filename}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual(Buffer.from('fake-png-bytes'));
    expect(response.headers['content-type']).toBe('image/png');
  });

  it('returns 404 for a file that does not exist', async () => {
    const response = await supertest(createApp()).get('/uploads/does-not-exist.png');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'not found' });
  });

  it('returns 400 for a filename containing path traversal characters', async () => {
    const response = await supertest(createApp()).get('/uploads/..%2F..%2Fpackage.json');

    expect(response.status).toBe(400);
  });
});
