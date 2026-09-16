import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestPrismaClient, resetDatabase } from '../helpers/testDatabase.js';
import {
  createUserAsInstanceAdmin,
  getUserForSessionToken,
  loginUser,
  logoutUser,
  registerUser,
} from '../../src/modules/auth/auth.service.js';
import { hashSessionToken } from '../../src/modules/auth/sessionToken.js';
import { ConflictError, ForbiddenError, UnauthorizedError } from '../../src/shared/errors.js';

const prisma = createTestPrismaClient();

const OWNER = {
  email: 'owner@example.com',
  name: 'Instance Owner',
  password: 'a-long-enough-passphrase',
};

const NOW = new Date('2026-01-01T12:00:00.000Z');

beforeEach(async () => {
  await resetDatabase(prisma);
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('registerUser', () => {
  it('makes the first account the owner of the instance', async () => {
    const user = await registerUser(prisma, OWNER);

    expect(user.email).toBe('owner@example.com');
    expect(user.isInstanceAdmin).toBe(true);
  });

  it('never returns the password hash to its caller', async () => {
    const user = await registerUser(prisma, OWNER);

    expect(user).not.toHaveProperty('passwordHash');
  });

  it('stores the password hashed, never in plain text', async () => {
    await registerUser(prisma, OWNER);

    const stored = await prisma.user.findUniqueOrThrow({ where: { email: OWNER.email } });

    expect(stored.passwordHash).not.toContain(OWNER.password);
    expect(stored.passwordHash.startsWith('$argon2id$')).toBe(true);
  });

  it('normalises the address so casing and spacing cannot create a second account', async () => {
    const user = await registerUser(prisma, { ...OWNER, email: '  Owner@Example.COM  ' });

    expect(user.email).toBe('owner@example.com');
  });

  it('makes every account after the first an ordinary user, not an administrator', async () => {
    await registerUser(prisma, OWNER);

    const second = await registerUser(prisma, { ...OWNER, email: 'someone.else@example.com' });

    expect(second.isInstanceAdmin).toBe(false);
  });

  it('refuses an address that already has an account', async () => {
    await registerUser(prisma, OWNER);

    await expect(registerUser(prisma, { ...OWNER, name: 'Impostor' })).rejects.toThrow(
      ConflictError,
    );
  });
});

describe('loginUser', () => {
  beforeEach(async () => {
    await registerUser(prisma, OWNER);
  });

  it('returns the user and a session token', async () => {
    const result = await loginUser(prisma, OWNER, NOW);

    expect(result.user.email).toBe(OWNER.email);
    expect(result.token).toBeTypeOf('string');
  });

  it('accepts the address in any casing', async () => {
    const result = await loginUser(prisma, { ...OWNER, email: 'OWNER@EXAMPLE.COM' }, NOW);

    expect(result.user.email).toBe(OWNER.email);
  });

  it('stores only the hash of the token, so a database dump is useless', async () => {
    const { token } = await loginUser(prisma, OWNER, NOW);

    const sessions = await prisma.session.findMany();

    expect(sessions).toHaveLength(1);
    expect(sessions[0]?.id).toBe(hashSessionToken(token));
    expect(sessions[0]?.id).not.toBe(token);
  });

  it('expires the session seven days after signing in', async () => {
    await loginUser(prisma, OWNER, NOW);

    const session = await prisma.session.findFirstOrThrow();

    expect(session.expiresAt).toEqual(new Date('2026-01-08T12:00:00.000Z'));
  });

  it('rejects the wrong password', async () => {
    await expect(
      loginUser(prisma, { ...OWNER, password: 'wrong-password-entirely' }, NOW),
    ).rejects.toThrow(UnauthorizedError);
  });

  it('gives an unknown address the same answer as a wrong password', async () => {
    const unknownAddress = loginUser(
      prisma,
      { email: 'nobody@example.com', password: OWNER.password },
      NOW,
    );
    const wrongPassword = loginUser(prisma, { ...OWNER, password: 'wrong-password' }, NOW);

    await expect(unknownAddress).rejects.toThrow('Invalid email or password');
    await expect(wrongPassword).rejects.toThrow('Invalid email or password');
  });

  it('creates no session when the password is wrong', async () => {
    await expect(loginUser(prisma, { ...OWNER, password: 'wrong' }, NOW)).rejects.toThrow();

    expect(await prisma.session.count()).toBe(0);
  });
});

describe('getUserForSessionToken', () => {
  it('resolves a valid token to its user', async () => {
    await registerUser(prisma, OWNER);
    const { token } = await loginUser(prisma, OWNER, NOW);

    const user = await getUserForSessionToken(prisma, token, NOW);

    expect(user?.email).toBe(OWNER.email);
  });

  it('returns null for a token nobody ever issued', async () => {
    expect(await getUserForSessionToken(prisma, 'made-up-token', NOW)).toBeNull();
  });

  it('returns null once the session has expired, and clears the row away', async () => {
    await registerUser(prisma, OWNER);
    const { token } = await loginUser(prisma, OWNER, NOW);

    const afterExpiry = new Date('2026-01-08T12:00:01.000Z');

    expect(await getUserForSessionToken(prisma, token, afterExpiry)).toBeNull();
    expect(await prisma.session.count()).toBe(0);
  });
});

describe('logoutUser', () => {
  it('makes the token stop working', async () => {
    await registerUser(prisma, OWNER);
    const { token } = await loginUser(prisma, OWNER, NOW);

    await logoutUser(prisma, token);

    expect(await getUserForSessionToken(prisma, token, NOW)).toBeNull();
    expect(await prisma.session.count()).toBe(0);
  });

  it('leaves other sessions of the same user alone', async () => {
    await registerUser(prisma, OWNER);
    const phone = await loginUser(prisma, OWNER, NOW);
    const laptop = await loginUser(prisma, OWNER, NOW);

    await logoutUser(prisma, phone.token);

    expect(await getUserForSessionToken(prisma, phone.token, NOW)).toBeNull();
    expect(await getUserForSessionToken(prisma, laptop.token, NOW)).not.toBeNull();
  });

  it('does not complain when the session is already gone', async () => {
    await expect(logoutUser(prisma, 'never-existed')).resolves.toBeUndefined();
  });

  it('takes the sessions with it when a user is deleted', async () => {
    await registerUser(prisma, OWNER);
    const { token } = await loginUser(prisma, OWNER, NOW);

    await prisma.user.deleteMany();

    expect(await getUserForSessionToken(prisma, token, NOW)).toBeNull();
  });
});

describe('createUserAsInstanceAdmin', () => {
  const NEWCOMER = {
    email: 'tester@example.com',
    name: 'Tess',
    password: 'another-long-passphrase',
  };

  it('lets the instance administrator create an account', async () => {
    const admin = await registerUser(prisma, OWNER);

    const created = await createUserAsInstanceAdmin(prisma, admin, NEWCOMER);

    expect(created).toMatchObject({ email: NEWCOMER.email, name: 'Tess' });
  });

  it('does not hand out instance administration', async () => {
    const admin = await registerUser(prisma, OWNER);

    const created = await createUserAsInstanceAdmin(prisma, admin, NEWCOMER);

    expect(created.isInstanceAdmin).toBe(false);
  });

  it('gives the new account a working password', async () => {
    const admin = await registerUser(prisma, OWNER);
    await createUserAsInstanceAdmin(prisma, admin, NEWCOMER);

    await expect(
      loginUser(prisma, { email: NEWCOMER.email, password: NEWCOMER.password }, NOW),
    ).resolves.toMatchObject({ user: { email: NEWCOMER.email } });
  });

  it('refuses somebody who is not an instance administrator', async () => {
    const admin = await registerUser(prisma, OWNER);
    const ordinary = await createUserAsInstanceAdmin(prisma, admin, NEWCOMER);

    await expect(
      createUserAsInstanceAdmin(prisma, ordinary, {
        email: 'third@example.com',
        name: 'Third',
        password: 'yet-another-passphrase',
      }),
    ).rejects.toThrow(ForbiddenError);
  });

  it('refuses an address that already has an account', async () => {
    const admin = await registerUser(prisma, OWNER);
    await createUserAsInstanceAdmin(prisma, admin, NEWCOMER);

    await expect(createUserAsInstanceAdmin(prisma, admin, NEWCOMER)).rejects.toThrow(ConflictError);
  });
});
