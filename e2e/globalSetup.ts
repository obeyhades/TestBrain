import { execSync } from 'node:child_process';

/**
 * The end-to-end tests get a database of their own and start from nothing, so the
 * very first screen is the one a brand new instance shows.
 *
 * migrate reset drops and rebuilds it, which is exactly what "start from nothing"
 * should mean.
 */
export const E2E_DATABASE_URL =
  process.env['E2E_DATABASE_URL'] ??
  'postgresql://testbrain:testbrain@localhost:5432/testbrain_e2e?schema=public';

export default function globalSetup(): void {
  try {
    execSync('npx prisma migrate reset --force --skip-seed --skip-generate', {
      cwd: 'apps/api',
      env: { ...process.env, DATABASE_URL: E2E_DATABASE_URL },
      stdio: 'pipe',
    });
  } catch {
    throw new Error(
      `Could not prepare the end-to-end database at ${E2E_DATABASE_URL}\n` +
        'Is PostgreSQL running? Start it with:  npm run db:up',
    );
  }
}
