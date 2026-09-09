import { cn } from "@/lib/utils";

/**
 * Warm rounded card in two elevations. Server-safe.
 */
export function Card({
  elevated,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { elevated?: boolean }) {
  return (
    <div
      {...props}
      className={cn(
        "rounded-card border border-divider p-6",
        elevated ? "bg-surface shadow-md" : "bg-card shadow-sm",
        className,
      )}
    />
  );
}
