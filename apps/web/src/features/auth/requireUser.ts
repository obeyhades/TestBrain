import { redirect } from 'react-router';
import { fetchCurrentUser, fetchSetupStatus, type CurrentUser } from './auth.api';

/**
 * Guards every signed-in route.
 *
 * A visitor without a session goes to the sign-in screen, unless nobody has
 * registered yet: on a brand new instance there is no account to sign in with, so
 * the first visitor is sent to create the owner account instead.
 *
 * This is a convenience, not a security boundary. The API checks the session on
 * every request of its own accord.
 */
export async function requireUser(): Promise<CurrentUser> {
  const user = await fetchCurrentUser();

  if (user !== null) {
    return user;
  }

  const { needsSetup } = await fetchSetupStatus();

  throw redirect(needsSetup ? '/register' : '/login');
}
