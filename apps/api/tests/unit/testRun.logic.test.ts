import { describe, expect, it } from 'vitest';
import type { TestResultStatus } from '../../src/generated/prisma/enums.js';
import {
  calculatePassRate,
  calculateTestRunSummary,
} from '../../src/modules/testRuns/testRun.logic.js';

function resultsOf(...statuses: TestResultStatus[]) {
  return statuses.map((status) => ({ status }));
}

describe('calculatePassRate', () => {
  it('is 100 when everything executed passed', () => {
    expect(calculatePassRate(4, 4)).toBe(100);
  });

  it('is 0 when nothing executed passed', () => {
    expect(calculatePassRate(0, 4)).toBe(0);
  });

  it('is a percentage of what was executed', () => {
    expect(calculatePassRate(3, 4)).toBe(75);
  });

  it('is 0 rather than a division by zero when nothing has been executed', () => {
    expect(calculatePassRate(0, 0)).toBe(0);
  });
});

describe('calculateTestRunSummary', () => {
  it('counts each status', () => {
    const summary = calculateTestRunSummary(
      resultsOf('PASSED', 'PASSED', 'PASSED', 'FAILED', 'BLOCKED'),
    );

    expect(summary).toMatchObject({ total: 5, passed: 3, failed: 1, blocked: 1, notRun: 0 });
  });

  it('leaves blocked tests out of the pass rate', () => {
    // Three passed, one failed, one blocked: four tests were actually executed.
    const summary = calculateTestRunSummary(
      resultsOf('PASSED', 'PASSED', 'PASSED', 'FAILED', 'BLOCKED'),
    );

    expect(summary.passRate).toBe(75);
  });

  it('leaves not-yet-run tests out of the pass rate', () => {
    const summary = calculateTestRunSummary(resultsOf('PASSED', 'NOT_RUN', 'NOT_RUN'));

    expect(summary.passRate).toBe(100);
  });

  it('reports 0 for a run nobody has started', () => {
    const summary = calculateTestRunSummary(resultsOf('NOT_RUN', 'NOT_RUN'));

    expect(summary).toMatchObject({ total: 2, notRun: 2, passRate: 0 });
  });

  it('reports 0 for an empty run', () => {
    expect(calculateTestRunSummary([])).toEqual({
      total: 0,
      passed: 0,
      failed: 0,
      blocked: 0,
      notRun: 0,
      passRate: 0,
    });
  });

  it('counts a run where everything is blocked as nothing executed', () => {
    const summary = calculateTestRunSummary(resultsOf('BLOCKED', 'BLOCKED'));

    expect(summary.passRate).toBe(0);
    expect(summary.blocked).toBe(2);
  });
});
