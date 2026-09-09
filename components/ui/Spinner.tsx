import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Small animated spinner. Uses Lucide's Loader2 with the built-in Tailwind
 * `animate-spin` for a smooth 1s rotation. Sized like a text glyph so it can
 * drop into buttons and inline text without breaking alignment.
 */
export function Spinner({
  className,
  size = 16,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <Loader2
      className={cn("animate-spin", className)}
      style={{ width: size, height: size }}
      aria-hidden="true"
    />
  );
}
