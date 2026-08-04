import { existsSync, unlinkSync } from 'node:fs';
import supertest from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import { createApp } from '../app.js';
import { resolveStoredFilePath } from '../lib/storage.js';

const writtenFiles: string[] = [];

afterEach(() => {
  for (const filename of writtenFiles.splice(0)) {
    const filePath = resolveStoredFilePath(filename);
    if (filePath && existsSync(filePath)) {
      unlinkSync(filePath);
    }
  }
});

describe('POST /api/upload', () => {
  it('returns 400 when no file is attached', async () => {
    const response = await supertest(createApp()).post('/api/upload');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'file is required' });
  });

  it('returns 400 for an unsupported file type', async () => {
    const response = await supertest(createApp())
      .post('/api/upload')
      .attach('file', Buffer.from('not an image'), {
        filename: 'notes.txt',
        contentType: 'text/plain',
      });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'unsupported file type' });
  });

  it('returns 400 when the file is attached under the wrong field name', async () => {
    const response = await supertest(createApp())
      .post('/api/upload')
      .attach('wrongfield', Buffer.from('fake-png-bytes'), {
        filename: 'photo.png',
        contentType: 'image/png',
      });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'upload failed' });
  });

  it('returns 413 when the file exceeds the size limit', async () => {
    const oversized = Buffer.alloc(11 * 1024 * 1024);

    const response = await supertest(createApp())
      .post('/api/upload')
      .attach('file', oversized, { filename: 'huge.png', contentType: 'image/png' });

    expect(response.status).toBe(413);
    expect(response.body).toEqual({ error: 'file too large' });
  });

  it('returns a url on a successful upload', async () => {
    const response = await supertest(createApp())
      .post('/api/upload')
      .attach('file', Buffer.from('fake-png-bytes'), {
        filename: 'photo.png',
        contentType: 'image/png',
      });

    expect(response.status).toBe(200);
    expect(response.body.url).toMatch(/^\/uploads\/.+photo\.png$/);
    writtenFiles.push(response.body.url.replace('/uploads/', ''));
  });
});
