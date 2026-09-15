import { createBrowserRouter } from 'react-router';
import { AppLayout } from './layouts/AppLayout';
import { LoginPage, loginAction, loginPageLoader } from './features/auth/LoginPage';
import { RegisterPage, registerAction, registerPageLoader } from './features/auth/RegisterPage';
import { logoutAction } from './features/auth/logout';
import { requireUser } from './features/auth/requireUser';
import { SystemStatusPage, systemStatusLoader } from './features/system/SystemStatusPage';

/**
 * The whole route tree in one readable place.
 *
 * A route declares which component renders, which loader fetches its data before
 * that component is shown, and which action handles its form submissions.
 *
 * Everything below the layout route is behind requireUser, so a new signed-in page
 * is added as a child and is protected without any further work.
 */
export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
    loader: loginPageLoader,
    action: loginAction,
  },
  {
    path: '/register',
    element: <RegisterPage />,
    loader: registerPageLoader,
    action: registerAction,
  },
  {
    path: '/logout',
    action: logoutAction,
  },
  {
    element: <AppLayout />,
    loader: requireUser,
    children: [
      {
        path: '/',
        element: <SystemStatusPage />,
        loader: systemStatusLoader,
      },
    ],
  },
]);
