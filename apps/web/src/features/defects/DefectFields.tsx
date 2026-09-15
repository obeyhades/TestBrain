import { TextField } from '../../components/TextField';
import type { ProjectMember } from '../projects/project.api';
import type { TestCaseSummary } from '../testCases/testCase.api';
import type { TestRunListItem } from '../testRuns/testRun.api';
import { SEVERITY_LABELS, type Defect, type DefectSeverity } from './defect.api';

type DefectFieldsProps = {
  defect?: Defect;
  defaults?: { title?: string; testCaseId?: string; testRunId?: string };
  testCases: TestCaseSummary[];
  testRuns: TestRunListItem[];
  members: ProjectMember[];
};

const SEVERITIES = Object.keys(SEVERITY_LABELS) as DefectSeverity[];

/**
 * The fields of a defect, shared by the reporting page and the editing page.
 *
 * They are the same eight fields either way, which is enough of a repeated concept
 * to be worth one component rather than two copies that drift apart.
 */
export function DefectFields({
  defect,
  defaults = {},
  testCases,
  testRuns,
  members,
}: DefectFieldsProps) {
  return (
    <>
      <TextField
        label="Title"
        name="title"
        required
        defaultValue={defect?.title ?? defaults.title ?? ''}
      />

      <TextField label="Description" name="description" defaultValue={defect?.description ?? ''} />

      <TextField
        label="Steps to reproduce"
        name="stepsToReproduce"
        defaultValue={defect?.stepsToReproduce ?? ''}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Expected result"
          name="expectedResult"
          defaultValue={defect?.expectedResult ?? ''}
        />

        <TextField
          label="Actual result"
          name="actualResult"
          defaultValue={defect?.actualResult ?? ''}
        />
      </div>

      <TextField
        label="Environment"
        name="environment"
        defaultValue={defect?.environment ?? ''}
        hint="Browser, device or build where this happens."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="defect-severity" className="block text-sm font-medium">
            Severity
          </label>
          <select
            id="defect-severity"
            name="severity"
            defaultValue={defect?.severity ?? 'MEDIUM'}
            className="mt-1 h-9 w-full rounded-md border border-border bg-surface px-2 text-sm"
          >
            {SEVERITIES.map((severity) => (
              <option key={severity} value={severity}>
                {SEVERITY_LABELS[severity]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="defect-assignee" className="block text-sm font-medium">
            Assigned to
          </label>
          <select
            id="defect-assignee"
            name="assignedToId"
            defaultValue={defect?.assignedTo?.id ?? ''}
            className="mt-1 h-9 w-full rounded-md border border-border bg-surface px-2 text-sm"
          >
            <option value="">Nobody yet</option>
            {members.map((member) => (
              <option key={member.userId} value={member.userId}>
                {member.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="defect-test-case" className="block text-sm font-medium">
            Found in test case
          </label>
          <select
            id="defect-test-case"
            name="testCaseId"
            defaultValue={defect?.testCase?.id ?? defaults.testCaseId ?? ''}
            className="mt-1 h-9 w-full rounded-md border border-border bg-surface px-2 text-sm"
          >
            <option value="">Not linked</option>
            {testCases.map((testCase) => (
              <option key={testCase.id} value={testCase.id}>
                {testCase.title}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="defect-test-run" className="block text-sm font-medium">
            Found in test run
          </label>
          <select
            id="defect-test-run"
            name="testRunId"
            defaultValue={defect?.testRun?.id ?? defaults.testRunId ?? ''}
            className="mt-1 h-9 w-full rounded-md border border-border bg-surface px-2 text-sm"
          >
            <option value="">Not linked</option>
            {testRuns.map((testRun) => (
              <option key={testRun.id} value={testRun.id}>
                {testRun.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </>
  );
}
