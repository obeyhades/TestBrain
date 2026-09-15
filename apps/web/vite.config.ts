/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 3000,
    // Fail instead of quietly moving to another port. Otherwise a forgotten dev
    // server keeps 3000, this one lands on 3001, and the browser shows stale code.
    strictPort: true,
    // The browser only ever talks to one origin. In production nginx does the same
    // thing, so the session cookie is first-party and there is no CORS setup anywhere.
    proxy: {
      '/api': 'http://localhost:4000',
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
  },
});
