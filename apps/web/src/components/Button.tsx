import type { ReactNode } from 'react';

type ButtonProps = {
  children: ReactNode;
  type?: 'button' | 'submit';
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
  onClick?: () => void;
};

const VARIANT_CLASSES = {
  primary: 'bg-accent text-white hover:bg-accent-hover',
  secondary: 'border border-border bg-surface text-ink hover:bg-canvas',
};

export function Button({
  children,
  type = 'button',
  variant = 'primary',
  disabled = false,
  onClick,
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex h-9 items-center justify-center rounded-md px-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-60 ${VARIANT_CLASSES[variant]}`}
    >
      {children}
    </button>
  );
}
