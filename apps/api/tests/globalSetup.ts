import { execSync } from 'node:child_process';
import { TEST_DATABASE_URL } from './helpers/testDatabase.js';

/**
 * Brings the test database up to date once, before any test runs.
 *
 * Migrations are applied rather than the schema being pushed, so the tests exercise
 * the same SQL that a real deployment does.
 */
export default function setup(): void {
  try {
    execSync('npx prisma migrate deploy', {
      env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
      stdio: 'pipe',
    });
  } catch {
    throw new Error(
      `Could not prepare the test database at ${TEST_DATABASE_URL}\n` +
        'Is PostgreSQL running? Start it with:  npm run db:up',
    );
  }
}
