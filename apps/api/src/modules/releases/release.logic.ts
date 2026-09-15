import type { DefectStatus, TestResultStatus } from '../../generated/prisma/enums.js';
import { calculateTestRunSummary, type TestRunSummary } from '../testRuns/testRun.logic.js';

export type ReleaseReadiness = 'READY' | 'NOT_READY';

export type ReleaseQuality = {
  readiness: ReleaseReadiness;
  /** Why it is not ready, in plain words. Empty when it is ready. */
  blockers: string[];
  summary: TestRunSummary;
  /** Shown as information, not as a blocker. See the note below. */
  notExecuted: number;
};

/**
 * A defect stops counting against a release once somebody has confirmed the fix.
 * Reported, being worked on and waiting to be retested all still count.
 */
export function isDefectResolved(status: DefectStatus): boolean {
  return status === 'VERIFIED' || status === 'CLOSED';
}

/**
 * Decides whether a version is fit to ship.
 *
 * Two rules, both deliberately blunt:
 *
 *   1. An unresolved critical defect blocks the release.
 *   2. A failed test blocks the release.
 *
 * Tests that have not been run or are blocked do NOT stop a release here. They are
 * reported separately as notExecuted, because "we have not finished testing" is a
 * judgement for the team rather than something this function should decide for
 * them. Making it a blocker is a one-line change if that is what you want.
 */
export function determineReleaseQuality(input: {
  results: { status: TestResultStatus }[];
  defects: { severity: string; status: DefectStatus }[];
}): ReleaseQuality {
  const summary = calculateTestRunSummary(input.results);

  const unresolvedCritical = input.defects.filter(
    (defect) => defect.severity === 'CRITICAL' && !isDefectResolved(defect.status),
  ).length;

  const blockers: string[] = [];

  if (unresolvedCritical > 0) {
    blockers.push(
      unresolvedCritical === 1
        ? '1 critical defect is still unresolved'
        : `${unresolvedCritical} critical defects are still unresolved`,
    );
  }

  if (summary.failed > 0) {
    blockers.push(
      summary.failed === 1 ? '1 test is failing' : `${summary.failed} tests are failing`,
    );
  }

  return {
    readiness: blockers.length === 0 ? 'READY' : 'NOT_READY',
    blockers,
    summary,
    notExecuted: summary.blocked + summary.notRun,
  };
}
