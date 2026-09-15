export type TestStepInput = {
  action: string;
  expectedResult: string;
};

export type NumberedTestStep = TestStepInput & {
  position: number;
};

/**
 * Numbers a list of steps 1, 2, 3...
 *
 * Steps are saved as a whole list rather than moved around one at a time. That
 * turns reordering, inserting and deleting into the same operation -- send the
 * list you want -- and avoids shuffling positions around a unique constraint.
 */
export function numberTestSteps(steps: TestStepInput[]): NumberedTestStep[] {
  return steps.map((step, index) => ({
    action: step.action,
    expectedResult: step.expectedResult,
    position: index + 1,
  }));
}
