"use client";

import { useFormStatus } from "react-dom";
import { Button } from "./button";

/**
 * A submit button that automatically knows when its parent <form> is being
 * submitted via a Server Action. Uses React's built-in `useFormStatus` — no
 * manual pending state juggling. Drop it into any form for a proper
 * loading experience.
 */
export function SubmitButton({
  children,
  loadingLabel,
  variant = "brand",
  className,
  ...props
}: {
  children: React.ReactNode;
  loadingLabel?: React.ReactNode;
  variant?: "brand" | "ghost";
  className?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { pending } = useFormStatus();
  return (
    <Button
      {...props}
      type="submit"
      loading={pending}
      variant={variant}
      className={className}
    >
      {pending && loadingLabel ? loadingLabel : children}
    </Button>
  );
}
