import { NavLink, Outlet, useLoaderData } from 'react-router';
import type { LoaderFunctionArgs } from 'react-router';
import { fetchProject, type Project } from '../features/projects/project.api';

export async function projectLayoutLoader({ params }: LoaderFunctionArgs): Promise<Project> {
  return fetchProject(params['projectId'] ?? '');
}

/**
 * Sections that do not exist yet are deliberately absent rather than shown as
 * disabled links: a link that goes nowhere is worse than no link.
 */
const SECTIONS = [
  { to: '.', label: 'Overview', end: true },
  { to: 'requirements', label: 'Requirements', end: false },
  { to: 'test-cases', label: 'Test cases', end: false },
  { to: 'test-runs', label: 'Test runs', end: false },
  { to: 'defects', label: 'Defects', end: false },
  { to: 'releases', label: 'Releases', end: false },
  { to: 'members', label: 'Members', end: false },
];

export function ProjectLayout() {
  const project = useLoaderData() as Project;

  return (
    <section>
      <h1 className="text-lg font-semibold">{project.name}</h1>

      {project.description === null ? null : (
        <p className="mt-1 text-sm text-ink-muted">{project.description}</p>
      )}

      <nav aria-label="Project sections" className="mt-4 flex gap-4 border-b border-border">
        {SECTIONS.map((section) => (
          <NavLink
            key={section.label}
            to={section.to}
            end={section.end}
            className={({ isActive }) =>
              `-mb-px border-b-2 px-1 pb-2 text-sm ${
                isActive
                  ? 'border-accent font-medium text-ink'
                  : 'border-transparent text-ink-muted hover:text-ink'
              }`
            }
          >
            {section.label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-6">
        <Outlet context={project} />
      </div>
    </section>
  );
}
