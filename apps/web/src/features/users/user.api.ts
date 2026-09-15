import { apiPost } from '../../lib/apiClient';
import type { CurrentUser } from '../auth/auth.api';

export function createUser(input: {
  email: string;
  name: string;
  password: string;
}): Promise<{ user: CurrentUser }> {
  return apiPost('/auth/users', input);
}
