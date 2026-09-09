import { cn } from "@/lib/utils";

/**
 * Vertical form field wrapper: label + control + optional hint.
 * Server-safe (no client hooks).
 */
export function Field({
  label,
  hint,
  htmlFor,
  className,
  children,
  error,
}: {
  label: React.ReactNode;
  hint?: React.ReactNode;
  htmlFor?: string;
  className?: string;
  children: React.ReactNode;
  error?: string | null;
}) {
  return (
    <label htmlFor={htmlFor} className={cn("flex flex-col gap-1.5", className)}>
      <span className="text-sm font-semibold">{label}</span>
      {children}
      {(hint || error) && (
        <span className={cn("text-xs", error ? "text-danger" : "text-muted")}>
          {error ?? hint}
        </span>
      )}
    </label>
  );
}

/** Base text/number input styled with the warm token palette. */
export function TextInput({
  className,
  ref,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  ref?: React.Ref<HTMLInputElement>;
}) {
  return (
    <input
      ref={ref}
      {...props}
      className={cn(
        "rounded-lg border border-divider bg-surface px-3 py-2 tabular-nums transition-colors",
        "focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20",
        className,
      )}
    />
  );
}

/**
 * "Money input" — a currency prefix chip fused with a text input inside one
 * bordered rounded rectangle. Focus ring wraps the whole group.
 */
export function MoneyInput({
  prefix,
  className,
  inputClassName,
  ref,
  ...props
}: {
  prefix: string;
  inputClassName?: string;
  ref?: React.Ref<HTMLInputElement>;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div
      className={cn(
        "flex items-stretch overflow-hidden rounded-lg border border-divider bg-surface transition",
        "focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20",
        className,
      )}
    >
      <span className="flex items-center border-r border-divider bg-card px-3 font-semibold text-muted">
        {prefix}
      </span>
      <input
        ref={ref}
        type="text"
        inputMode="decimal"
        {...props}
        className={cn(
          "flex-1 border-0 bg-transparent px-3 py-2 tabular-nums outline-none",
          inputClassName,
        )}
      />
    </div>
  );
}

export function Select({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(
        "rounded-lg border border-divider bg-surface px-3 py-2 tabular-nums transition-colors",
        "focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20",
        className,
      )}
    >
      {children}
    </select>
  );
}
