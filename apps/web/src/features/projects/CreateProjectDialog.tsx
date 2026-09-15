import { useState } from 'react';
import { Dialog, Heading, Modal, ModalOverlay } from 'react-aria-components';
import { Form, useActionData, useNavigation } from 'react-router';
import { Button } from '../../components/Button';
import { TextField } from '../../components/TextField';

type CreateProjectResult = {
  error?: string;
};

/**
 * React Aria handles the parts of a dialog that are easy to get wrong: focus moves
 * into it and is trapped there, Escape and a click outside close it, and the
 * surrounding page is hidden from screen readers.
 */
export function CreateProjectDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const actionResult = useActionData() as CreateProjectResult | undefined;
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>New project</Button>

      <ModalOverlay
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        isDismissable
        className="fixed inset-0 flex items-start justify-center bg-black/20 p-4 pt-24"
      >
        <Modal className="w-full max-w-sm rounded-lg border border-border bg-surface p-5 shadow-lg">
          <Dialog className="outline-none">
            <Heading slot="title" className="text-base font-semibold">
              New project
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

              <TextField label="Name" name="name" required />

              <TextField label="Description" name="description" />

              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setIsOpen(false)}>
                  Cancel
                </Button>

                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Creating…' : 'Create project'}
                </Button>
              </div>
            </Form>
          </Dialog>
        </Modal>
      </ModalOverlay>
    </>
  );
}
