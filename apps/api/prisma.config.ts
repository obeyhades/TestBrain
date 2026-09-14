import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'prisma/config';

// The Prisma CLI is a separate process, so it does not inherit the --env-file flag
// the API is started with. It reads the repository's .env itself.
const envFile = fileURLToPath(new URL('../../.env', import.meta.url));

// A real environment variable always wins over the file. This matters: the test
// suite points DATABASE_URL at a throwaway database and deletes every row in it,
// so .env must never be able to override that back to the development database.
if (!process.env['DATABASE_URL'] && existsSync(envFile)) {
  process.loadEnvFile(envFile);
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    // Read process.env directly instead of using Prisma's env() helper, which throws
    // when the variable is missing. Generating the client does not need a database,
    // and `prisma generate` runs on install: with env() a plain `npm install` would
    // fail before anyone has had a chance to create their .env file.
    url: process.env['DATABASE_URL'] ?? '',
  },
});
