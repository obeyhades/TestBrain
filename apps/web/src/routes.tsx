import { createBrowserRouter } from 'react-router';
import { AppLayout } from './layouts/AppLayout';
import { SystemStatusPage, systemStatusLoader } from './features/system/SystemStatusPage';

/**
 * The whole route tree in one readable place. A route declares which component
 * renders and which loader fetches its data before that component is shown.
 */
export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      {
        path: '/',
        element: <SystemStatusPage />,
        loader: systemStatusLoader,
      },
    ],
  },
]);
