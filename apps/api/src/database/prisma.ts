import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';

export type { PrismaClient };

/**
 * Creates the database client.
 *
 * The connection string is a parameter rather than a module-level read of
 * process.env, so there is no hidden global: index.ts builds the client from the
 * validated configuration and passes it down, and tests can build their own
 * pointing at a throwaway database.
 *
 * One client per process. Each one owns a connection pool, and no connection is
 * opened until the first query runs.
 */
export function createPrismaClient(connectionString: string): PrismaClient {
  const adapter = new PrismaPg({ connectionString });

  return new PrismaClient({ adapter });
}
