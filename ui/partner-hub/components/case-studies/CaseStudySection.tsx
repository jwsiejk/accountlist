import type { ReactNode } from "react";

type CaseStudySectionProps = {
  title: string;
  eyebrow?: string;
  children: ReactNode;
};

export function CaseStudySection({ title, eyebrow, children }: CaseStudySectionProps) {
  return (
    <section className="space-y-4">
      <div className="space-y-2">
        {eyebrow ? (
          <p className="text-xs font-semibold uppercase tracking-wide text-foreground/50">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="text-xl font-semibold tracking-tight text-foreground">
          {title}
        </h2>
      </div>
      <div className="space-y-4 text-sm text-foreground/70">{children}</div>
    </section>
  );
}
