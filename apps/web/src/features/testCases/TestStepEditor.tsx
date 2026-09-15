import { useState } from 'react';
import { Button } from '../../components/Button';
import type { TestStep } from './testCase.api';

type StepDraft = {
  key: number;
  action: string;
  expectedResult: string;
};

function toDrafts(steps: TestStep[]): StepDraft[] {
  return steps.map((step, index) => ({
    key: index,
    action: step.action,
    expectedResult: step.expectedResult,
  }));
}

/**
 * Edits the ordered steps of a test case.
 *
 * The rows are the order: the form fields are read back with getAll, which keeps
 * document order, so moving a row up is all it takes to reorder the saved steps.
 * Nothing here tracks positions.
 */
export function TestStepEditor({ steps }: { steps: TestStep[] }) {
  const [drafts, setDrafts] = useState<StepDraft[]>(() => toDrafts(steps));
  const [nextKey, setNextKey] = useState(steps.length);

  function addStep() {
    setDrafts([...drafts, { key: nextKey, action: '', expectedResult: '' }]);
    setNextKey(nextKey + 1);
  }

  function removeStep(key: number) {
    setDrafts(drafts.filter((draft) => draft.key !== key));
  }

  function moveStep(index: number, direction: -1 | 1) {
    const target = index + direction;

    if (target < 0 || target >= drafts.length) {
      return;
    }

    const reordered = [...drafts];
    const [moved] = reordered.splice(index, 1);

    if (moved !== undefined) {
      reordered.splice(target, 0, moved);
      setDrafts(reordered);
    }
  }

  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-medium">Steps</legend>

      {drafts.length === 0 ? <p className="text-sm text-ink-muted">No steps yet.</p> : null}

      {drafts.map((draft, index) => (
        <div key={draft.key} className="rounded-md border border-border p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-ink-muted">Step {index + 1}</span>

            <div className="flex gap-1">
              <Button variant="secondary" onClick={() => moveStep(index, -1)}>
                <span aria-hidden="true">↑</span>
                <span className="sr-only">Move step {index + 1} up</span>
              </Button>

              <Button variant="secondary" onClick={() => moveStep(index, 1)}>
                <span aria-hidden="true">↓</span>
                <span className="sr-only">Move step {index + 1} down</span>
              </Button>

              <Button variant="secondary" onClick={() => removeStep(draft.key)}>
                <span aria-hidden="true">✕</span>
                <span className="sr-only">Remove step {index + 1}</span>
              </Button>
            </div>
          </div>

          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="text-ink-muted">Action</span>
              <input
                name="stepAction"
                defaultValue={draft.action}
                className="mt-1 h-9 w-full rounded-md border border-border bg-surface px-2.5 text-sm"
              />
            </label>

            <label className="block text-sm">
              <span className="text-ink-muted">Expected result</span>
              <input
                name="stepExpectedResult"
                defaultValue={draft.expectedResult}
                className="mt-1 h-9 w-full rounded-md border border-border bg-surface px-2.5 text-sm"
              />
            </label>
          </div>
        </div>
      ))}

      <Button variant="secondary" onClick={addStep}>
        Add step
      </Button>
    </fieldset>
  );
}
