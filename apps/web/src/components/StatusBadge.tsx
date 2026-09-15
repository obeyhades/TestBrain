type StatusBadgeProps = {
  label: string;
  tone: 'neutral' | 'progress' | 'done';
};

const TONE_CLASSES = {
  neutral: 'border-border text-ink-muted',
  progress: 'border-accent/30 text-accent',
  done: 'border-border bg-canvas text-ink',
};

/** A small, quiet label. Statuses should be scannable, not loud. */
export function StatusBadge({ label, tone }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex h-5 items-center rounded border px-1.5 text-xs font-medium ${TONE_CLASSES[tone]}`}
    >
      {label}
    </span>
  );
}
