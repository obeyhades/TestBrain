import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ReleaseReadiness } from '../src/features/releases/ReleaseReadiness';
import type { ReleaseQuality } from '../src/features/releases/release.api';

function quality(overrides: Partial<ReleaseQuality> = {}): ReleaseQuality {
  return {
    readiness: 'READY',
    blockers: [],
    summary: { total: 3, passed: 3, failed: 0, blocked: 0, notRun: 0, passRate: 100 },
    notExecuted: 0,
    ...overrides,
  };
}

describe('ReleaseReadiness', () => {
  it('says a clean release is ready', () => {
    render(<ReleaseReadiness quality={quality()} />);

    expect(screen.getByText('Ready to release')).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('lists every reason a release is held back', () => {
    render(
      <ReleaseReadiness
        quality={quality({
          readiness: 'NOT_READY',
          blockers: ['1 critical defect is still unresolved', '2 tests are failing'],
        })}
      />,
    );

    expect(screen.getByText('Not ready to release')).toBeInTheDocument();
    expect(screen.getByText('1 critical defect is still unresolved')).toBeInTheDocument();
    expect(screen.getByText('2 tests are failing')).toBeInTheDocument();
  });

  it('mentions unfinished testing without calling it a blocker', () => {
    render(<ReleaseReadiness quality={quality({ notExecuted: 3 })} />);

    expect(screen.getByText('Ready to release')).toBeInTheDocument();
    expect(screen.getByText('3 tests have not been run yet.')).toBeInTheDocument();
  });

  it('says it in the singular for exactly one', () => {
    render(<ReleaseReadiness quality={quality({ notExecuted: 1 })} />);

    expect(screen.getByText('1 test has not been run yet.')).toBeInTheDocument();
  });

  it('says nothing about unfinished testing when everything has been run', () => {
    render(<ReleaseReadiness quality={quality()} />);

    expect(screen.queryByText(/have not been run/)).not.toBeInTheDocument();
  });
});
