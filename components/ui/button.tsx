import { cn } from "@/lib/utils";
import { Spinner } from "./Spinner";

/**
 * The two button flavors used everywhere: solid `brand` and outline `ghost`.
 * Server-safe. When `loading` is true, the button shows a spinner, disables
 * itself, and keeps its width stable so the layout doesn't jump.
 */
export function Button({
  variant = "brand",
  className,
  loading,
  disabled,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "brand" | "ghost";
  loading?: boolean;
}) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition",
        "disabled:cursor-not-allowed disabled:opacity-60",
        variant === "brand" &&
          "bg-brand text-[color:#FFF6EC] shadow-sm hover:brightness-105 active:translate-y-px",
        variant === "ghost" &&
          "border border-divider text-ink hover:bg-card",
        className,
      )}
    >
      {loading && <Spinner size={14} />}
      {children}
    </button>
  );
}
