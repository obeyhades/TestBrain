import { useLoaderData } from 'react-router';
import { fetchHealth, type HealthResponse } from './system.api';

/**
 * Temporary landing page. It exists to prove the browser -> proxy -> API path works
 * end to end, and will be replaced by the project list in a later phase.
 */
export async function systemStatusLoader(): Promise<HealthResponse> {
  return fetchHealth();
}

export function SystemStatusPage() {
  const health = useLoaderData() as HealthResponse;

  return (
    <section>
      <h1 className="text-lg font-semibold">TestBrain</h1>
      <p className="mt-1 text-sm text-ink-muted">Self-hosted QA and software testing platform.</p>

      <dl className="mt-6 max-w-sm rounded border border-border bg-surface text-sm">
        <div className="flex items-center justify-between px-3 py-2">
          <dt className="text-ink-muted">API</dt>
          <dd className="font-medium">{health.status}</dd>
        </div>
      </dl>
    </section>
  );
}
