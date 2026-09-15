# Testing

TestBrain is a tool for running tests, so its own suite is part of the argument.

```bash
npm test          # unit, integration and component tests
npm run test:e2e  # the browser tests
```

## The shape of the suite

| Kind        | Where                        | What it covers                               | Needs a database |
| ----------- | ---------------------------- | -------------------------------------------- | ---------------- |
| Unit        | `apps/api/tests/unit`        | pure business logic and permissions          | no               |
| Integration | `apps/api/tests/integration` | services and endpoints, through the real app | yes              |
| Component   | `apps/web/tests`             | components with real interaction logic       | no               |
| End to end  | `e2e`                        | the product, in a browser                    | yes              |

Most of the weight is at the bottom. The end-to-end tests are deliberately few:
they are the slowest and most fragile, and they earn their place by covering the
wiring nothing else does.

## Prisma is not mocked

The integration tests run against a real PostgreSQL database. The point of them is
to prove that constraints, cascades and authorization behave, and a mock would only
prove that a mock was called.

They use their own database (`testbrain_test`), created and migrated the first time
the suite runs. Because the helper empties every table between tests, two guards
protect development data:

- the suite refuses to start if it is pointed at the development database
- `prisma.config.ts` lets a real environment variable win over `.env`

Test files run one after another rather than in parallel, because they share that
one database. Running them in parallel made the suite flaky rather than failing
outright, which is worse.

## What the tests are for

Some examples of behaviour that is pinned down rather than assumed:

- passwords are hashed with Argon2id, verified by reading the parameters back out
  of a real hash rather than trusting the documentation
- a session token is refused if it is valid but unsigned, which is what proves the
  signature is load-bearing
- blocked and not-yet-run tests are left out of the pass rate
- a project always keeps at least one administrator
- a test case id from another project cannot be read, changed or deleted

## Tests with teeth

A test that passes for the wrong reason is worse than no test. Several of the
security tests here were checked by deliberately breaking the code and confirming
they went red:

| Removed                                 | Tests that failed |
| --------------------------------------- | ----------------- |
| the membership check in `updateProject` | 5                 |
| `projectId` from the requirement lookup | 3                 |
| cookie signature validation             | 1                 |

The first version of the cookie signature test passed with the check removed. It
was replaced with one that sends a genuinely valid but unsigned token.

## Continuous integration

Every push runs formatting, lint, types, the full suite and a production build
against a PostgreSQL service container, on Linux. The suite has to pass somewhere
other than the machine it was written on.
