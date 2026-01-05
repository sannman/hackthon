import * as React from "react";
import { cn } from "@/lib/utils";

export type ButtonVariant =
  | "default"
  | "secondary"
  | "outline"
  | "ghost"
  | "destructive"
  | "link";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: "default" | "sm" | "lg" | "icon";
}

const variantStyles: Record<ButtonVariant, string> = {
  default:
    "bg-primary text-primary-foreground shadow-sm transition hover:bg-primary/90",
  secondary:
    "bg-secondary text-secondary-foreground transition hover:bg-secondary/80",
  outline:
    "border border-border bg-background transition hover:bg-muted hover:text-foreground",
  ghost:
    "bg-transparent text-foreground transition hover:bg-muted/60 dark:hover:bg-muted/40",
  destructive:
    "bg-destructive text-destructive-foreground transition hover:bg-destructive/90",
  link: "text-primary underline-offset-4 hover:underline",
};

const sizeStyles = {
  default: "h-10 px-4 py-2",
  sm: "h-8 rounded-md px-3",
  lg: "h-11 rounded-lg px-5",
  icon: "h-10 w-10",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60",
          variantStyles[variant],
          sizeStyles[size],
          className,
        )}
        {...props}
      />
    );
  },
);

Button.displayName = "Button";
