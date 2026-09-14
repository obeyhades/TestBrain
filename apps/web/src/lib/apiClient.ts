/**
 * The single place the frontend talks to the backend over HTTP.
 *
 * Feature files (project.api.ts, testCase.api.ts, ...) call this instead of using
 * fetch directly, so URL shape and error handling live in one file.
 */
export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

type ErrorBody = {
  error?: string;
};

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...init,
    // The dev server and nginx both proxy /api, so this is always a same-origin
    // request and the session cookie is sent automatically.
    credentials: 'same-origin',
  });

  if (!response.ok) {
    const body: ErrorBody = await response.json().catch(() => ({}));
    throw new ApiError(
      body.error ?? `Request failed with status ${response.status}`,
      response.status,
    );
  }

  return (await response.json()) as T;
}
