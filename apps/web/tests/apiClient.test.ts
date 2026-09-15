import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ApiError,
  apiGet,
  apiPost,
  apiSendWithoutResponse,
  toUserMessage,
} from '../src/lib/apiClient';

function respondWith(status: number, body: unknown): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify(body), { status })),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('apiGet', () => {
  it('returns the parsed body on success', async () => {
    respondWith(200, { status: 'ok' });

    await expect(apiGet('/health')).resolves.toEqual({ status: 'ok' });
  });

  it('prefixes the path with /api and sends the session cookie', async () => {
    respondWith(200, {});

    await apiGet('/health');

    expect(fetch).toHaveBeenCalledWith(
      '/api/health',
      expect.objectContaining({ method: 'GET', credentials: 'same-origin' }),
    );
  });

  it('throws an ApiError carrying the status and the message from the server', async () => {
    respondWith(403, { error: 'You do not have permission to do this' });

    await expect(apiGet('/projects/1')).rejects.toThrow(ApiError);
    await expect(apiGet('/projects/1')).rejects.toMatchObject({
      status: 403,
      message: 'You do not have permission to do this',
    });
  });

  it('falls back to a generic message when the error body is not JSON', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('<html>502</html>', { status: 502 })),
    );

    await expect(apiGet('/health')).rejects.toThrow('Request failed with status 502');
  });
});

describe('apiPost', () => {
  it('sends the body as JSON', async () => {
    respondWith(200, { user: { id: '1' } });

    await apiPost('/auth/login', { email: 'a@b.com', password: 'secret' });

    expect(fetch).toHaveBeenCalledWith(
      '/api/auth/login',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ email: 'a@b.com', password: 'secret' }),
      }),
    );
  });
});

describe('apiSendWithoutResponse', () => {
  function respondWithNoContent() {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(null, { status: 204 })),
    );
  }

  it('handles an empty 204 response instead of trying to parse it', async () => {
    respondWithNoContent();

    await expect(apiSendWithoutResponse('POST', '/auth/logout')).resolves.toBeUndefined();
  });

  it('sends a body when there is one, still expecting no answer', async () => {
    respondWithNoContent();

    await apiSendWithoutResponse('POST', '/test-runs/1/test-cases', { testCaseIds: ['a'] });

    expect(fetch).toHaveBeenCalledWith(
      '/api/test-runs/1/test-cases',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ testCaseIds: ['a'] }),
      }),
    );
  });

  it('works for PUT and PATCH as well as POST', async () => {
    respondWithNoContent();

    await expect(
      apiSendWithoutResponse('PUT', '/results/1', { status: 'PASSED' }),
    ).resolves.toBeUndefined();

    await expect(
      apiSendWithoutResponse('PATCH', '/test-runs/1', { completed: true }),
    ).resolves.toBeUndefined();
  });

  it('still throws on a failure', async () => {
    respondWith(401, { error: 'You must be signed in to do this' });

    await expect(apiSendWithoutResponse('POST', '/auth/logout')).rejects.toThrow(ApiError);
  });
});

describe('toUserMessage', () => {
  it('prefers the specific field problems over the generic wrapper message', () => {
    const error = new ApiError('Invalid request', 400, ['Password must be at least 12 characters']);

    expect(toUserMessage(error, 'fallback')).toBe('Password must be at least 12 characters');
  });

  it('joins several field problems so none of them is hidden', () => {
    const error = new ApiError('Invalid request', 400, ['Email is invalid', 'Name is required']);

    expect(toUserMessage(error, 'fallback')).toBe('Email is invalid Name is required');
  });

  it('uses the server message when there are no field problems', () => {
    expect(toUserMessage(new ApiError('Invalid email or password', 401), 'fallback')).toBe(
      'Invalid email or password',
    );
  });

  it('falls back when the failure was not an API error at all', () => {
    expect(toUserMessage(new TypeError('network down'), 'Could not sign in.')).toBe(
      'Could not sign in.',
    );
  });
});

describe('ApiError field errors', () => {
  it('collects the messages the server sent for individual fields', async () => {
    respondWith(400, {
      error: 'Invalid request',
      details: [{ path: 'password', message: 'Password must be at least 12 characters' }],
    });

    await expect(apiPost('/auth/register', {})).rejects.toMatchObject({
      fieldErrors: ['Password must be at least 12 characters'],
    });
  });

  it('is empty for failures that are not about the input', async () => {
    respondWith(401, { error: 'Invalid email or password' });

    await expect(apiPost('/auth/login', {})).rejects.toMatchObject({ fieldErrors: [] });
  });
});
