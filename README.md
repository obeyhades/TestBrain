# TestBrain

Self-hosted QA and software testing platform for small development teams.

> **Status: in development.** The sections below describe what exists today.
> Features still to be built are listed under [Roadmap](#roadmap).

## What is TestBrain?

TestBrain is a place for a small team to keep its requirements, test cases, test runs,
defects and releases in one system, and to see how they connect:

```
Requirement -> Test Case -> Test Run -> Defect -> Release
```

It runs entirely on your own machine or server. There are no AI features, no external
services, and no paid dependencies.

## Why I Built It

_To be written._

## Features

_Not built yet — see [Roadmap](#roadmap)._

## Screenshots

_To be added once the UI exists._

## Architecture

A modular monolith: one frontend, one backend, one PostgreSQL database.

```
Browser -> web (nginx, serves the React build and proxies /api)
             -> api (Fastify)
                  -> postgres
```

The browser only ever talks to one origin, so the session cookie is first-party and
there is no CORS configuration anywhere. The Vite dev server proxies `/api` the same
way nginx does in production.

Inside the API, each request flows through four layers with one responsibility each:

| Layer      | Responsibility                                         |
| ---------- | ------------------------------------------------------ |
| Route      | Declare the endpoint, attach auth, call the controller |
| Controller | Validate input, call the service, shape the response   |
| Service    | Business rules, permissions, workflows                 |
| Repository | Database queries, nothing else                         |

Pure business logic (`calculatePassRate`, `determineReleaseStatus`, ...) lives in
`*.logic.ts` files with no I/O, so it can be unit tested directly.

## Tech Stack

**Frontend** — React, TypeScript, Vite, Tailwind CSS, React Aria Components, React Router
**Backend** — Node.js, TypeScript, Fastify, Zod
**Database** — PostgreSQL, Prisma
**Testing** — Vitest, React Testing Library, Playwright
**Infrastructure** — Docker, Docker Compose, GitHub Actions

## Database

PostgreSQL, accessed through Prisma with the `@prisma/adapter-pg` driver adapter.

The schema grows phase by phase. Today it covers authentication:

| Model     | Purpose                                                               |
| --------- | --------------------------------------------------------------------- |
| `User`    | Login identity, Argon2id password hash, instance-admin flag           |
| `Session` | A signed-in session, owned by a user and deleted along with that user |

Sessions live in the database rather than inside a JWT, so logging out genuinely
revokes access. A session's primary key is the SHA-256 hash of the token held in the
user's cookie: a leaked database dump therefore contains no usable session tokens.

The generated Prisma Client is a build artefact. It is not committed; `prisma generate`
recreates it and runs automatically after `npm install`.

```bash
npm run db:migrate -w @testbrain/api -- --name describe_your_change
```

## Testing Strategy

- **Unit** (Vitest) — pure business logic and permission functions. Fast, no database.
- **Integration** (Vitest) — the real Fastify app driven through `app.inject()` against a
  real PostgreSQL database. Prisma is not mocked: the point is to verify constraints and
  authorization, and a mock would only prove that a mock was called.
- **Component** (React Testing Library) — components with real interaction logic.
- **End to end** (Playwright) — a small number of whole-product flows.

Integration tests run against their own database (`testbrain_test`), created and
migrated automatically the first time the suite runs. They never touch development
data, and the suite refuses to start if it is pointed at the development database.
PostgreSQL must be running:

```bash
npm run db:up
```

```bash
npm test
```

## Self Hosting

_The production Docker Compose stack is added in a later phase._

## Docker

Development uses a single container for PostgreSQL; the API and web app run on the host
so reloads stay fast.

```bash
npm run db:up      # start PostgreSQL
npm run db:down    # stop it
```

## Development

Requires Node.js 20 or newer and Docker.

```bash
npm install
cp .env.example .env
```

Then start everything -- database, API and web app -- with one command:

```bash
npm run dev
```

The app is then at **http://localhost:3000**. The first visitor is asked to create
the account that owns the instance.

> **Adding a dependency?** Regenerate the lockfile with a clean install:
> `rm -rf node_modules package-lock.json && npm install`. npm can silently drop
> platform-specific optional dependencies during an incremental install, producing a
> lockfile that `npm ci` cannot install from.

Checks, all of which also run in CI:

```bash
npm run format:check && npm run lint && npm run typecheck && npm test && npm run build
```

## Engineering Principles

This project intentionally favours simple, predictable code over clever abstraction.

- **KISS** — the straightforward version wins unless a real problem demands otherwise.
- **Single Responsibility** — one function, one job; one file, one obvious purpose.
- **Separation of Concerns** — UI does not query the database; repositories do not
  contain business rules; services do not know about HTTP status codes.
- **Low Coupling** — business logic is plain TypeScript, usable from the API, from tests,
  and from a future script without rewriting it.
- **High Cohesion** — code is organised by feature, so everything about test runs lives
  together.
- **YAGNI** — features and abstractions are added when they are needed, not before.

Duplication is sometimes preferable to a bad abstraction. Where this codebase repeats
itself on purpose, the repetition is the point: it keeps each call site readable on its
own.

## Roadmap

Authentication · projects and members · requirements · test cases and steps · test runs
and results · defects · releases · production Docker stack · Playwright end-to-end tests.

Deliberately out of scope for the first version: integrations (GitHub, Jira, Slack),
email, real-time updates, configurable workflows, custom roles, a public API, file
uploads, and advanced analytics.

## Future Improvements

- Snapshot test case content into a test run, so editing a case later does not rewrite
  the history of past runs.
- Many-to-many links between requirements and test cases.
- Import automated test results (JUnit XML).
- Attach screenshots and logs to defects.

## License

MIT
