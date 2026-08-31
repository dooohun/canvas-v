import { afterEach, describe, expect, it, vi } from 'vitest';
import { GENERATE_3D_ENDPOINT, requestGenerate3d, requestGenerateImage } from '../generation';

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

describe('requestGenerate3d', () => {
  it('posts the image url and resolves to the returned model url', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ modelUrl: '/uploads/a-model.glb' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(requestGenerate3d('/uploads/source.png')).resolves.toBe('/uploads/a-model.glb');
    expect(fetchMock).toHaveBeenCalledWith(
      GENERATE_3D_ENDPOINT,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ imageUrl: '/uploads/source.png' }),
      }),
    );
  });

  it('surfaces the server error message', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: 'rate limited, try again later' }), {
          status: 429,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );

    await expect(requestGenerate3d('/uploads/source.png')).rejects.toThrow(
      'rate limited, try again later',
    );
  });

  it('rejects a response body that has no model url', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({}), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );

    await expect(requestGenerate3d('/uploads/source.png')).rejects.toThrow(
      '3D 모델 생성에 실패했습니다',
    );
  });

  it('aborts and reports a timeout when the server never responds', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_url: string, init: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            init.signal?.addEventListener('abort', () => {
              reject(new DOMException('The operation was aborted.', 'AbortError'));
            });
          }),
      ),
    );

    await expect(requestGenerate3d('/uploads/source.png', 10)).rejects.toThrow(
      '생성 요청이 시간 초과되었습니다',
    );
  });
});
