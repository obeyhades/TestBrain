import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { createTestPrismaClient, resetDatabase } from '../helpers/testDatabase.js';
import { buildTestServer } from '../helpers/testServer.js';
import { SESSION_COOKIE_NAME } from '../../src/modules/auth/sessionCookie.js';
import { loginUser } from '../../src/modules/auth/auth.service.js';

type InjectResponse = Awaited<ReturnType<FastifyInstance['inject']>>;

const prisma = createTestPrismaClient();
const app = buildTestServer(prisma);

const OWNER = {
  email: 'owner@example.com',
  name: 'Instance Owner',
  password: 'a-long-enough-passphrase',
};

function sessionCookie(response: InjectResponse): string {
  const cookie = response.cookies.find((candidate) => candidate.name === SESSION_COOKIE_NAME);

  if (cookie === undefined) {
    throw new Error('The response did not set a session cookie');
  }

  return `${cookie.name}=${cookie.value}`;
}

function register() {
  return app.inject({ method: 'POST', url: '/api/auth/register', payload: OWNER });
}

beforeEach(async () => {
  await resetDatabase(prisma);
});

afterAll(async () => {
  await app.close();
});

describe('POST /api/auth/register', () => {
  it('creates the owner account and signs them in', async () => {
    const response = await register();

    expect(response.statusCode).toBe(201);
    expect(response.json().user).toMatchObject({
      email: OWNER.email,
      name: OWNER.name,
      isInstanceAdmin: true,
    });
  });

  it('never puts the password hash in the response', async () => {
    const response = await register();

    expect(response.body).not.toContain('passwordHash');
    expect(response.body).not.toContain(OWNER.password);
  });

  it('sets a cookie the page cannot read and the browser will not leak', async () => {
    const response = await register();
    const cookie = response.cookies.find((c) => c.name === SESSION_COOKIE_NAME);

    expect(cookie?.httpOnly).toBe(true);
    expect(cookie?.sameSite).toBe('Lax');
    expect(cookie?.path).toBe('/');
  });

  it('rejects a password that is too short, and says which field is wrong', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { ...OWNER, password: 'short' },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().details).toContainEqual(expect.objectContaining({ path: 'password' }));
  });

  it('rejects a body that is missing fields', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email: OWNER.email },
    });

    expect(response.statusCode).toBe(400);
  });

  it('lets a second person sign up, as an ordinary user', async () => {
    await register();

    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { ...OWNER, email: 'second@example.com' },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json().user.isInstanceAdmin).toBe(false);
  });

  it('answers 409 for an address that already has an account', async () => {
    await register();

    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: OWNER,
    });

    expect(response.statusCode).toBe(409);
  });
});

describe('GET /api/auth/setup-status', () => {
  it('reports that a brand new instance still needs an owner', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/auth/setup-status' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ needsSetup: true });
  });

  it('reports that setup is done once somebody has registered', async () => {
    await register();

    const response = await app.inject({ method: 'GET', url: '/api/auth/setup-status' });

    expect(response.json()).toEqual({ needsSetup: false });
  });

  it('answers without a session, since nobody can sign in before setup', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/auth/setup-status' });

    expect(response.statusCode).not.toBe(401);
  });

  it('reveals nothing beyond whether setup is needed', async () => {
    await register();

    const response = await app.inject({ method: 'GET', url: '/api/auth/setup-status' });

    expect(Object.keys(response.json())).toEqual(['needsSetup']);
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    await register();
  });

  it('signs in with the right password', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: OWNER.email, password: OWNER.password },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().user.email).toBe(OWNER.email);
    expect(sessionCookie(response)).toContain(SESSION_COOKIE_NAME);
  });

  it('answers 401 for a wrong password', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: OWNER.email, password: 'wrong-password' },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json().error).toBe('Invalid email or password');
  });

  it('answers 401 for an unknown address, with the same message', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'nobody@example.com', password: OWNER.password },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json().error).toBe('Invalid email or password');
  });
});

describe('GET /api/auth/me', () => {
  it('returns the signed-in user', async () => {
    const registered = await register();

    const response = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: { cookie: sessionCookie(registered) },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().user.email).toBe(OWNER.email);
  });

  it('refuses a request with no cookie at all', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/auth/me' });

    expect(response.statusCode).toBe(401);
  });

  it('refuses a made-up cookie value', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: { cookie: `${SESSION_COOKIE_NAME}=not-a-real-token` },
    });

    expect(response.statusCode).toBe(401);
  });

  it('refuses a token that is genuinely valid but carries no signature', async () => {
    await register();
    const { token } = await loginUser(
      prisma,
      { email: OWNER.email, password: OWNER.password },
      new Date(),
    );

    // This token exists in the database and has not expired. It is refused purely
    // because it is unsigned, which is what proves the signature is load-bearing.
    const response = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: { cookie: `${SESSION_COOKIE_NAME}=${token}` },
    });

    expect(response.statusCode).toBe(401);
  });

  it('refuses a cookie whose signature has been replaced', async () => {
    const registered = await register();
    const valid = sessionCookie(registered);
    const signatureStart = valid.lastIndexOf('.');

    expect(signatureStart).toBeGreaterThan(0);

    const response = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: { cookie: `${valid.slice(0, signatureStart)}.notthesignature` },
    });

    expect(response.statusCode).toBe(401);
  });

  it('refuses once the session has been signed out', async () => {
    const registered = await register();
    const cookie = sessionCookie(registered);

    await app.inject({ method: 'POST', url: '/api/auth/logout', headers: { cookie } });

    const response = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: { cookie },
    });

    expect(response.statusCode).toBe(401);
  });
});

describe('POST /api/auth/logout', () => {
  it('ends the session and clears the cookie', async () => {
    const registered = await register();

    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/logout',
      headers: { cookie: sessionCookie(registered) },
    });

    expect(response.statusCode).toBe(204);
    expect(await prisma.session.count()).toBe(0);
  });

  it('succeeds even with no session, so a stale tab is not stuck', async () => {
    const response = await app.inject({ method: 'POST', url: '/api/auth/logout' });

    expect(response.statusCode).toBe(204);
  });
});
