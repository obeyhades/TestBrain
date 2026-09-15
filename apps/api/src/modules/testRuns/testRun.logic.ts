import type { TestResultStatus } from '../../generated/prisma/enums.js';

export type TestRunSummary = {
  total: number;
  passed: number;
  failed: number;
  blocked: number;
  notRun: number;
  passRate: number;
};

/**
 * The share of executed tests that passed, as a percentage.
 *
 * Blocked and not-yet-run tests are not executed tests, so they are left out of
 * both sides of this. A run where one test passed and everything else is blocked
 * is at 100% of what could actually be checked, not at 20% of the whole plan.
 */
export function calculatePassRate(passed: number, executed: number): number {
  if (executed === 0) {
    return 0;
  }

  return (passed / executed) * 100;
}

/**
 * Counts how a test run is going.
 *
 * A plain function over a list of statuses: no database, no HTTP, no React. It is
 * the same calculation whether it is called from the API, from a test, or one day
 * from a script.
 */
export function calculateTestRunSummary(results: { status: TestResultStatus }[]): TestRunSummary {
  const passed = countStatus(results, 'PASSED');
  const failed = countStatus(results, 'FAILED');
  const blocked = countStatus(results, 'BLOCKED');
  const notRun = countStatus(results, 'NOT_RUN');

  return {
    total: results.length,
    passed,
    failed,
    blocked,
    notRun,
    passRate: calculatePassRate(passed, passed + failed),
  };
}

function countStatus(results: { status: TestResultStatus }[], status: TestResultStatus): number {
  return results.filter((result) => result.status === status).length;
}
