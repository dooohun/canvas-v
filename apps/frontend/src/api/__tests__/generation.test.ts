import { afterEach, describe, expect, it, vi } from 'vitest';
import { requestGenerateImage } from '../generation';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('requestGenerateImage', () => {
  it('aborts and reports a timeout when the server never responds', async () => {
    const fetchMock = vi.fn(
      (_url: string, init: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => {
            reject(new DOMException('The operation was aborted.', 'AbortError'));
          });
        }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(requestGenerateImage('a neon jellyfish', 10)).rejects.toThrow(
      '생성 요청이 시간 초과되었습니다',
    );
  });

  it('does not abort a request that resolves in time', async () => {
    const fetchMock = vi.fn((_url: string, init: RequestInit) => {
      expect(init.signal?.aborted).toBe(false);
      return Promise.resolve(
        new Response(JSON.stringify({ imageUrl: '/uploads/a.png' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(requestGenerateImage('a neon jellyfish', 10_000)).resolves.toBe('/uploads/a.png');
  });

  it('rejects a response body that has no image url', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({}), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );

    await expect(requestGenerateImage('a neon jellyfish')).rejects.toThrow(
      '이미지 생성에 실패했습니다',
    );
  });
});
