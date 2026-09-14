import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'prisma/config';

// The Prisma CLI is a separate process, so it does not inherit the --env-file flag
// the API is started with. It reads the repository's .env itself. In CI there is no
// such file and DATABASE_URL is provided as a real environment variable.
const envFile = fileURLToPath(new URL('../../.env', import.meta.url));

if (existsSync(envFile)) {
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
