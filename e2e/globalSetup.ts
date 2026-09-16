import { execSync } from 'node:child_process';

/**
 * The end-to-end tests get a database of their own and start from nothing, so the
 * very first screen is the one a brand new instance shows.
 *
 * Two steps, both safe to repeat: bring the schema up to date, then empty every
 * table. Dropping the database outright would also work, but wiping a database is
 * a much bigger hammer than "start from no data" needs.
 */
export const E2E_DATABASE_URL =
  process.env['E2E_DATABASE_URL'] ??
  'postgresql://testbrain:testbrain@localhost:5432/testbrain_e2e?schema=public';

function runInApi(command: string, describe: string): void {
  try {
    execSync(command, {
      cwd: 'apps/api',
      env: { ...process.env, DATABASE_URL: E2E_DATABASE_URL },
      stdio: 'pipe',
    });
  } catch (error) {
    // The original output is repeated on purpose. An earlier version swallowed it
    // and always blamed PostgreSQL, which sent me looking in the wrong place.
    const stderr = error instanceof Error && 'stderr' in error ? String(error.stderr) : '';
    const stdout = error instanceof Error && 'stdout' in error ? String(error.stdout) : '';

    throw new Error(
      `${describe} failed against ${E2E_DATABASE_URL}\n` +
        'If PostgreSQL is not running, start it with:  npm run db:up\n\n' +
        `${stderr}${stdout}`.trim(),
      { cause: error },
    );
  }
}

export default function globalSetup(): void {
  runInApi('npx prisma migrate deploy', 'Applying migrations');
  runInApi('npx prisma db execute --file ../../e2e/resetDatabase.sql', 'Emptying the tables');
}
