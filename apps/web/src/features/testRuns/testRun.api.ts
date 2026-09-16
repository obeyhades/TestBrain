import { apiDelete, apiGet, apiPost, apiSendWithoutResponse } from '../../lib/apiClient';
import type { Priority } from '../testCases/testCase.api';

export type TestResultStatus = 'NOT_RUN' | 'PASSED' | 'FAILED' | 'BLOCKED';

export const RESULT_STATUS_LABELS: Record<TestResultStatus, string> = {
  NOT_RUN: 'Not run',
  PASSED: 'Passed',
  FAILED: 'Failed',
  BLOCKED: 'Blocked',
};

export type TestRunSummary = {
  total: number;
  passed: number;
  failed: number;
  blocked: number;
  notRun: number;
  passRate: number;
};

export type TestRunListItem = {
  id: string;
  name: string;
  status: 'OPEN' | 'COMPLETED';
  createdAt: string;
  summary: TestRunSummary;
};

export type TestRunResult = {
  testCaseId: string;
  title: string;
  priority: Priority;
  status: TestResultStatus;
  notes: string | null;
  executedBy: string | null;
  executedAt: string | null;
};

export type TestRunDetail = {
  id: string;
  name: string;
  status: 'OPEN' | 'COMPLETED';
  summary: TestRunSummary;
  results: TestRunResult[];
};

export async function fetchTestRuns(projectId: string): Promise<TestRunListItem[]> {
  const { testRuns } = await apiGet<{ testRuns: TestRunListItem[] }>(
    `/projects/${projectId}/test-runs`,
  );

  return testRuns;
}

export async function fetchTestRun(projectId: string, testRunId: string): Promise<TestRunDetail> {
  const { testRun } = await apiGet<{ testRun: TestRunDetail }>(
    `/projects/${projectId}/test-runs/${testRunId}`,
  );

  return testRun;
}

export async function createTestRun(projectId: string, name: string): Promise<{ id: string }> {
  const { testRun } = await apiPost<{ testRun: { id: string } }>(
    `/projects/${projectId}/test-runs`,
    { name },
  );

  return testRun;
}

export function addTestCasesToRun(
  projectId: string,
  testRunId: string,
  testCaseIds: string[],
): Promise<void> {
  return apiSendWithoutResponse(
    'POST',
    `/projects/${projectId}/test-runs/${testRunId}/test-cases`,
    {
      testCaseIds,
    },
  );
}

export function recordTestResult(
  projectId: string,
  testRunId: string,
  testCaseId: string,
  input: { status: TestResultStatus; notes?: string },
): Promise<void> {
  return apiSendWithoutResponse(
    'PUT',
    `/projects/${projectId}/test-runs/${testRunId}/results/${testCaseId}`,
    input,
  );
}

export function removeTestCaseFromRun(
  projectId: string,
  testRunId: string,
  testCaseId: string,
): Promise<void> {
  return apiDelete(`/projects/${projectId}/test-runs/${testRunId}/test-cases/${testCaseId}`);
}

export function setTestRunCompleted(
  projectId: string,
  testRunId: string,
  completed: boolean,
): Promise<void> {
  return apiSendWithoutResponse('PATCH', `/projects/${projectId}/test-runs/${testRunId}`, {
    completed,
  });
}

export type ImportSummary = {
  recorded: number;
  addedToRun: number;
  unmatched: string[];
};

/** Sends a JUnit XML report as text; the API matches it to test cases by title. */
export async function importTestResults(
  projectId: string,
  testRunId: string,
  report: string,
): Promise<ImportSummary> {
  const response = await apiPost<{ import: ImportSummary }>(
    `/projects/${projectId}/test-runs/${testRunId}/import`,
    { report },
  );

  return response.import;
}
