"use client";

import { type Dispatch, type ReactNode, type SetStateAction, useMemo, useState } from "react";

import type { WorkloadSummaryRequest } from "@/lib/workload-mapper/summarize-types";
import { toSelectionContext } from "@/lib/workload-mapper/summarize-types";

import { sizingFields, workloadExamplePresets, workloadLibrary } from "./workload-mapper-data";
import { buildWorkloadProfile, getSelectedWorkload } from "./workload-mapper-utils";
import { getDdnReferencePattern } from "./workload-mapper-ddn-reference";
import { getPipelineStepHelp } from "./workload-mapper-pipeline-help";
import { type AiPattern, type WorkloadFormState, type WorkloadTemplate } from "./workload-mapper-types";

type StateSetter = Dispatch<SetStateAction<WorkloadFormState>>;

interface WorkloadStateProps {
  state: WorkloadFormState;
  onStateChange: StateSetter;
}

interface WorkloadSelectionCardProps extends WorkloadStateProps {
  selectedDescription?: string;
  isCustom: boolean;
  customCategory: string;
  customDescription: string;
  customAssumptions: string;
  customPressurePoints: string;
  onCustomCategoryChange: (value: string) => void;
  onCustomDescriptionChange: (value: string) => void;
  onCustomAssumptionsChange: (value: string) => void;
  onCustomPressurePointsChange: (value: string) => void;
}

interface CardProps {
  title: string;
  children: ReactNode;
}

interface InputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

interface SelectProps<T extends string> {
  label: string;
  value: T;
  options: readonly T[];
  onChange: (value: T) => void;
}

interface MultiSelectChipsProps {
  label: string;
  options: string[];
  selected: string[];
  onToggle: (option: string) => void;
}

const aiPatterns: AiPattern[] = [
  "RAG",
  "Fine-tuning",
  "Training from scratch",
  "Inference only",
  "Analytics / ML pipeline",
  "HPC simulation",
  "Not sure yet",
];

const dataTypeOptions = ["structured", "unstructured", "semi-structured", "streaming", "batch"];

const initialState: WorkloadFormState = {
  workloadName: "",
  selectedWorkloadId: workloadLibrary[0]?.id ?? "",
  processImproved: "",
  successCriteria: "",
  aiPattern: "Not sure yet",
  dataTypes: [],
  dataSizeRange: "",
  dailyIngestRange: "",
  filePattern: "",
  freshnessRequirement: "",
  performanceTier: "near real-time",
  queryConcurrency: "",
  gpuDependency: "Medium",
  latencyRequirement: "",
  dataSensitivity: "High",
  auditTrail: "Strict",
  encryption: "Required",
  dataResidency: "Regional",
  retention: "",
  explainability: "Required",
  accessControls: "RBAC + ABAC",
  sizingInputs: {
    exactDataVolume: "",
    dailyIngestRate: "",
    fileObjectCount: "",
    queryConcurrency: "",
    modelSize: "",
    gpuRequirement: "",
    retentionPeriod: "",
    haDrRequirements: "",
    preferredVendors: "",
    budgetTimeline: "",
  },
};

export function WorkloadMapper() {
  const [state, setState] = useState(initialState);
  const [customCategory, setCustomCategory] = useState("Custom");
  const [customDescription, setCustomDescription] = useState("");
  const [customAssumptions, setCustomAssumptions] = useState("");
  const [customPressurePoints, setCustomPressurePoints] = useState("");
  const [summary, setSummary] = useState("");
  const [summaryError, setSummaryError] = useState("");
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [bomSummary, setBomSummary] = useState("");
  const [bomSummaryError, setBomSummaryError] = useState("");
  const [isGeneratingBomSummary, setIsGeneratingBomSummary] = useState(false);

  const isCustom = state.selectedWorkloadId === "custom";
  const selected = getSelectedWorkload(state.selectedWorkloadId);

  const profile = useMemo(
    () =>
      buildWorkloadProfile(
        state,
        isCustom
          ? {
              name: state.workloadName,
              category: customCategory,
              description: customDescription,
              defaultPattern: state.aiPattern,
              assumptions: customAssumptions,
              pressurePoints: customPressurePoints,
            }
          : undefined,
      ),
    [state, isCustom, customCategory, customDescription, customAssumptions, customPressurePoints],
  );


  const summarizeWorkload = async () => {
    setIsSummarizing(true);
    setSummaryError("");
    try {
      const payload: WorkloadSummaryRequest = {
        workload: toSelectionContext(selected, state, {
          category: customCategory,
          description: customDescription,
          assumptions: customAssumptions,
          pressurePoints: customPressurePoints,
        }),
        customWorkload: {
          category: customCategory,
          description: customDescription,
          assumptions: customAssumptions,
          pressurePoints: customPressurePoints,
        },
        questionnaire: state,
        knownInputs: profile.knownInputs,
        missingInputs: profile.missingInputs,
        architecturePipeline: profile.architectureSteps,
        buildingBlocks: profile.buildingBlocks,
        ddnReferencePattern: getDdnReferencePattern(isCustom ? "custom" : state.selectedWorkloadId, state.aiPattern),
      };

      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
      const response = await fetch(`${basePath}/api/workload-mapper/summarize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const responseText = await response.text();
      let data: { summary?: string; error?: string } | null = null;

      try {
        data = JSON.parse(responseText) as { summary?: string; error?: string };
      } catch {
        throw new Error(
          "Summarizer endpoint returned a non-JSON response. Check the API route/basePath configuration.",
        );
      }

      if (!response.ok || !data?.summary) {
        throw new Error(data?.error || "Could not generate summary.");
      }
      setSummary(data.summary);
    } catch (error) {
      setSummary("");
      setSummaryError(error instanceof Error ? error.message : "Could not generate summary.");
    } finally {
      setIsSummarizing(false);
    }
  };



  const summarizeBom = async () => {
    setIsGeneratingBomSummary(true);
    setBomSummaryError("");
    try {
      const payload: WorkloadSummaryRequest = {
        workload: toSelectionContext(selected, state, {
          category: customCategory,
          description: customDescription,
          assumptions: customAssumptions,
          pressurePoints: customPressurePoints,
        }),
        customWorkload: {
          category: customCategory,
          description: customDescription,
          assumptions: customAssumptions,
          pressurePoints: customPressurePoints,
        },
        questionnaire: state,
        knownInputs: profile.knownInputs,
        missingInputs: profile.missingInputs,
        architecturePipeline: profile.architectureSteps,
        buildingBlocks: profile.buildingBlocks,
        ddnReferencePattern: getDdnReferencePattern(isCustom ? "custom" : state.selectedWorkloadId, state.aiPattern),
      };

      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
      const response = await fetch(`${basePath}/api/workload-mapper/bom-summary`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const responseText = await response.text();
      let data: { summary?: string; error?: string } | null = null;

      try {
        data = JSON.parse(responseText) as { summary?: string; error?: string };
      } catch {
        throw new Error("BOM summarizer endpoint returned a non-JSON response. Check the API route/basePath configuration.");
      }

      if (!response.ok || !data?.summary) {
        throw new Error(data?.error || "Could not generate BOM summary.");
      }
      setBomSummary(data.summary);
    } catch (error) {
      setBomSummary("");
      setBomSummaryError(error instanceof Error ? error.message : "Could not generate BOM summary.");
    } finally {
      setIsGeneratingBomSummary(false);
    }
  };
  const applyWorkloadExamplePreset = () => {
    const preset = workloadExamplePresets[state.selectedWorkloadId] ?? (isCustom ? workloadExamplePresets.custom : undefined);
    if (!preset) return;
    setState((previousState) => ({
      ...previousState,
      workloadName: isCustom && preset.workloadName ? preset.workloadName : previousState.workloadName,
      processImproved: preset.processImproved,
      successCriteria: preset.successCriteria,
      aiPattern: preset.aiPattern,
      dataTypes: preset.dataTypes,
      dataSizeRange: preset.dataSizeRange,
      dailyIngestRange: preset.dailyIngestRange,
      filePattern: preset.filePattern,
      freshnessRequirement: preset.freshnessRequirement,
      performanceTier: preset.performanceTier,
      queryConcurrency: preset.queryConcurrency,
      gpuDependency: preset.gpuDependency,
      latencyRequirement: preset.latencyRequirement,
      dataSensitivity: preset.dataSensitivity,
      auditTrail: preset.auditTrail,
      encryption: preset.encryption,
      dataResidency: preset.dataResidency,
      retention: preset.retention,
      explainability: preset.explainability,
      accessControls: preset.accessControls,
      sizingInputs: { ...preset.sizingInputs },
    }));
  };

  return (
    <div className="space-y-6 pb-10">
      <HeroSection />
      <section className="grid gap-6 xl:grid-cols-2">
        <div className="space-y-6">
          <WorkloadSelectionCard
            state={state}
            selectedDescription={selected?.description}
            isCustom={isCustom}
            customCategory={customCategory}
            customDescription={customDescription}
            customAssumptions={customAssumptions}
            customPressurePoints={customPressurePoints}
            onStateChange={setState}
            onCustomCategoryChange={setCustomCategory}
            onCustomDescriptionChange={setCustomDescription}
            onCustomAssumptionsChange={setCustomAssumptions}
            onCustomPressurePointsChange={setCustomPressurePoints}
          />
          <DiscoveryQuestionnaire state={state} onStateChange={setState} />
          <BomInputCapture state={state} onStateChange={setState} onApplyPreset={applyWorkloadExamplePreset} />
        </div>

        <div className="space-y-6">
          <ArchitecturePipeline
            steps={profile.architectureSteps}
            state={state}
            selectedWorkload={selected}
            customContext={isCustom ? { workloadName: state.workloadName, category: customCategory } : undefined}
          />
          <PressurePointChips points={profile.pressurePoints} />
          <BuildingBlocks blocks={profile.buildingBlocks} />
          <BomReadinessCard profile={profile} />
          <WhyDdnCard profile={profile} />
          <SummarizeCard summary={summary} error={summaryError} loading={isSummarizing} onSummarize={summarizeWorkload} />
          <BomSummaryCard summary={bomSummary} error={bomSummaryError} loading={isGeneratingBomSummary} onSummarize={summarizeBom} />
        </div>
      </section>
    </div>
  );
}

function HeroSection() {
  return (
    <section className="rounded-2xl border border-border/60 bg-gradient-to-r from-slate-50 to-white p-6 shadow-sm">
      <h1 className="text-3xl font-semibold">AI Workload Discovery Mapper</h1>
      <p className="mt-3 text-sm text-foreground/70">
        This guided flow helps align AI workload context, architecture pressure points, and BOM-readiness
        inputs before detailed solution sizing.
      </p>
    </section>
  );
}

function WorkloadSelectionCard(props: WorkloadSelectionCardProps) {
  const { state, onStateChange, isCustom, selectedDescription } = props;

  const handleWorkloadChange = (value: string) => {
    onStateChange((previousState) => ({
      ...previousState,
      selectedWorkloadId: value,
      aiPattern: "Not sure yet",
    }));
  };

  return (
    <Card title="Workload selection">
      <select
        className="w-full rounded-md border px-3 py-2 text-sm"
        value={state.selectedWorkloadId}
        onChange={(event) => handleWorkloadChange(event.target.value)}
      >
        {workloadLibrary.map((workload) => (
          <option key={workload.id} value={workload.id}>
            {workload.category} — {workload.name}
          </option>
        ))}
        <option value="custom">Custom Workload</option>
      </select>

      {isCustom ? (
        <CustomWorkloadFields {...props} />
      ) : (
        <p className="mt-3 text-sm text-foreground/70">{selectedDescription}</p>
      )}
    </Card>
  );
}

function CustomWorkloadFields({
  state,
  customCategory,
  customDescription,
  customAssumptions,
  customPressurePoints,
  onStateChange,
  onCustomCategoryChange,
  onCustomDescriptionChange,
  onCustomAssumptionsChange,
  onCustomPressurePointsChange,
}: WorkloadSelectionCardProps) {
  const handleWorkloadNameChange = (value: string) => {
    onStateChange((previousState) => ({ ...previousState, workloadName: value }));
  };

  const handlePatternChange = (value: string) => {
    onStateChange((previousState) => ({ ...previousState, aiPattern: value }));
  };

  return (
    <div className="mt-4 grid gap-3">
      <Input label="Workload name" value={state.workloadName} onChange={handleWorkloadNameChange} />
      <Select
        label="Category"
        value={customCategory}
        options={["FSI", "HPC / AI", "Custom"]}
        onChange={onCustomCategoryChange}
      />
      <Input label="Description / business goal" value={customDescription} onChange={onCustomDescriptionChange} />
      <Select label="Selected AI pattern" value={state.aiPattern} options={aiPatterns} onChange={handlePatternChange} />
      <Input
        label="Assumptions (comma-separated)"
        value={customAssumptions}
        onChange={onCustomAssumptionsChange}
      />
      <Input
        label="Likely pressure points (comma-separated)"
        value={customPressurePoints}
        onChange={onCustomPressurePointsChange}
      />
    </div>
  );
}

function DiscoveryQuestionnaire({ state, onStateChange }: WorkloadStateProps) {
  const handlePatternChange = (value: string) => {
    onStateChange((previousState) => ({ ...previousState, aiPattern: value }));
  };

  return (
    <Card title="Discovery questionnaire">
      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2">
          <Input
            label="Process/decision being improved"
            value={state.processImproved}
            onChange={(value) => onStateChange((p) => ({ ...p, processImproved: value }))}
          />
          <Input
            label="Success criteria"
            value={state.successCriteria}
            onChange={(value) => onStateChange((p) => ({ ...p, successCriteria: value }))}
          />
          <Select label="AI pattern" value={state.aiPattern} options={aiPatterns} onChange={handlePatternChange} />
        </div>

        <DataProfileSection state={state} onStateChange={onStateChange} />

        <div className="grid gap-3 md:grid-cols-2">
          <Select
            label="Performance tier"
            value={state.performanceTier}
            options={["real-time", "near real-time", "intraday", "batch/end-of-day"]}
            onChange={(value) =>
              onStateChange((p) => ({ ...p, performanceTier: value }))
            }
          />
          <Input
            label="Latency requirement"
            value={state.latencyRequirement}
            onChange={(value) => onStateChange((p) => ({ ...p, latencyRequirement: value }))}
          />
          <Input
            label="Concurrency"
            value={state.queryConcurrency}
            onChange={(value) =>
              onStateChange((p) => ({
                ...p,
                queryConcurrency: value,
                sizingInputs: { ...p.sizingInputs, queryConcurrency: value },
              }))
            }
          />
          <Select
            label="GPU dependency"
            value={state.gpuDependency}
            options={["Low", "Medium", "High"]}
            onChange={(value) => onStateChange((p) => ({ ...p, gpuDependency: value }))}
          />
        </div>

        <GovernanceSection state={state} onStateChange={onStateChange} />
      </div>
    </Card>
  );
}

function DataProfileSection({ state, onStateChange }: WorkloadStateProps) {
  const handleDataTypeToggle = (option: string) => {
    onStateChange((previousState) => ({
      ...previousState,
      dataTypes: previousState.dataTypes.includes(option)
        ? previousState.dataTypes.filter((item) => item !== option)
        : [...previousState.dataTypes, option],
    }));
  };

  return (
    <section className="rounded-lg border border-border/60 p-3">
      <h3 className="text-sm font-semibold">Data profile</h3>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <MultiSelectChips
          label="Data types"
          selected={state.dataTypes}
          options={dataTypeOptions}
          onToggle={handleDataTypeToggle}
        />
        <Input
          label="Data size range"
          value={state.dataSizeRange}
          onChange={(value) => onStateChange((p) => ({ ...p, dataSizeRange: value }))}
        />
        <Input
          label="Daily ingest range"
          value={state.dailyIngestRange}
          onChange={(value) => onStateChange((p) => ({ ...p, dailyIngestRange: value }))}
        />
        <Input
          label="File/object pattern"
          value={state.filePattern}
          onChange={(value) => onStateChange((p) => ({ ...p, filePattern: value }))}
        />
        <Input
          label="Freshness requirement"
          value={state.freshnessRequirement}
          onChange={(value) => onStateChange((p) => ({ ...p, freshnessRequirement: value }))}
        />
      </div>
    </section>
  );
}

function GovernanceSection({ state, onStateChange }: WorkloadStateProps) {
  return (
    <section className="rounded-lg border border-border/60 p-3">
      <h3 className="text-sm font-semibold">Governance and risk</h3>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <Select
          label="Data sensitivity"
          value={state.dataSensitivity}
          options={["Low", "Moderate", "High", "Regulated / Highly sensitive"]}
          onChange={(value) => onStateChange((p) => ({ ...p, dataSensitivity: value }))}
        />
        <Select
          label="Audit trail"
          value={state.auditTrail}
          options={["Baseline", "Strict"]}
          onChange={(value) => onStateChange((p) => ({ ...p, auditTrail: value }))}
        />
        <Select
          label="Encryption"
          value={state.encryption}
          options={["Required", "Optional"]}
          onChange={(value) => onStateChange((p) => ({ ...p, encryption: value }))}
        />
        <Select
          label="Data residency"
          value={state.dataResidency}
          options={["Local", "Regional", "Global"]}
          onChange={(value) => onStateChange((p) => ({ ...p, dataResidency: value }))}
        />
        <Input
          label="Retention"
          value={state.retention}
          onChange={(value) => onStateChange((p) => ({ ...p, retention: value }))}
        />
        <Select
          label="Explainability"
          value={state.explainability}
          options={["Required", "Preferred", "Not required"]}
          onChange={(value) => onStateChange((p) => ({ ...p, explainability: value }))}
        />
        <Input
          label="Access controls"
          value={state.accessControls}
          onChange={(value) => onStateChange((p) => ({ ...p, accessControls: value }))}
        />
      </div>
    </section>
  );
}

function BomInputCapture({
  state,
  onStateChange,
  onApplyPreset,
}: WorkloadStateProps & { onApplyPreset: () => void }) {
  return (
    <Card title="BOM input capture">
      <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50/70 p-3">
        <p className="text-xs font-semibold text-amber-900">
          Illustrative discovery inputs based on common AI/HPC/FSI workload patterns and DDN-style reference
          architecture thinking — not final sizing recommendations or final BOM guidance.
        </p>
        <p className="mt-1 text-xs text-amber-900/90">
          Examples are illustrative discovery inputs informed by common workload/reference architecture patterns. They are
          not DDN official sizing, final BOM guidance, or SKU recommendations.
        </p>
        <button
          type="button"
          className="mt-2 rounded-md border border-amber-400 bg-white px-3 py-1 text-xs font-semibold text-amber-900"
          onClick={onApplyPreset}
        >
          Auto-populate realistic example for this workload
        </button>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {sizingFields.map((field) => (
          <Input
            key={field.key}
            label={field.label}
            value={state.sizingInputs[field.key]}
            onChange={(value) =>
              onStateChange((p) => ({
                ...p,
                sizingInputs: { ...p.sizingInputs, [field.key]: value },
              }))
            }
          />
        ))}
      </div>
    </Card>
  );
}

function ArchitecturePipeline({
  steps,
  state,
  selectedWorkload,
  customContext,
}: {
  steps: string[];
  state: WorkloadFormState;
  selectedWorkload?: WorkloadTemplate;
  customContext?: { workloadName?: string; category?: string };
}) {
  const [openStep, setOpenStep] = useState<string | null>(null);

  return (
    <Card title="Architecture pipeline">
      <ol className="space-y-2">
        {steps.map((step, index) => (
          <li key={step} className="rounded-md border bg-muted/20 px-3 py-2 text-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <span className="mr-2 font-semibold text-foreground/60">{index + 1}.</span>
                {step}
              </div>
              <button
                type="button"
                aria-label={`Explain ${step}`}
                className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-blue-500/80 bg-blue-500/90 text-[11px] font-semibold text-white hover:bg-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                onClick={() => setOpenStep((current) => (current === step ? null : step))}
              >
                i
              </button>
            </div>
            {openStep === step ? (
              <div className="mt-3 rounded-md border border-blue-200 bg-blue-50/40 p-3 text-xs text-foreground/90">
                {(() => {
                  const help = getPipelineStepHelp({
                    step,
                    workloadId: selectedWorkload?.id,
                    workloadName: customContext?.workloadName || selectedWorkload?.name,
                    category: customContext?.category || selectedWorkload?.category,
                    aiPattern: state.aiPattern,
                    state,
                  });
                  return (
                    <div className="space-y-2">
                      <p><span className="font-semibold">Plain English:</span> {help.plainEnglish}</p>
                      <p><span className="font-semibold">Why it matters:</span> {help.whyItMatters}</p>
                      {help.example ? <p><span className="font-semibold">Example:</span> {help.example}</p> : null}
                      <div>
                        <p className="font-semibold">Discovery questions:</p>
                        <ul className="mt-1 list-disc space-y-1 pl-4">
                          {help.questions.map((question) => (
                            <li key={question}>{question}</li>
                          ))}
                        </ul>
                      </div>
                      {help.ddnAngle ? <p>{help.ddnAngle}</p> : null}
                    </div>
                  );
                })()}
              </div>
            ) : null}
          </li>
        ))}
      </ol>
    </Card>
  );
}

function PressurePointChips({ points }: { points: string[] }) {
  return (
    <Card title="Top pressure points">
      <div className="flex flex-wrap gap-2">
        {points.map((point) => (
          <span key={point} className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs">
            {point}
          </span>
        ))}
      </div>
    </Card>
  );
}

function BuildingBlocks({ blocks }: { blocks: Record<string, string[]> }) {
  return (
    <Card title="Key building blocks">
      {Object.entries(blocks).map(([group, values]) => (
        <div key={group} className="mb-4">
          <h3 className="text-sm font-semibold">{group}</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-foreground/70">
            {values.map((value) => (
              <li key={value}>{value}</li>
            ))}
          </ul>
        </div>
      ))}
    </Card>
  );
}

function BomReadinessCard({ profile }: { profile: ReturnType<typeof buildWorkloadProfile> }) {
  return (
    <Card title="BOM readiness">
      <div className="h-3 rounded-full bg-muted">
        <div className="h-full rounded-full bg-emerald-500" style={{ width: `${profile.readinessPercent}%` }} />
      </div>
      <p className="mt-2 text-sm font-semibold">{profile.readinessPercent}% readiness</p>
      <p className="mt-2 text-xs font-medium">This is BOM readiness, not a BOM.</p>
      <p className="mt-2 text-xs text-foreground/70">
        Known inputs: {profile.knownInputs.length} | Missing inputs: {profile.missingInputs.length}
      </p>
      <ul className="mt-2 space-y-1 text-xs">
        {profile.missingInputs.slice(0, 5).map((item) => (
          <li key={item.label}>
            <span className="font-medium">{item.label}:</span> {item.whyItMatters}
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs font-semibold">Next best questions</p>
      <ul className="list-disc pl-5 text-xs">
        {profile.missingInputs.slice(0, 3).map((item) => (
          <li key={item.label}>Can we quantify {item.label.toLowerCase()}?</li>
        ))}
      </ul>
    </Card>
  );
}

function WhyDdnCard({ profile }: { profile: ReturnType<typeof buildWorkloadProfile> }) {
  return (
    <Card title="Why DDN">
      <ul className="space-y-2 text-sm">
        {profile.whyDdn.map((line) => (
          <li key={line}>• {line}</li>
        ))}
      </ul>
    </Card>
  );
}


function SummarizeCard({
  summary,
  error,
  loading,
  onSummarize,
}: {
  summary: string;
  error: string;
  loading: boolean;
  onSummarize: () => Promise<void>;
}) {
  const copySummary = async () => {
    if (!summary) return;
    await navigator.clipboard.writeText(summary);
  };

  return (
    <Card title="Summarize">
      <p className="mb-3 text-xs text-foreground/70">
        Summary generation uses the local Ollama model configured for this app. Discovery inputs are sent only to the
        local summarization endpoint.
      </p>
      <button type="button" className="rounded-md border px-3 py-2 text-sm font-medium" onClick={onSummarize} disabled={loading}>
        {loading ? "Generating summary..." : "Summarize workload in plain English"}
      </button>
      {error ? (
        <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          <p>{error}</p>
          <p className="mt-2 text-xs">Try: <code>ollama serve</code> and <code>ollama pull &lt;model&gt;</code></p>
        </div>
      ) : null}
      {summary ? (
        <div className="mt-3 rounded-md border border-border/70 bg-muted/20 p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">Plain-English Workload Summary</h3>
            <button type="button" className="rounded-md border px-2 py-1 text-xs" onClick={copySummary}>Copy Summary</button>
          </div>
          <p className="whitespace-pre-wrap text-sm text-foreground/90">{summary}</p>
        </div>
      ) : null}
    </Card>
  );
}

function BomSummaryCard({
  summary,
  error,
  loading,
  onSummarize,
}: {
  summary: string;
  error: string;
  loading: boolean;
  onSummarize: () => Promise<void>;
}) {
  const copySummary = async () => {
    if (!summary) return;
    await navigator.clipboard.writeText(summary);
  };

  return (
    <Card title="BOM Summary">
      <p className="mb-2 text-xs font-medium text-amber-700">
        This is an architecture/BOM-readiness summary, not an actual BOM, quote, or official sizing recommendation.
      </p>
      <p className="mb-3 text-xs text-foreground/70">
        Summary generation uses the local Ollama model configured for this app. Discovery inputs are sent only to the local summarization endpoint.
      </p>
      <button type="button" className="rounded-md border px-3 py-2 text-sm font-medium" onClick={onSummarize} disabled={loading}>
        {loading ? "Generating BOM summary..." : "Generate BOM Summary"}
      </button>
      {error ? (
        <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          <p>{error}</p>
          <p className="mt-2 text-xs">Try: <code>ollama serve</code> and <code>ollama pull &lt;model&gt;</code></p>
        </div>
      ) : null}
      {summary ? (
        <div className="mt-3 rounded-md border border-border/70 bg-muted/20 p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">BOM Summary</h3>
            <button type="button" className="rounded-md border px-2 py-1 text-xs" onClick={copySummary}>Copy Summary</button>
          </div>
          <p className="whitespace-pre-wrap text-sm text-foreground/90">{summary}</p>
        </div>
      ) : null}
    </Card>
  );
}

function Card({ title, children }: CardProps) {
  return (
    <section className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground/60">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Input({ label, value, onChange }: InputProps) {
  return (
    <label className="text-xs font-medium text-foreground/70">
      {label}
      <input
        className="mt-1 w-full rounded-md border border-border/70 px-2 py-2 text-sm"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function Select<T extends string>({ label, value, options, onChange }: SelectProps<T>) {
  return (
    <label className="text-xs font-medium text-foreground/70">
      {label}
      <select
        className="mt-1 w-full rounded-md border border-border/70 bg-background px-2 py-2 text-sm"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function MultiSelectChips({ label, options, selected, onToggle }: MultiSelectChipsProps) {
  return (
    <div>
      <p className="text-xs font-medium text-foreground/70">{label}</p>
      <div className="mt-1 flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            type="button"
            key={option}
            className={`rounded-full border px-3 py-1 text-xs ${
              selected.includes(option) ? "border-primary bg-primary/10" : "border-border bg-background"
            }`}
            onClick={() => onToggle(option)}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}
