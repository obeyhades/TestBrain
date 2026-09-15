import { TextField } from '../../components/TextField';
import { RELEASE_STATUS_LABELS, type ReleaseDetail, type ReleaseStatus } from './release.api';

const STATUSES = Object.keys(RELEASE_STATUS_LABELS) as ReleaseStatus[];

/** The fields of a release, shared by the create dialog and the edit form. */
export function ReleaseFields({ release }: { release?: ReleaseDetail }) {
  return (
    <>
      <TextField label="Name" name="name" required defaultValue={release?.name ?? ''} />

      <TextField
        label="Version"
        name="version"
        required
        defaultValue={release?.version ?? ''}
        hint="For example: v1.4.0"
      />

      <TextField label="Description" name="description" defaultValue={release?.description ?? ''} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="release-status" className="block text-sm font-medium">
            Status
          </label>
          <select
            id="release-status"
            name="status"
            defaultValue={release?.status ?? 'PLANNED'}
            className="mt-1 h-9 w-full rounded-md border border-border bg-surface px-2 text-sm"
          >
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {RELEASE_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="release-target-date" className="block text-sm font-medium">
            Target date
          </label>
          <input
            id="release-target-date"
            name="targetDate"
            type="date"
            defaultValue={
              release?.targetDate === null ? '' : (release?.targetDate?.slice(0, 10) ?? '')
            }
            className="mt-1 h-9 w-full rounded-md border border-border bg-surface px-2.5 text-sm"
          />
        </div>
      </div>
    </>
  );
}
