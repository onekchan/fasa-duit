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
 * "Money input" — calculator-style fixed-decimal input.
 *
 * Behavior (matches TnG, GrabPay, Wise, most modern MY banking apps):
 *   * User types digits only; the value grows from the right of the decimal.
 *   * "5" → 0.05 → "0" → 0.50 → "0" → 5.00 → "0" → 50.00 → "0" → 500.00 ...
 *   * Backspace removes the last digit (500.00 → 50.00 → 5.00 → 0.50 → ...).
 *   * Thousand separators appear automatically (1,234,567.89).
 *   * Placeholder shows "0.00" while the value is still zero.
 *   * inputMode="numeric" so mobile shows the digit-only keypad.
 *   * Non-numeric key presses are ignored — no letters, no manual "."
 *
 * Value semantics stay string so every existing caller (parent state,
 * money.parse on save) keeps working. The string is always a normalized
 * grouped-2-decimal number ("1,234.56" or "") — parents can pass any
 * string as initial state; the component normalizes it on first render.
 */
export function MoneyInput({
  prefix,
  className,
  inputClassName,
  value,
  onChange,
  onKeyDown,
  ref,
  ...rest
}: {
  prefix: string;
  inputClassName?: string;
  ref?: React.Ref<HTMLInputElement>;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  // Parse whatever the caller gave us into an integer minor-unit count.
  // Rules:
  //   * empty       → 0
  //   * has "."     → decimal (e.g. "1,234.56" → 123456; "18.00" → 1800)
  //   * no "."      → whole units (e.g. "500" → 50000; parent-integer state
  //                    from things like a slider or a percent field seeded
  //                    from `apr_bps / 100`.)
  const raw = typeof value === "string" ? value : value != null ? String(value) : "";
  let minor = 0;
  if (raw.trim()) {
    const cleaned = raw.replace(/[^\d.]/g, "");
    if (cleaned) {
      if (cleaned.includes(".")) {
        const parsed = parseFloat(cleaned);
        if (isFinite(parsed)) minor = Math.round(parsed * 100);
      } else {
        const parsed = parseInt(cleaned, 10);
        if (isFinite(parsed)) minor = parsed * 100;
      }
    }
  }

  // Format back to "X,XXX.YY" (empty when zero so placeholder shows).
  const display =
    minor > 0
      ? (minor / 100).toLocaleString("en-MY", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      : "";

  const emit = (nextMinor: number) => {
    const nextStr =
      nextMinor > 0
        ? (nextMinor / 100).toLocaleString("en-MY", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })
        : "";
    if (!onChange) return;
    // Synthesize a React ChangeEvent-shaped object so existing callers keep
    // working: `onChange={(ev) => setState(ev.target.value)}`.
    const synthetic = {
      target: { value: nextStr },
      currentTarget: { value: nextStr },
    } as unknown as React.ChangeEvent<HTMLInputElement>;
    onChange(synthetic);
  };

  const handleKeyDown = (ev: React.KeyboardEvent<HTMLInputElement>) => {
    // Let the caller peek first (Enter/Escape shortcuts, etc.)
    onKeyDown?.(ev);
    if (ev.defaultPrevented) return;
    // Nav / edit shortcuts pass through
    if (
      ev.key === "Tab" ||
      ev.key === "Enter" ||
      ev.key === "Escape" ||
      ev.key === "ArrowLeft" ||
      ev.key === "ArrowRight" ||
      ev.key === "ArrowUp" ||
      ev.key === "ArrowDown" ||
      ev.key === "Home" ||
      ev.key === "End" ||
      ev.ctrlKey ||
      ev.metaKey
    ) {
      return;
    }
    if (ev.key === "Backspace") {
      ev.preventDefault();
      emit(Math.floor(minor / 10));
      return;
    }
    if (ev.key === "Delete") {
      ev.preventDefault();
      emit(0);
      return;
    }
    if (/^[0-9]$/.test(ev.key)) {
      ev.preventDefault();
      const next = minor * 10 + parseInt(ev.key, 10);
      // Cap at 999,999,999,999.99 so we never overflow parseInt safely.
      if (next > 99999999999999) return;
      emit(next);
      return;
    }
    // Anything else — letters, symbols, ".", "-" — silently ignored.
    ev.preventDefault();
  };

  // Handle paste + autofill + any other change we didn't cover via keys.
  const handleChange = (ev: React.ChangeEvent<HTMLInputElement>) => {
    const digits = ev.target.value.replace(/[^\d]/g, "");
    const nextMinor = digits ? Math.min(99999999999999, parseInt(digits, 10)) : 0;
    if (nextMinor === minor) return;
    emit(nextMinor);
  };

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
        inputMode="numeric"
        autoComplete="off"
        {...rest}
        value={display}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={rest.placeholder ?? "0.00"}
        className={cn(
          "flex-1 border-0 bg-transparent px-3 py-2 text-right tabular-nums outline-none",
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
