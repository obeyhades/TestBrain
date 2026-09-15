import { describe, expect, it } from 'vitest';
import type { ProjectRole } from '../../src/generated/prisma/enums.js';
import { canManageProject } from '../../src/modules/projects/permissions.js';

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
