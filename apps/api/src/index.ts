import { loadEnv } from './config/env.js';
import { buildServer } from './server.js';

// Validating configuration first means a missing SESSION_SECRET crashes the process
// at startup instead of silently producing a broken app.
const env = loadEnv();

const app = buildServer({ logger: true });

try {
  await app.listen({ port: env.PORT, host: '0.0.0.0' });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
