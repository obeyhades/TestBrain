import { describe, expect, it } from 'vitest';
import type { ProjectRole } from '../../src/generated/prisma/enums.js';
import {
  canEditRequirements,
  canEditTestCases,
  canManageProject,
} from '../../src/modules/projects/permissions.js';

const EVERY_ROLE: ProjectRole[] = ['ADMIN', 'PROJECT_MANAGER', 'QA', 'DEVELOPER'];

describe('canManageProject', () => {
  it('lets administrators and project managers manage the project', () => {
    expect(canManageProject('ADMIN')).toBe(true);
    expect(canManageProject('PROJECT_MANAGER')).toBe(true);
  });

  it('does not let testers or developers manage the project', () => {
    expect(canManageProject('QA')).toBe(false);
    expect(canManageProject('DEVELOPER')).toBe(false);
  });

  it('has an answer for every role that exists', () => {
    // A new role added to the schema should make somebody think about this rule,
    // rather than silently defaulting to "no".
    for (const role of EVERY_ROLE) {
      expect(typeof canManageProject(role)).toBe('boolean');
    }

    expect(EVERY_ROLE).toHaveLength(4);
  });
});

describe('canEditRequirements', () => {
  it('lets administrators, project managers and testers write requirements', () => {
    expect(canEditRequirements('ADMIN')).toBe(true);
    expect(canEditRequirements('PROJECT_MANAGER')).toBe(true);
    expect(canEditRequirements('QA')).toBe(true);
  });

  it('leaves developers with read access only', () => {
    expect(canEditRequirements('DEVELOPER')).toBe(false);
  });
});

describe('canEditTestCases', () => {
  it('lets administrators, project managers and testers write test cases', () => {
    expect(canEditTestCases('ADMIN')).toBe(true);
    expect(canEditTestCases('PROJECT_MANAGER')).toBe(true);
    expect(canEditTestCases('QA')).toBe(true);
  });

  it('leaves developers with read access only', () => {
    expect(canEditTestCases('DEVELOPER')).toBe(false);
  });
});
