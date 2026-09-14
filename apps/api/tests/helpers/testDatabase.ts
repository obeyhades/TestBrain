import { createPrismaClient, type PrismaClient } from '../../src/database/prisma.js';

/**
 * The tests get a database of their own, so running them can never touch
 * development data. CI overrides this to point at its own PostgreSQL service.
 */
export const TEST_DATABASE_URL =
  process.env['TEST_DATABASE_URL'] ??
  'postgresql://testbrain:testbrain@localhost:5432/testbrain_test?schema=public';

// resetDatabase deletes every row, so being pointed at the development database
// would destroy real work. Refuse to start rather than find out afterwards.
if (TEST_DATABASE_URL === process.env['DATABASE_URL']) {
  throw new Error(
    'TEST_DATABASE_URL is the same as DATABASE_URL. The tests empty every table, so they must use a separate database.',
  );
}

export function createTestPrismaClient(): PrismaClient {
  return createPrismaClient(TEST_DATABASE_URL);
}

/** Empties every table so each test starts from a known state. */
export async function resetDatabase(prisma: PrismaClient): Promise<void> {
  // Sessions first: they reference users.
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();
}
