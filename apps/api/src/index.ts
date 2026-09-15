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
  // Tied to the address the app is served from, not to NODE_ENV. A Secure cookie
  // is never sent over plain HTTP, so deciding this by environment would silently
  // break sign-in for anybody self-hosting on http://192.168.x.x or a LAN name.
  secureCookies: env.APP_URL.startsWith('https://'),
});

try {
  await app.listen({ port: env.PORT, host: '0.0.0.0' });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
