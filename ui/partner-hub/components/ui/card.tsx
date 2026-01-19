import * as React from "react";
import { clsx } from "clsx";

type CardProps = React.HTMLAttributes<HTMLDivElement>;

type CardHeaderProps = React.HTMLAttributes<HTMLDivElement>;

type CardTitleProps = React.HTMLAttributes<HTMLHeadingElement>;

type CardContentProps = React.HTMLAttributes<HTMLDivElement>;

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={clsx(
        "rounded-xl border border-border/60 bg-card p-6 shadow-sm transition-shadow duration-200",
        className,
      )}
      {...props}
    />
  ),
);

Card.displayName = "Card";

export const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={clsx("mb-4 flex flex-col gap-1", className)} {...props} />
  ),
);

CardHeader.displayName = "CardHeader";

export const CardTitle = React.forwardRef<HTMLHeadingElement, CardTitleProps>(
  ({ className, ...props }, ref) => (
    <h3 ref={ref} className={clsx("text-lg font-semibold", className)} {...props} />
  ),
);

CardTitle.displayName = "CardTitle";

export const CardContent = React.forwardRef<HTMLDivElement, CardContentProps>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={clsx("text-sm text-foreground/80", className)} {...props} />
  ),
);

CardContent.displayName = "CardContent";
