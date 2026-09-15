import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TestRunSummaryBar } from '../src/features/testRuns/TestRunSummaryBar';

describe('TestRunSummaryBar', () => {
  it('shows the counts it was given', () => {
    render(
      <TestRunSummaryBar
        summary={{ total: 5, passed: 3, failed: 1, blocked: 1, notRun: 0, passRate: 75 }}
      />,
    );

    expect(screen.getByText('Passed:').nextSibling).toHaveTextContent('3');
    expect(screen.getByText('Pass rate:').nextSibling).toHaveTextContent('75%');
  });

  it('describes the bar for people who cannot see it', () => {
    render(
      <TestRunSummaryBar
        summary={{ total: 5, passed: 3, failed: 1, blocked: 1, notRun: 0, passRate: 75 }}
      />,
    );

    expect(screen.getByLabelText('3 passed, 1 failed, 1 blocked, 0 not run')).toBeInTheDocument();
  });

  it('rounds the pass rate rather than printing a long decimal', () => {
    render(
      <TestRunSummaryBar
        summary={{ total: 3, passed: 2, failed: 1, blocked: 0, notRun: 0, passRate: 66.66666 }}
      />,
    );

    expect(screen.getByText('Pass rate:').nextSibling).toHaveTextContent('67%');
  });

  it('handles an empty run without dividing by zero', () => {
    render(
      <TestRunSummaryBar
        summary={{ total: 0, passed: 0, failed: 0, blocked: 0, notRun: 0, passRate: 0 }}
      />,
    );

    expect(screen.getByText('Pass rate:').nextSibling).toHaveTextContent('0%');
  });
});
