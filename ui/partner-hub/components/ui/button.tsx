import * as React from "react";
import { clsx } from "clsx";

const baseStyles =
  "inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50";

const variants: Record<string, string> = {
  primary: "bg-primary text-foreground shadow hover:bg-primary/90",
  secondary: "bg-muted text-foreground hover:bg-muted/80",
  ghost: "bg-transparent text-foreground hover:bg-muted",
};

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variants;
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={clsx(baseStyles, variants[variant], className)}
        {...props}
      />
    );
  },
);

Button.displayName = "Button";
