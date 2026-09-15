import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '../../src/database/prisma.js';
import { buildServer } from '../../src/server.js';

/** Any value will do: nothing outside the test process ever sees these cookies. */
const TEST_SESSION_SECRET = 'test-session-secret-that-is-long-enough';

export function buildTestServer(prisma: PrismaClient): FastifyInstance {
  return buildServer({
    logger: false,
    prisma,
    sessionSecret: TEST_SESSION_SECRET,
    // No HTTPS in the test process, so requiring a secure cookie would mean the
    // browser-equivalent never sends it back.
    secureCookies: false,
  });
}
