import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "outline" | "success" | "warning" | "info";
}

const badgeStyles = {
  default:
    "bg-primary/15 text-primary ring-1 ring-primary/20 dark:bg-primary/20 dark:text-primary-foreground",
  outline:
    "border border-border text-foreground dark:border-border/70",
  success:
    "bg-emerald-500/15 text-emerald-700 ring-1 ring-emerald-500/20 dark:text-emerald-100",
  warning:
    "bg-amber-500/15 text-amber-700 ring-1 ring-amber-500/20 dark:text-amber-50",
  info: "bg-sky-500/15 text-sky-700 ring-1 ring-sky-500/20 dark:text-sky-50",
};

export function Badge({
  className,
  variant = "default",
  ...props
}: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
        badgeStyles[variant],
        className,
      )}
      {...props}
    />
  );
}
