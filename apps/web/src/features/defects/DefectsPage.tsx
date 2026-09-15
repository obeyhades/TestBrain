import { Link, useLoaderData } from 'react-router';
import type { LoaderFunctionArgs } from 'react-router';
import { StatusBadge } from '../../components/StatusBadge';
import {
  DEFECT_STATUS_LABELS,
  fetchDefects,
  SEVERITY_LABELS,
  type Defect,
  type DefectStatus,
} from './defect.api';

const STATUS_TONES: Record<DefectStatus, 'neutral' | 'progress' | 'done'> = {
  OPEN: 'progress',
  IN_PROGRESS: 'progress',
  READY_FOR_TEST: 'progress',
  VERIFIED: 'done',
  CLOSED: 'neutral',
};

export function defectsLoader({ params }: LoaderFunctionArgs): Promise<Defect[]> {
  return fetchDefects(params['projectId'] ?? '');
}

export function DefectsPage() {
  const defects = useLoaderData() as Defect[];

  return (
    <section>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Defects</h2>

        <Link
          to="new"
          className="inline-flex h-9 items-center rounded-md bg-accent px-3 text-sm font-medium text-white hover:bg-accent-hover"
        >
          Report defect
        </Link>
      </div>

      {defects.length === 0 ? (
        <p className="mt-6 rounded-lg border border-dashed border-border px-4 py-10 text-center text-sm text-ink-muted">
          No defects reported. They usually arrive from a failed test.
        </p>
      ) : (
        <table className="mt-4 w-full text-sm">
          <caption className="sr-only">Defects in this project</caption>
          <thead>
            <tr className="text-left text-ink-muted">
              <th scope="col" className="pb-2 font-medium">
                Title
              </th>
              <th scope="col" className="pb-2 font-medium">
                Severity
              </th>
              <th scope="col" className="pb-2 font-medium">
                Status
              </th>
              <th scope="col" className="pb-2 font-medium">
                Assigned to
              </th>
            </tr>
          </thead>
          <tbody>
            {defects.map((defect) => (
              <tr key={defect.id} className="border-t border-border">
                <td className="py-2">
                  <Link to={defect.id} className="font-medium hover:underline">
                    {defect.title}
                  </Link>
                  {defect.testCase === null ? null : (
                    <span className="mt-0.5 block text-xs text-ink-muted">
                      From {defect.testCase.title}
                    </span>
                  )}
                </td>
                <td className="py-2">{SEVERITY_LABELS[defect.severity]}</td>
                <td className="py-2">
                  <StatusBadge
                    label={DEFECT_STATUS_LABELS[defect.status]}
                    tone={STATUS_TONES[defect.status]}
                  />
                </td>
                <td className="py-2 text-ink-muted">{defect.assignedTo?.name ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
