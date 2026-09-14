import { hash, verify } from '@node-rs/argon2';

/**
 * Argon2id parameters: 19 MiB of memory, two passes, single-threaded.
 *
 * These are OWASP's recommended settings. They are written out here rather than
 * left implicit so that a future version of the library cannot quietly weaken
 * every password in the system by changing its defaults.
 *
 * The algorithm itself is the library default. It is not passed explicitly because
 * the Algorithm enum cannot be read reliably at runtime -- password.test.ts reads
 * the algorithm back out of a real hash instead of trusting the documentation.
 */
const HASHING_OPTIONS = {
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
};

export function hashPassword(plainTextPassword: string): Promise<string> {
  return hash(plainTextPassword, HASHING_OPTIONS);
}

/**
 * An Argon2 hash records the parameters it was produced with, so verification does
 * not take HASHING_OPTIONS: passwords hashed under older settings keep working if
 * those settings are ever raised.
 */
export function verifyPassword(storedHash: string, plainTextPassword: string): Promise<boolean> {
  return verify(storedHash, plainTextPassword);
}
