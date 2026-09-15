import { useOutletContext } from 'react-router';
import type { Project } from './project.api';

export function ProjectOverviewPage() {
  const project = useOutletContext<Project>();

  return (
    <dl className="max-w-md rounded-lg border border-border bg-surface text-sm">
      <div className="flex justify-between border-b border-border px-4 py-2.5">
        <dt className="text-ink-muted">Created</dt>
        <dd>{new Date(project.createdAt).toLocaleDateString()}</dd>
      </div>

      <div className="flex justify-between px-4 py-2.5">
        <dt className="text-ink-muted">Description</dt>
        <dd>{project.description ?? 'None'}</dd>
      </div>
    </dl>
  );
}
