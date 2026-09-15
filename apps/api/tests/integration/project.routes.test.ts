import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { createTestPrismaClient, resetDatabase } from '../helpers/testDatabase.js';
import { buildTestServer } from '../helpers/testServer.js';
import { SESSION_COOKIE_NAME } from '../../src/modules/auth/sessionCookie.js';

type InjectResponse = Awaited<ReturnType<FastifyInstance['inject']>>;

const prisma = createTestPrismaClient();
const app = buildTestServer(prisma);

const OWNER = {
  email: 'owner@example.com',
  name: 'Instance Owner',
  password: 'a-long-enough-passphrase',
};

function cookieFrom(response: InjectResponse): string {
  const cookie = response.cookies.find((candidate) => candidate.name === SESSION_COOKIE_NAME);

  if (cookie === undefined) {
    throw new Error('The response did not set a session cookie');
  }

  return `${cookie.name}=${cookie.value}`;
}

/** Registers the instance owner and returns their session cookie. */
async function signUpOwner(): Promise<string> {
  return cookieFrom(
    await app.inject({ method: 'POST', url: '/api/auth/register', payload: OWNER }),
  );
}

/** Has the owner create a colleague's account, then signs that colleague in. */
async function signUpColleague(ownerCookie: string, email: string): Promise<string> {
  await app.inject({
    method: 'POST',
    url: '/api/auth/users',
    headers: { cookie: ownerCookie },
    payload: { email, name: 'Colleague', password: 'another-long-passphrase' },
  });

  return cookieFrom(
    await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email, password: 'another-long-passphrase' },
    }),
  );
}

async function createProject(cookie: string, name: string): Promise<string> {
  const response = await app.inject({
    method: 'POST',
    url: '/api/projects',
    headers: { cookie },
    payload: { name },
  });

  return response.json().project.id;
}

beforeEach(async () => {
  await resetDatabase(prisma);
});

afterAll(async () => {
  await app.close();
});

describe('signing in is required', () => {
  it('refuses to list projects without a session', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/projects' });

    expect(response.statusCode).toBe(401);
  });

  it('refuses to create a project without a session', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/projects',
      payload: { name: 'Sneaky' },
    });

    expect(response.statusCode).toBe(401);
  });
});

describe('POST /api/projects', () => {
  it('creates a project and returns it', async () => {
    const cookie = await signUpOwner();

    const response = await app.inject({
      method: 'POST',
      url: '/api/projects',
      headers: { cookie },
      payload: { name: 'Checkout redesign', description: 'Q3 work' },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json().project).toMatchObject({
      name: 'Checkout redesign',
      description: 'Q3 work',
    });
  });

  it('rejects an empty name', async () => {
    const cookie = await signUpOwner();

    const response = await app.inject({
      method: 'POST',
      url: '/api/projects',
      headers: { cookie },
      payload: { name: '   ' },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().details).toContainEqual(expect.objectContaining({ path: 'name' }));
  });
});

describe('GET /api/projects', () => {
  it('lists only the projects the signed-in person belongs to', async () => {
    const ownerCookie = await signUpOwner();
    const colleagueCookie = await signUpColleague(ownerCookie, 'colleague@example.com');

    await createProject(ownerCookie, 'Mine');
    await createProject(colleagueCookie, 'Theirs');

    const response = await app.inject({
      method: 'GET',
      url: '/api/projects',
      headers: { cookie: ownerCookie },
    });

    expect(response.json().projects.map((project: { name: string }) => project.name)).toEqual([
      'Mine',
    ]);
  });
});

describe('one team cannot reach another team data', () => {
  it('answers 404, not 403, when reading somebody else project', async () => {
    const ownerCookie = await signUpOwner();
    const colleagueCookie = await signUpColleague(ownerCookie, 'colleague@example.com');
    const theirs = await createProject(colleagueCookie, 'Theirs');

    const response = await app.inject({
      method: 'GET',
      url: `/api/projects/${theirs}`,
      headers: { cookie: ownerCookie },
    });

    // 403 would confirm that this project id is real.
    expect(response.statusCode).toBe(404);
  });

  it('refuses to rename somebody else project, and leaves it untouched', async () => {
    const ownerCookie = await signUpOwner();
    const colleagueCookie = await signUpColleague(ownerCookie, 'colleague@example.com');
    const theirs = await createProject(colleagueCookie, 'Theirs');

    const attempt = await app.inject({
      method: 'PATCH',
      url: `/api/projects/${theirs}`,
      headers: { cookie: ownerCookie },
      payload: { name: 'Hijacked' },
    });

    expect(attempt.statusCode).toBe(404);

    const stillTheirs = await app.inject({
      method: 'GET',
      url: `/api/projects/${theirs}`,
      headers: { cookie: colleagueCookie },
    });

    expect(stillTheirs.json().project.name).toBe('Theirs');
  });

  it('refuses to read somebody else member list', async () => {
    const ownerCookie = await signUpOwner();
    const colleagueCookie = await signUpColleague(ownerCookie, 'colleague@example.com');
    const theirs = await createProject(colleagueCookie, 'Theirs');

    const response = await app.inject({
      method: 'GET',
      url: `/api/projects/${theirs}/members`,
      headers: { cookie: ownerCookie },
    });

    expect(response.statusCode).toBe(404);
  });

  it('refuses to add themselves to somebody else project', async () => {
    const ownerCookie = await signUpOwner();
    const colleagueCookie = await signUpColleague(ownerCookie, 'colleague@example.com');
    const theirs = await createProject(colleagueCookie, 'Theirs');

    const response = await app.inject({
      method: 'POST',
      url: `/api/projects/${theirs}/members`,
      headers: { cookie: ownerCookie },
      payload: { email: OWNER.email, role: 'ADMIN' },
    });

    expect(response.statusCode).toBe(404);
  });
});

describe('members over HTTP', () => {
  it('adds a member and then lists them', async () => {
    const ownerCookie = await signUpOwner();
    await signUpColleague(ownerCookie, 'tester@example.com');
    const projectId = await createProject(ownerCookie, 'Checkout redesign');

    const added = await app.inject({
      method: 'POST',
      url: `/api/projects/${projectId}/members`,
      headers: { cookie: ownerCookie },
      payload: { email: 'tester@example.com', role: 'QA' },
    });

    expect(added.statusCode).toBe(201);

    const listed = await app.inject({
      method: 'GET',
      url: `/api/projects/${projectId}/members`,
      headers: { cookie: ownerCookie },
    });

    expect(listed.json().members).toHaveLength(2);
  });

  it('stops a tester from adding anybody', async () => {
    const ownerCookie = await signUpOwner();
    const testerCookie = await signUpColleague(ownerCookie, 'tester@example.com');
    await signUpColleague(ownerCookie, 'third@example.com');
    const projectId = await createProject(ownerCookie, 'Checkout redesign');

    await app.inject({
      method: 'POST',
      url: `/api/projects/${projectId}/members`,
      headers: { cookie: ownerCookie },
      payload: { email: 'tester@example.com', role: 'QA' },
    });

    const response = await app.inject({
      method: 'POST',
      url: `/api/projects/${projectId}/members`,
      headers: { cookie: testerCookie },
      payload: { email: 'third@example.com', role: 'DEVELOPER' },
    });

    expect(response.statusCode).toBe(403);
  });

  it('refuses to remove the last administrator', async () => {
    const ownerCookie = await signUpOwner();
    const projectId = await createProject(ownerCookie, 'Checkout redesign');
    const members = await app.inject({
      method: 'GET',
      url: `/api/projects/${projectId}/members`,
      headers: { cookie: ownerCookie },
    });
    const ownerUserId = members.json().members[0].userId;

    const response = await app.inject({
      method: 'DELETE',
      url: `/api/projects/${projectId}/members/${ownerUserId}`,
      headers: { cookie: ownerCookie },
    });

    expect(response.statusCode).toBe(409);
  });
});

describe('POST /api/auth/users', () => {
  it('lets the instance owner create a colleague account', async () => {
    const ownerCookie = await signUpOwner();

    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/users',
      headers: { cookie: ownerCookie },
      payload: {
        email: 'colleague@example.com',
        name: 'Colleague',
        password: 'another-long-passphrase',
      },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json().user.isInstanceAdmin).toBe(false);
  });

  it('refuses somebody who is not an instance administrator', async () => {
    const ownerCookie = await signUpOwner();
    const colleagueCookie = await signUpColleague(ownerCookie, 'colleague@example.com');

    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/users',
      headers: { cookie: colleagueCookie },
      payload: { email: 'third@example.com', name: 'Third', password: 'yet-another-passphrase' },
    });

    expect(response.statusCode).toBe(403);
  });

  it('refuses without a session', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/users',
      payload: { email: 'x@example.com', name: 'X', password: 'a-long-enough-passphrase' },
    });

    expect(response.statusCode).toBe(401);
  });
});
