"use client";

import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";

type AccountMappingHeaderProps = {
  isDemoLoading: boolean;
  demoError: string | null;
  currentStep: number;
  isTourActive: boolean;
  onLoadDemo: () => void;
  onStartTour: () => void;
};

export const AccountMappingHeader = ({
  isDemoLoading,
  demoError,
  currentStep,
  isTourActive,
  onLoadDemo,
  onStartTour,
}: AccountMappingHeaderProps) => {
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  const steps = useMemo(() => ["Upload", "Map", "Match", "Review", "Search", "Export"], []);

  useEffect(() => {
    if (!isHelpOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsHelpOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isHelpOpen]);

  return (
    <header className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Account Mapping</h1>
          <p className="max-w-2xl text-base text-foreground/70">
            Match partner + vendor accounts, reduce review queues, and generate target lists in minutes.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={onLoadDemo}
            disabled={isDemoLoading}
            aria-label="Load demo dataset"
            aria-busy={isDemoLoading}
          >
            {isDemoLoading ? "Loading demo…" : "Load demo dataset"}
          </Button>
          <Button
            variant="secondary"
            onClick={onStartTour}
            aria-label="Start walkthrough"
            disabled={isTourActive}
          >
            Walkthrough
          </Button>
          <Button
            variant="ghost"
            onClick={() => setIsHelpOpen(true)}
            aria-label="Open account mapping help"
          >
            Help
          </Button>
        </div>
      </div>
      {demoError && (
        <p className="text-sm text-destructive" role="alert">
          {demoError}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
        {steps.map((step, index) => (
          <div
            key={step}
            data-tour={step.toLowerCase()}
            className={`rounded-full px-3 py-1 shadow-sm ${
              index <= currentStep
                ? "bg-confirm text-confirm-foreground border border-confirm-strong"
                : "bg-confirm-soft text-confirm-foreground/70 border border-confirm"
            }`}
          >
            {step}
          </div>
        ))}
      </div>
      {isHelpOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-10">
          <div
            className="w-full max-w-lg rounded-xl border border-foreground/10 bg-background p-6 shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-label="Account mapping walkthrough"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">Account mapping flow</h2>
                <p className="mt-1 text-sm text-foreground/70">
                  Follow the end-to-end flow from data upload to export.
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setIsHelpOpen(false)}>
                Close
              </Button>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-sm font-medium">
              {steps.map((step, index) => (
                <div key={step} className="flex items-center gap-2 text-foreground/80">
                  <span className="rounded-full border border-border px-3 py-1">{step}</span>
                  {index < steps.length - 1 && <span aria-hidden="true">→</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
