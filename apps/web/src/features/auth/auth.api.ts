import { ApiError, apiGet, apiPost, apiSendWithoutResponse } from '../../lib/apiClient';

export type CurrentUser = {
  id: string;
  email: string;
  name: string;
  isInstanceAdmin: boolean;
};

type UserResponse = {
  user: CurrentUser;
};

/**
 * Returns null when nobody is signed in.
 *
 * A 401 here is the normal answer for a visitor without a session, not a failure,
 * so it becomes null rather than an exception the caller has to catch.
 */
export async function fetchCurrentUser(): Promise<CurrentUser | null> {
  try {
    const { user } = await apiGet<UserResponse>('/auth/me');

    return user;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return null;
    }

    throw error;
  }
}

export function fetchSetupStatus(): Promise<{ needsSetup: boolean }> {
  return apiGet('/auth/setup-status');
}

export function login(input: { email: string; password: string }): Promise<UserResponse> {
  return apiPost('/auth/login', input);
}

export function register(input: {
  email: string;
  name: string;
  password: string;
}): Promise<UserResponse> {
  return apiPost('/auth/register', input);
}

export function logout(): Promise<void> {
  return apiSendWithoutResponse('POST', '/auth/logout');
}
