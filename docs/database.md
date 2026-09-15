# Database

PostgreSQL, accessed through Prisma with the `@prisma/adapter-pg` driver adapter.
The schema lives in `apps/api/prisma/schema.prisma`.

## The shape of it

```
User ──< ProjectMember >── Project
User ──< Session

Project ──< Requirement ──< TestCase ──< TestStep
Project ──< TestCase          │
Project ──< TestRun ──< TestResult >── TestCase
Project ──< Defect
Project ──< Release ──< TestRun
```

Reading it as a sentence: a project has requirements; a requirement is verified by
test cases; a test case is made of steps; a test run records a result per test
case; a failed result becomes a defect; a release collects the runs that decide
whether it ships.

## Decisions worth explaining

**A role belongs to a membership, not to a person.** Somebody can be QA on one
project and a developer on another. `@@unique([projectId, userId])` means one role
per person per project is enforced by the database rather than by code remembering
to check.

**`TestResult` is also the join table.** Adding a test case to a run means creating
its result, still `NOT_RUN`. One table instead of two, so "what is in the run" and
"how it went" can never disagree.

**Deleting is chosen per relation, never by default:**

| Relation                   | On delete | Why                                          |
| -------------------------- | --------- | -------------------------------------------- |
| Project → its contents     | Cascade   | deleting a project deletes what is inside it |
| Project → creator          | Restrict  | removing a person must not delete projects   |
| TestCase → Requirement     | SetNull   | deleting a requirement must not delete tests |
| Defect → TestCase, TestRun | SetNull   | a defect outlives what it was found in       |
| TestRun → Release          | SetNull   | deleting a release must not delete its runs  |

**A release holds no results of its own.** It reads them from the test runs pointed
at it, so a result lives in exactly one place.

**No human-readable keys yet.** Ids are cuids. Per-project keys like `TC-12` would
need a counter and the concurrency care that comes with it, and nothing needs them
yet.

## Working with it

```bash
npm run db:up                                       # start PostgreSQL
npm run db:migrate -w @testbrain/api -- --name what_changed
npm run db:studio -w @testbrain/api                 # browse the data
```

The generated Prisma Client is a build artefact. It is not committed;
`prisma generate` recreates it and runs automatically after `npm install`.
