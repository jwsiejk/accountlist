"use client";

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
}: AccountMappingHeaderProps) => (
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
      </div>
    </div>
    {demoError && (
      <p className="text-sm text-destructive" role="alert">
        {demoError}
      </p>
    )}
    <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
      {["Upload", "Map", "Match", "Review", "Search", "Export"].map((step, index) => (
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
  </header>
);
