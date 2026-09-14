import { describe, expect, it } from 'vitest';
import { parseOptions } from '@node-rs/argon2';
import { hashPassword, verifyPassword } from '../../src/modules/auth/password.js';

const PASSWORD = 'correct horse battery staple';

describe('hashPassword', () => {
  it('never returns the password itself', async () => {
    const stored = await hashPassword(PASSWORD);

    expect(stored).not.toContain(PASSWORD);
  });

  it('produces a different hash every time, because each one is salted', async () => {
    const first = await hashPassword(PASSWORD);
    const second = await hashPassword(PASSWORD);

    expect(first).not.toBe(second);
  });

  it('uses Argon2id with the parameters this project pins', async () => {
    const stored = await hashPassword(PASSWORD);
    const used = parseOptions(stored);

    // 2 is Argon2id. Reading it back out of a real hash means the algorithm is
    // verified rather than assumed from the library's documented default.
    expect(used.algorithm).toBe(2);
    expect(used.memoryCost).toBe(19456);
    expect(used.timeCost).toBe(2);
    expect(used.parallelism).toBe(1);
  });
});

describe('verifyPassword', () => {
  it('accepts the password the hash was made from', async () => {
    const stored = await hashPassword(PASSWORD);

    await expect(verifyPassword(stored, PASSWORD)).resolves.toBe(true);
  });

  it('rejects a different password', async () => {
    const stored = await hashPassword(PASSWORD);

    await expect(verifyPassword(stored, 'not the password')).resolves.toBe(false);
  });

  it('rejects a password that differs only in case', async () => {
    const stored = await hashPassword(PASSWORD);

    await expect(verifyPassword(stored, PASSWORD.toUpperCase())).resolves.toBe(false);
  });
});
