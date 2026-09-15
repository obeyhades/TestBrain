import { describe, expect, it } from 'vitest';
import type { DefectStatus, TestResultStatus } from '../../src/generated/prisma/enums.js';
import {
  determineReleaseQuality,
  isDefectResolved,
} from '../../src/modules/releases/release.logic.js';

function results(...statuses: TestResultStatus[]) {
  return statuses.map((status) => ({ status }));
}

function defect(severity: string, status: DefectStatus) {
  return { severity, status };
}

describe('isDefectResolved', () => {
  it('counts verified and closed as resolved', () => {
    expect(isDefectResolved('VERIFIED')).toBe(true);
    expect(isDefectResolved('CLOSED')).toBe(true);
  });

  it('counts everything before that as unresolved', () => {
    expect(isDefectResolved('OPEN')).toBe(false);
    expect(isDefectResolved('IN_PROGRESS')).toBe(false);
    // Waiting to be retested is not the same as fixed.
    expect(isDefectResolved('READY_FOR_TEST')).toBe(false);
  });
});

describe('determineReleaseQuality', () => {
  it('is ready when every test passed and nothing critical is open', () => {
    const quality = determineReleaseQuality({
      results: results('PASSED', 'PASSED', 'PASSED'),
      defects: [],
    });

    expect(quality.readiness).toBe('READY');
    expect(quality.blockers).toEqual([]);
  });

  it('is not ready while a test is failing', () => {
    const quality = determineReleaseQuality({
      results: results('PASSED', 'FAILED'),
      defects: [],
    });

    expect(quality.readiness).toBe('NOT_READY');
    expect(quality.blockers).toEqual(['1 test is failing']);
  });

  it('is not ready while a critical defect is unresolved', () => {
    const quality = determineReleaseQuality({
      results: results('PASSED'),
      defects: [defect('CRITICAL', 'IN_PROGRESS')],
    });

    expect(quality.readiness).toBe('NOT_READY');
    expect(quality.blockers).toEqual(['1 critical defect is still unresolved']);
  });

  it('says both reasons when both apply', () => {
    const quality = determineReleaseQuality({
      results: results('FAILED', 'FAILED'),
      defects: [defect('CRITICAL', 'OPEN'), defect('CRITICAL', 'OPEN')],
    });

    expect(quality.blockers).toEqual([
      '2 critical defects are still unresolved',
      '2 tests are failing',
    ]);
  });

  it('is not blocked by a critical defect that has been verified', () => {
    const quality = determineReleaseQuality({
      results: results('PASSED'),
      defects: [defect('CRITICAL', 'VERIFIED')],
    });

    expect(quality.readiness).toBe('READY');
  });

  it('is not blocked by a high-severity defect that is still open', () => {
    // Only critical defects stop a release. Everything else is a judgement call.
    const quality = determineReleaseQuality({
      results: results('PASSED'),
      defects: [defect('HIGH', 'OPEN')],
    });

    expect(quality.readiness).toBe('READY');
  });

  it('reports unfinished testing without blocking on it', () => {
    const quality = determineReleaseQuality({
      results: results('PASSED', 'NOT_RUN', 'BLOCKED'),
      defects: [],
    });

    expect(quality.readiness).toBe('READY');
    expect(quality.notExecuted).toBe(2);
  });

  it('carries the test counts along, so the two never disagree', () => {
    const quality = determineReleaseQuality({
      results: results('PASSED', 'PASSED', 'FAILED', 'BLOCKED'),
      defects: [],
    });

    expect(quality.summary).toMatchObject({ total: 4, passed: 2, failed: 1, blocked: 1 });
    expect(quality.summary.passRate).toBeCloseTo(66.67, 1);
  });

  it('is ready for a release nobody has tested yet, but says nothing was run', () => {
    const quality = determineReleaseQuality({ results: [], defects: [] });

    expect(quality.readiness).toBe('READY');
    expect(quality.summary.total).toBe(0);
    expect(quality.notExecuted).toBe(0);
  });
});
