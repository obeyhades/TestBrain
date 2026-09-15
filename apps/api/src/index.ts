import { loadEnv } from './config/env.js';
import { createPrismaClient } from './database/prisma.js';
import { buildServer } from './server.js';

// Validating configuration first means a missing SESSION_SECRET crashes the process
// at startup instead of silently producing a broken app.
const env = loadEnv();

const prisma = createPrismaClient(env.DATABASE_URL);

const app = buildServer({
  logger: true,
  prisma,
  sessionSecret: env.SESSION_SECRET,
  secureCookies: env.NODE_ENV === 'production',
});

try {
  await app.listen({ port: env.PORT, host: '0.0.0.0' });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
