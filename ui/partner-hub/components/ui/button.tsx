import * as React from "react";
import { clsx } from "clsx";

const baseStyles =
  "inline-flex items-center justify-center gap-2 rounded-md font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50";

const variants: Record<string, string> = {
  primary: "bg-primary text-foreground shadow-sm hover:bg-primary/90",
  secondary: "border border-border bg-muted/80 text-foreground hover:bg-muted",
  ghost: "bg-transparent text-foreground/80 hover:bg-muted/60",
};

const sizes: Record<string, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-5 text-base",
};

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={clsx(baseStyles, sizes[size], variants[variant], className)}
        {...props}
      />
    );
  },
);

Button.displayName = "Button";
