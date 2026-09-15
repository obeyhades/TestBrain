import { Link, redirect, useLoaderData } from 'react-router';
import type { ActionFunctionArgs } from 'react-router';
import { toUserMessage } from '../../lib/apiClient';
import { CreateProjectDialog } from './CreateProjectDialog';
import { createProject, fetchProjects, type Project } from './project.api';

export function projectsLoader(): Promise<Project[]> {
  return fetchProjects();
}

export async function projectsAction({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const description = String(formData.get('description') ?? '').trim();

  try {
    const project = await createProject({
      name: String(formData.get('name') ?? ''),
      ...(description === '' ? {} : { description }),
    });

    // Going straight to the new project also unmounts the dialog, so there is no
    // open/closed state to keep in step with the request.
    return redirect(`/projects/${project.id}`);
  } catch (error) {
    return { error: toUserMessage(error, 'Could not create the project. Try again.') };
  }
}

export function ProjectsPage() {
  const projects = useLoaderData() as Project[];

  return (
    <section>
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Projects</h1>
        <CreateProjectDialog />
      </div>

      {projects.length === 0 ? (
        <p className="mt-8 rounded-lg border border-dashed border-border px-4 py-10 text-center text-sm text-ink-muted">
          No projects yet. Create one to start writing requirements and test cases.
        </p>
      ) : (
        <ul className="mt-6 divide-y divide-border rounded-lg border border-border bg-surface">
          {projects.map((project) => (
            <li key={project.id}>
              <Link
                to={`/projects/${project.id}`}
                className="block px-4 py-3 hover:bg-canvas focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent"
              >
                <span className="text-sm font-medium">{project.name}</span>

                {project.description === null ? null : (
                  <span className="mt-0.5 block text-sm text-ink-muted">{project.description}</span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
