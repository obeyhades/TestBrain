import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, apiRequest } from '../src/lib/apiClient';

function respondWith(status: number, body: unknown): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify(body), { status })),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('apiRequest', () => {
  it('returns the parsed body on success', async () => {
    respondWith(200, { status: 'ok' });

    await expect(apiRequest('/health')).resolves.toEqual({ status: 'ok' });
  });

  it('prefixes the path with /api', async () => {
    respondWith(200, {});

    await apiRequest('/health');

    expect(fetch).toHaveBeenCalledWith('/api/health', expect.anything());
  });

  it('throws an ApiError carrying the status and the message from the server', async () => {
    respondWith(403, { error: 'You do not have permission to do this' });

    await expect(apiRequest('/projects/1')).rejects.toThrow(ApiError);
    await expect(apiRequest('/projects/1')).rejects.toMatchObject({
      status: 403,
      message: 'You do not have permission to do this',
    });
  });

  it('falls back to a generic message when the error body is not JSON', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('<html>502</html>', { status: 502 })),
    );

    await expect(apiRequest('/health')).rejects.toThrow('Request failed with status 502');
  });
});
