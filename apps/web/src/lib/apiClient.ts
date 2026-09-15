/**
 * The single place the frontend talks to the backend over HTTP.
 *
 * Feature files (auth.api.ts, project.api.ts, ...) call these instead of using fetch
 * directly, so URL shape, cookies and error handling live in one file.
 */
export class ApiError extends Error {
  readonly status: number;

  /**
   * Messages about individual fields, when the server rejected the input.
   * Empty for every other kind of failure.
   */
  readonly fieldErrors: string[];

  constructor(message: string, status: number, fieldErrors: string[] = []) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

type ErrorBody = {
  error?: string;
  details?: { path: string; message: string }[];
};

/**
 * The most useful sentence to put in front of a person after a failed request.
 *
 * A rejected form answers with a generic "Invalid request" plus the specific
 * problems, and the specific ones are the only part worth reading.
 */
export function toUserMessage(error: unknown, fallback: string): string {
  if (!(error instanceof ApiError)) {
    return fallback;
  }

  return error.fieldErrors.length > 0 ? error.fieldErrors.join(' ') : error.message;
}

async function request(path: string, init: RequestInit): Promise<Response> {
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
      (body.details ?? []).map((detail) => detail.message),
    );
  }

  return response;
}

export async function apiGet<T>(path: string): Promise<T> {
  const response = await request(path, { method: 'GET' });

  return (await response.json()) as T;
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const response = await request(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  return (await response.json()) as T;
}

/**
 * Separate from apiPost because some endpoints answer 204 No Content, and calling
 * response.json() on an empty body throws. Two small functions beat one that has to
 * guess which kind of response it is looking at.
 */
export async function apiPostWithoutResponse(path: string): Promise<void> {
  await request(path, { method: 'POST' });
}
