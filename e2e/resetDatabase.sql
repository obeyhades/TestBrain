-- Empties every table so the end-to-end tests start from nothing.
--
-- TRUNCATE rather than dropping the database: the schema is put in place by
-- `prisma migrate deploy`, and clearing rows is all these tests need. CASCADE
-- takes care of the order.
TRUNCATE TABLE
  "Defect",
  "TestResult",
  "TestRun",
  "Release",
  "TestStep",
  "TestCase",
  "Requirement",
  "ProjectMember",
  "Project",
  "Session",
  "User"
CASCADE;
