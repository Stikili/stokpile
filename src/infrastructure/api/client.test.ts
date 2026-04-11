import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchClient, ApiError } from './client';

describe('fetchClient', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('should make a successful GET request', async () => {
    const mockData = { users: [{ id: 1, name: 'Test' }] };
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify(mockData), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    );

    const result = await fetchClient<typeof mockData>('https://api.test.com/users');
    expect(result).toEqual(mockData);
  });

  it('should throw ApiError on 4xx responses', async () => {
    const make404 = () => new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { 'content-type': 'application/json' },
    });
    vi.spyOn(globalThis, 'fetch').mockImplementation(() => Promise.resolve(make404()));

    await expect(
      fetchClient('https://api.test.com/missing', { retries: 0 })
    ).rejects.toThrow(ApiError);

    await expect(
      fetchClient('https://api.test.com/missing', { retries: 0 })
    ).rejects.toThrow('Not found');
  });

  it('should include status code in ApiError', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { 'content-type': 'application/json' },
      })
    );

    try {
      await fetchClient('https://api.test.com/admin', { retries: 0 });
      expect.fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).status).toBe(403);
    }
  });

  it('should send POST requests with body', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    );

    await fetchClient('https://api.test.com/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'test' }),
    });

    expect(fetchSpy).toHaveBeenCalledWith(
      'https://api.test.com/create',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ name: 'test' }),
      })
    );
  });

  it('should throw timeout error when request exceeds timeout', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      (_url, opts) => new Promise((_resolve, reject) => {
        // Simulate abort via the signal
        const signal = (opts as any)?.signal;
        if (signal) {
          signal.addEventListener('abort', () => {
            reject(new DOMException('The operation was aborted.', 'AbortError'));
          });
        }
      })
    );

    const promise = fetchClient('https://api.test.com/slow', {
      timeout: 100,
      retries: 0,
    });

    vi.advanceTimersByTime(150);

    await expect(promise).rejects.toThrow('timed out');
  });
});

describe('ApiError', () => {
  it('should have correct name', () => {
    const error = new ApiError('test', 500);
    expect(error.name).toBe('ApiError');
  });

  it('should store status and code', () => {
    const error = new ApiError('test', 408, 'TIMEOUT');
    expect(error.status).toBe(408);
    expect(error.code).toBe('TIMEOUT');
    expect(error.message).toBe('test');
  });

  it('should be instanceof Error', () => {
    const error = new ApiError('test', 500);
    expect(error).toBeInstanceOf(Error);
  });
});
