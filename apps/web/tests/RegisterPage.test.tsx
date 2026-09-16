import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { RegisterPage } from '../src/features/auth/RegisterPage';

function renderRegisterPage(needsSetup: boolean) {
  const router = createMemoryRouter(
    [{ path: '/register', element: <RegisterPage />, loader: () => ({ needsSetup }) }],
    { initialEntries: ['/register'] },
  );

  return render(<RouterProvider router={router} />);
}

describe('RegisterPage', () => {
  it('presents the first account as setting up the instance', async () => {
    renderRegisterPage(true);

    expect(await screen.findByRole('heading', { name: 'Set up TestBrain' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Sign in' })).not.toBeInTheDocument();
  });

  it('is an ordinary sign-up once the instance has an owner, with a way to sign in', async () => {
    renderRegisterPage(false);

    expect(await screen.findByRole('heading', { name: 'Create your account' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login');
  });
});
