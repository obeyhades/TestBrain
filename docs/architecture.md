# Architecture

TestBrain is a modular monolith: one frontend, one backend, one database.

```
Browser ──► web (nginx)
              serves the React build
              proxies /api ──► api (Fastify) ──► postgres
```

The browser only ever talks to one origin. That is why the session cookie is
first-party and there is no CORS configuration anywhere in the project. The Vite
dev server proxies `/api` exactly the way nginx does in production, so development
and production behave the same.

## Why a monolith

Every feature reads and writes the same relational data. Splitting it into services
would turn ordinary joins into network calls and introduce consistency problems the
product does not have. One deployable unit, one transaction boundary.

## The four layers

A request moves through four files, each with one responsibility:

| Layer      | Responsibility                                         | Knows about |
| ---------- | ------------------------------------------------------ | ----------- |
| Route      | Declare the endpoint, attach auth, call the controller | HTTP        |
| Controller | Validate input, call the service, shape the response   | HTTP        |
| Service    | Business rules, permissions, workflows                 | the domain  |
| Repository | Database queries                                       | Prisma      |

Services throw `NotFoundError`, `ForbiddenError` and friends. One error handler
turns them into status codes, and it is the only place in the API that knows what
a 403 is.

Not every module has all four files. `auth` has no repository worth the name, and
`health` is a single route. A layer is created when it has something to do.

## Pure business logic

The rules that matter live in `*.logic.ts` files with no I/O:

- `calculateTestRunSummary` and `calculatePassRate` — how a run is going
- `determineReleaseQuality` — whether a version can ship
- `numberTestSteps` — the order of steps in a test case
- `permissions.ts` — what each project role may do

They take plain values and return plain values, which is why they are covered by
fast unit tests and could be called from a script tomorrow without changing.

## Composition root

`apps/api/src/server.ts` is the only place that builds a database client. Routes
receive what they need as an argument:

```ts
app.register(projectRoutes({ prisma: options.prisma }), { prefix: '/api' });
```

No module reaches for a global client or reads configuration on its own. That is
also what lets the integration tests build the real app around a throwaway
database.

## Authorization

Every project operation goes through one function:

```ts
const role = await requireProjectRole(prisma, projectId, user.id);
if (!canEditTestCases(role)) throw new ForbiddenError();
```

It exists as one function because forgetting it is the bug that matters: a service
that skips it exposes another team's data. Somebody who is not a member is told the
project does not exist rather than that it is off limits, because a 403 would
confirm which project ids are real.

Every lookup below a project is scoped by `projectId` as well as by id. A test case
id on its own is not a key to anything.

The frontend hides buttons people cannot use. That is a convenience. The API checks
every request regardless.

## Frontend

Organised by feature. Route loaders fetch data and route actions handle form
submissions, so pages hold no loading or error state of their own.

```
features/testRuns/
  testRun.api.ts          the endpoints this feature uses
  TestRunsPage.tsx        page + loader + action
  TestRunDetailPage.tsx
  TestRunSummaryBar.tsx
```

`lib/apiClient.ts` is the single place the frontend speaks HTTP.

React Aria is used for the one thing that is genuinely hard to get right by hand:
dialogs. Forms are plain `label`, `input` and `select`, which are already
accessible.
