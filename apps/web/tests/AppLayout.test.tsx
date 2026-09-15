import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { AppLayout } from '../src/layouts/AppLayout';
import type { CurrentUser } from '../src/features/auth/auth.api';

const USER: CurrentUser = {
  id: 'user-1',
  email: 'owner@example.com',
  name: 'Instance Owner',
  isInstanceAdmin: true,
};

function renderAppLayout() {
  const router = createMemoryRouter(
    [
      {
        element: <AppLayout />,
        loader: () => USER,
        children: [{ path: '/', element: <p>page content</p> }],
      },
    ],
    { initialEntries: ['/'] },
  );

  return render(<RouterProvider router={router} />);
}

describe('AppLayout', () => {
  it('renders the product name and the current page inside it', async () => {
    renderAppLayout();

    expect(await screen.findByText('TestBrain')).toBeInTheDocument();
    expect(screen.getByText('page content')).toBeInTheDocument();
  });

  it('shows who is signed in and offers a way out', async () => {
    renderAppLayout();

    expect(await screen.findByText('Instance Owner')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument();
  });
});
