import * as React from "react";
import { cn } from "@/lib/utils";

export interface ProgressProps
  extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
}

export function Progress({ value = 0, className, ...props }: ProgressProps) {
  return (
    <div
      className={cn(
        "h-3 w-full overflow-hidden rounded-full bg-muted",
        className,
      )}
      {...props}
    >
      <div
        className="h-full w-full origin-left rounded-full bg-gradient-to-r from-primary via-sky-500 to-emerald-500 transition-transform duration-300"
        style={{ transform: `scaleX(${Math.min(Math.max(value, 0), 100) / 100})` }}
      />
    </div>
  );
}
