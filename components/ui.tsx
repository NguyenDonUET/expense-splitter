import type { ButtonHTMLAttributes, ReactNode } from "react";

const variants = {
  primary: "btn-accent",
  quiet: "border border-border bg-surface text-text-primary hover:bg-bg-tertiary",
  danger: "bg-error text-white",
  ghost: "text-text-secondary hover:bg-bg-tertiary hover:text-text-primary",
} as const;

export function Button({
  variant = "primary",
  className = "",
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof variants }) {
  return (
    <button
      type={type}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold disabled:opacity-50 ${variants[variant]} ${className}`}
      {...props}
    />
  );
}

export function Field({
  label,
  hint,
  error,
  children,
  id,
}: {
  label: string;
  hint?: string;
  error?: string | null;
  children: ReactNode;
  id: string;
}) {
  const errorId = `${id}-error`;
  return (
    <label className="grid gap-1 text-sm font-medium" htmlFor={id}>
      <span>{label}</span>
      {children}
      {hint ? <span className="font-normal text-text-secondary">{hint}</span> : null}
      {error ? (
        <span id={errorId} className="font-normal text-error">
          {error}
        </span>
      ) : null}
    </label>
  );
}

export const controlClass =
  "min-h-11 w-full rounded-md border border-border bg-bg-primary px-3 text-base font-normal text-text-primary";
