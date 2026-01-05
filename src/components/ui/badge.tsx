import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "outline" | "secondary";
}

const badgeStyles = {
  default:
    "bg-primary text-primary-foreground border border-primary hover:bg-primary/90",
  secondary:
    "bg-secondary text-secondary-foreground hover:bg-secondary/80",
  outline:
    "text-foreground border border-border",
};

export function Badge({
  className,
  variant = "default",
  ...props
}: BadgeProps) {
  // Map legacy variants to default or outline to ensure monochrome
  // Since Typescript enforces the variants in BadgeProps, we don't need to check for invalid ones if we trust the types.
  // However, if we want to be safe for runtime usage ignoring types:
  const isValid = (v: string): v is keyof typeof badgeStyles => {
    return Object.keys(badgeStyles).includes(v);
  };

  const effectiveVariant = isValid(variant) ? variant : "default";

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        badgeStyles[effectiveVariant],
        className,
      )}
      {...props}
    />
  );
}
