import type { TestRunSummary } from './testRun.api';

const SEGMENTS = [
  { key: 'passed', label: 'Passed', className: 'bg-emerald-500' },
  { key: 'failed', label: 'Failed', className: 'bg-red-500' },
  { key: 'blocked', label: 'Blocked', className: 'bg-amber-500' },
  { key: 'notRun', label: 'Not run', className: 'bg-border' },
] as const;

/**
 * Shows how a run is going. The numbers come from the API, which computes them
 * with calculateTestRunSummary: nothing is counted here.
 */
export function TestRunSummaryBar({ summary }: { summary: TestRunSummary }) {
  return (
    <div>
      <div
        className="flex h-2 overflow-hidden rounded-full bg-border"
        role="img"
        aria-label={`${summary.passed} passed, ${summary.failed} failed, ${summary.blocked} blocked, ${summary.notRun} not run`}
      >
        {SEGMENTS.map((segment) => {
          const count = summary[segment.key];

          if (count === 0 || summary.total === 0) {
            return null;
          }

          return (
            <div
              key={segment.key}
              className={segment.className}
              style={{ width: `${(count / summary.total) * 100}%` }}
            />
          );
        })}
      </div>

      <dl className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-muted">
        {SEGMENTS.map((segment) => (
          <div key={segment.key} className="flex gap-1">
            <dt>{segment.label}:</dt>
            <dd className="font-medium text-ink">{summary[segment.key]}</dd>
          </div>
        ))}

        <div className="flex gap-1">
          <dt>Pass rate:</dt>
          <dd className="font-medium text-ink">{Math.round(summary.passRate)}%</dd>
        </div>
      </dl>
    </div>
  );
}
