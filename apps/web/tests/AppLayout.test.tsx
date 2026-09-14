import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { AppLayout } from '../src/layouts/AppLayout';

describe('AppLayout', () => {
  it('renders the product name and the current page inside it', async () => {
    const router = createMemoryRouter([
      {
        element: <AppLayout />,
        children: [{ path: '/', element: <p>page content</p> }],
      },
    ]);

    render(<RouterProvider router={router} />);

    expect(await screen.findByText('TestBrain')).toBeInTheDocument();
    expect(await screen.findByText('page content')).toBeInTheDocument();
  });
});
