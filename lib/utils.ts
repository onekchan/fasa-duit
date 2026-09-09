import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind class strings safely — conditional classes via clsx,
 * and Tailwind conflicts resolved with tailwind-merge (last wins).
 * Standard shadcn/ui-style helper.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
