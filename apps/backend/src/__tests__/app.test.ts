import supertest from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../app.js';

describe('GET /health', () => {
  it('returns 200 with status ok', async () => {
    const app = createApp();

    const response = await supertest(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
    expect(response.headers.authorization).toBeUndefined();
  });
});

describe('malformed request bodies', () => {
  it('returns a JSON error instead of the default HTML error page', async () => {
    const app = createApp();

    const response = await supertest(app)
      .post('/api/generate-image')
      .set('Content-Type', 'application/json')
      .send('{not valid json');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'invalid JSON body' });
    expect(response.type).toBe('application/json');
  });
});
