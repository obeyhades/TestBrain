import type { ReleaseQuality } from './release.api';

/**
 * The one thing somebody opens a release to find out: can we ship this?
 *
 * The answer and the reasons both come from the API, which decides them with
 * determineReleaseQuality. Nothing is worked out here.
 */
export function ReleaseReadiness({ quality }: { quality: ReleaseQuality }) {
  const isReady = quality.readiness === 'READY';

  return (
    <div
      className={`rounded-lg border p-4 ${
        isReady ? 'border-border bg-surface' : 'border-danger-border bg-danger-surface'
      }`}
    >
      <p className={`text-sm font-semibold ${isReady ? 'text-ink' : 'text-danger'}`}>
        {isReady ? 'Ready to release' : 'Not ready to release'}
      </p>

      {quality.blockers.length === 0 ? null : (
        <ul className="mt-2 list-inside list-disc text-sm text-danger">
          {quality.blockers.map((blocker) => (
            <li key={blocker}>{blocker}</li>
          ))}
        </ul>
      )}

      {quality.notExecuted === 0 ? null : (
        <p className="mt-2 text-sm text-ink-muted">
          {quality.notExecuted === 1
            ? '1 test has not been run yet.'
            : `${quality.notExecuted} tests have not been run yet.`}
        </p>
      )}
    </div>
  );
}
