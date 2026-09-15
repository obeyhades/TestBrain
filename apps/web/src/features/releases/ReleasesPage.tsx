import { useState } from 'react';
import { Dialog, Heading, Modal, ModalOverlay } from 'react-aria-components';
import { Form, Link, redirect, useActionData, useLoaderData, useNavigation } from 'react-router';
import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router';
import { Button } from '../../components/Button';
import { StatusBadge } from '../../components/StatusBadge';
import { toUserMessage } from '../../lib/apiClient';
import { ReleaseFields } from './ReleaseFields';
import {
  createRelease,
  fetchReleases,
  readReleaseFromForm,
  RELEASE_STATUS_LABELS,
  type ReleaseListItem,
} from './release.api';

type ActionResult = {
  error?: string;
};

export function releasesLoader({ params }: LoaderFunctionArgs): Promise<ReleaseListItem[]> {
  return fetchReleases(params['projectId'] ?? '');
}

export async function releasesAction({ params, request }: ActionFunctionArgs) {
  const projectId = params['projectId'] ?? '';

  try {
    const release = await createRelease(projectId, readReleaseFromForm(await request.formData()));

    return redirect(`/projects/${projectId}/releases/${release.id}`);
  } catch (error) {
    return { error: toUserMessage(error, 'Could not create the release. Try again.') };
  }
}

export function ReleasesPage() {
  const releases = useLoaderData() as ReleaseListItem[];
  const actionResult = useActionData() as ActionResult | undefined;
  const navigation = useNavigation();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <section>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Releases</h2>
        <Button onClick={() => setIsDialogOpen(true)}>New release</Button>
      </div>

      {releases.length === 0 ? (
        <p className="mt-6 rounded-lg border border-dashed border-border px-4 py-10 text-center text-sm text-ink-muted">
          No releases yet. A release collects the test runs that decide whether a version ships.
        </p>
      ) : (
        <table className="mt-4 w-full text-sm">
          <caption className="sr-only">Releases in this project</caption>
          <thead>
            <tr className="text-left text-ink-muted">
              <th scope="col" className="pb-2 font-medium">
                Release
              </th>
              <th scope="col" className="pb-2 font-medium">
                Status
              </th>
              <th scope="col" className="pb-2 font-medium">
                Tests
              </th>
              <th scope="col" className="pb-2 font-medium">
                Ready
              </th>
            </tr>
          </thead>
          <tbody>
            {releases.map((release) => (
              <tr key={release.id} className="border-t border-border">
                <td className="py-2">
                  <Link to={release.id} className="font-medium hover:underline">
                    {release.name}
                  </Link>
                  <span className="mt-0.5 block text-xs text-ink-muted">{release.version}</span>
                </td>
                <td className="py-2">{RELEASE_STATUS_LABELS[release.status]}</td>
                <td className="py-2 text-ink-muted">
                  {release.quality.summary.passed} / {release.quality.summary.total} passed
                </td>
                <td className="py-2">
                  <StatusBadge
                    label={release.quality.readiness === 'READY' ? 'Ready' : 'Not ready'}
                    tone={release.quality.readiness === 'READY' ? 'done' : 'progress'}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <ModalOverlay
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        isDismissable
        className="fixed inset-0 flex items-start justify-center bg-black/20 p-4 pt-20"
      >
        <Modal className="w-full max-w-md rounded-lg border border-border bg-surface p-5 shadow-lg">
          <Dialog className="outline-none">
            <Heading slot="title" className="text-base font-semibold">
              New release
            </Heading>

            <Form method="post" className="mt-4 space-y-4">
              {actionResult?.error === undefined ? null : (
                <p
                  role="alert"
                  className="rounded-md border border-danger-border bg-danger-surface px-3 py-2 text-sm text-danger"
                >
                  {actionResult.error}
                </p>
              )}

              <ReleaseFields />

              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>

                <Button type="submit" disabled={navigation.state === 'submitting'}>
                  Create release
                </Button>
              </div>
            </Form>
          </Dialog>
        </Modal>
      </ModalOverlay>
    </section>
  );
}
