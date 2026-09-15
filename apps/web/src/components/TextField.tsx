import { useId } from 'react';

type TextFieldProps = {
  label: string;
  name: string;
  type?: 'text' | 'email' | 'password';
  required?: boolean;
  autoComplete?: string;
  hint?: string;
  defaultValue?: string;
};

/**
 * A labelled text input.
 *
 * useId generates the id that ties the label to the input, which is what lets a
 * screen reader announce the field and lets the tests find it by its label.
 */
export function TextField({
  label,
  name,
  type = 'text',
  required = false,
  autoComplete,
  hint,
  defaultValue,
}: TextFieldProps) {
  const inputId = useId();
  const hintId = useId();

  return (
    <div>
      <label htmlFor={inputId} className="block text-sm font-medium">
        {label}
      </label>

      <input
        id={inputId}
        name={name}
        type={type}
        required={required}
        autoComplete={autoComplete}
        defaultValue={defaultValue}
        aria-describedby={hint === undefined ? undefined : hintId}
        className="mt-1 h-9 w-full rounded-md border border-border bg-surface px-2.5 text-sm focus-visible:outline-2 focus-visible:outline-offset-[-1px] focus-visible:outline-accent"
      />

      {hint === undefined ? null : (
        <p id={hintId} className="mt-1 text-xs text-ink-muted">
          {hint}
        </p>
      )}
    </div>
  );
}
