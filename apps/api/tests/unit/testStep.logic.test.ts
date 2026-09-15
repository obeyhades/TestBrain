import { describe, expect, it } from 'vitest';
import { numberTestSteps } from '../../src/modules/testCases/testStep.logic.js';

describe('numberTestSteps', () => {
  it('numbers steps from one, in the order they were given', () => {
    const numbered = numberTestSteps([
      { action: 'Open the login page', expectedResult: 'The login form is shown' },
      { action: 'Enter valid credentials', expectedResult: 'They are accepted' },
    ]);

    expect(numbered.map((step) => step.position)).toEqual([1, 2]);
    expect(numbered[0]?.action).toBe('Open the login page');
  });

  it('renumbers after a step is taken out of the middle', () => {
    const remaining = numberTestSteps([
      { action: 'First', expectedResult: 'a' },
      { action: 'Third', expectedResult: 'c' },
    ]);

    expect(remaining.map((step) => step.position)).toEqual([1, 2]);
  });

  it('handles an empty list', () => {
    expect(numberTestSteps([])).toEqual([]);
  });
});
