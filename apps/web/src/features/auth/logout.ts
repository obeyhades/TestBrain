import { redirect } from 'react-router';
import { logout } from './auth.api';

/**
 * Signing out is a route with an action and no page, so the header can submit a
 * plain form to it instead of wiring up navigation by hand.
 */
export async function logoutAction() {
  await logout();

  return redirect('/login');
}
