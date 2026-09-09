import { cn } from "@/lib/utils";

/**
 * The two button flavors used everywhere: solid `brand` and outline `ghost`.
 * Server-safe.
 */
export function Button({
  variant = "brand",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "brand" | "ghost";
}) {
  return (
    <button
      {...props}
      className={cn(
        "inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold transition",
        "disabled:cursor-not-allowed disabled:opacity-50",
        variant === "brand" &&
          "bg-brand text-[color:#FFF6EC] shadow-sm hover:brightness-105 active:translate-y-px",
        variant === "ghost" &&
          "border border-divider text-ink hover:bg-card",
        className,
      )}
    />
  );
}
