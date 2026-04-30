"use client";

import { ReactNode, useMemo, useState } from "react";
import { buildWorkloadProfile, getSelectedWorkload } from "./workload-mapper-utils";
import { sizingFields, workloadLibrary } from "./workload-mapper-data";
import { AiPattern, WorkloadFormState } from "./workload-mapper-types";

const aiPatterns: AiPattern[] = ["RAG", "Fine-tuning", "Training from scratch", "Inference only", "Analytics / ML pipeline", "HPC simulation", "Not sure yet"];
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
  dataSensitivity: "High-sensitivity",
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
  const [state, setState] = useState<WorkloadFormState>(initialState);
  const selected = getSelectedWorkload(state.selectedWorkloadId);

  const profile = useMemo(() => buildWorkloadProfile(state), [state]);

  return (
    <div className="space-y-6 pb-10">
      <section className="rounded-2xl border border-border/60 bg-gradient-to-r from-slate-50 to-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground/50">AI Workload Discovery Mapper</p>
        <h1 className="mt-2 text-3xl font-semibold">Story-first discovery from use case to BOM readiness</h1>
        <p className="mt-3 max-w-4xl text-sm text-foreground/70">Use this framework to move from unfamiliar workload language into a repeatable architecture discovery motion: use case → pattern → data → pressure points → reference building blocks → BOM readiness gaps.</p>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="space-y-6">
          <Card title="Preloaded workload library + custom option">
            <select className="w-full rounded-md border border-border/70 bg-background px-3 py-2 text-sm" value={state.selectedWorkloadId} onChange={(event) => setState((prev) => ({ ...prev, selectedWorkloadId: event.target.value, aiPattern: "Not sure yet" }))}>
              {workloadLibrary.map((workload) => <option key={workload.id} value={workload.id}>{workload.category} — {workload.name}</option>)}
              <option value="custom">Custom Workload</option>
            </select>
            <input className="mt-3 w-full rounded-md border border-border/70 px-3 py-2 text-sm" placeholder="Custom workload name (optional)" value={state.workloadName} onChange={(event) => setState((prev) => ({ ...prev, workloadName: event.target.value }))} />
            {selected && <div className="mt-3 rounded-lg bg-muted/50 p-3 text-sm"><p className="font-semibold">{selected.description}</p><ul className="mt-2 list-disc space-y-1 pl-5 text-foreground/70">{selected.assumptions.map((a) => <li key={a}>{a}</li>)}</ul></div>}
          </Card>

          <Card title="Guided discovery questionnaire">
            <div className="grid gap-3 md:grid-cols-2">
              <Input label="Process/decision being improved" value={state.processImproved} onChange={(value) => setState((prev) => ({ ...prev, processImproved: value }))} />
              <Input label="Success criteria" value={state.successCriteria} onChange={(value) => setState((prev) => ({ ...prev, successCriteria: value }))} />
              <Select label="AI pattern" value={state.aiPattern} options={aiPatterns} onChange={(value) => setState((prev) => ({ ...prev, aiPattern: value as AiPattern }))} />
              <Select label="Performance window" value={state.performanceTier} options={["real-time", "near real-time", "intraday", "batch/end-of-day"]} onChange={(value) => setState((prev) => ({ ...prev, performanceTier: value as WorkloadFormState["performanceTier"] }))} />
              <Input label="Data size range" value={state.dataSizeRange} onChange={(value) => setState((prev) => ({ ...prev, dataSizeRange: value }))} />
              <Input label="Daily ingest range" value={state.dailyIngestRange} onChange={(value) => setState((prev) => ({ ...prev, dailyIngestRange: value }))} />
              <Input label="File/object pattern" value={state.filePattern} onChange={(value) => setState((prev) => ({ ...prev, filePattern: value }))} />
              <Input label="Data freshness requirement" value={state.freshnessRequirement} onChange={(value) => setState((prev) => ({ ...prev, freshnessRequirement: value }))} />
              <Input label="Query concurrency" value={state.queryConcurrency} onChange={(value) => setState((prev) => ({ ...prev, queryConcurrency: value, sizingInputs: { ...prev.sizingInputs, queryConcurrency: value } }))} />
              <Input label="Latency requirement" value={state.latencyRequirement} onChange={(value) => setState((prev) => ({ ...prev, latencyRequirement: value }))} />
            </div>
            <div className="mt-3">
              <p className="text-xs font-medium uppercase tracking-wide text-foreground/60">Data types</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {dataTypeOptions.map((option) => {
                  const active = state.dataTypes.includes(option);
                  return <button key={option} type="button" className={`rounded-full border px-3 py-1 text-xs ${active ? "border-primary bg-primary/10" : "border-border/60"}`} onClick={() => setState((prev) => ({ ...prev, dataTypes: active ? prev.dataTypes.filter((item) => item !== option) : [...prev.dataTypes, option] }))}>{option}</button>;
                })}
              </div>
            </div>
          </Card>

          <Card title="BOM input capture">
            <div className="grid gap-3 md:grid-cols-2">
              {sizingFields.map((field) => <Input key={field.key} label={field.label} value={state.sizingInputs[field.key]} onChange={(value) => setState((prev) => ({ ...prev, sizingInputs: { ...prev.sizingInputs, [field.key]: value } }))} />)}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Dynamic workload profile">
            <p className="text-sm font-semibold text-foreground">{profile.classification}</p>
            <p className="mt-2 text-sm text-foreground/70">Flow: Customer use case → Workload pattern → Data requirements → AI/model approach → Infrastructure pressure points → Reference architecture building blocks → BOM readiness gaps → Talk track.</p>
          </Card>

          <Card title="Architecture pattern output">
            <div className="flex flex-wrap items-center gap-2">
              {profile.architectureSteps.map((step, index) => (
                <div key={step} className="flex items-center gap-2 text-xs">
                  <span className="rounded-md border border-border/60 bg-muted/30 px-2 py-1">{step}</span>
                  {index < profile.architectureSteps.length - 1 && <span className="text-foreground/40">→</span>}
                </div>
              ))}
            </div>
          </Card>

          <Card title="Bottleneck / constraint mapping">
            <ul className="space-y-2 text-sm">
              {profile.pressurePoints.map((point) => <li key={point} className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2">{point}</li>)}
            </ul>
          </Card>

          <Card title="Reference architecture building blocks">
            <div className="grid gap-3 md:grid-cols-2">
              {Object.entries(profile.buildingBlocks).map(([category, items]) => <div key={category} className="rounded-lg border border-border/60 p-3"><p className="text-sm font-semibold">{category}</p><ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-foreground/70">{items.map((item) => <li key={item}>{item}</li>)}</ul></div>)}
            </div>
          </Card>

          <Card title="BOM readiness & missing sizing inputs">
            <div className="h-3 overflow-hidden rounded-full bg-muted"><div className="h-full bg-emerald-500" style={{ width: `${profile.readinessPercent}%` }} /></div>
            <p className="mt-2 text-sm font-semibold">Readiness: {profile.readinessPercent}%</p>
            <div className="mt-3 grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-foreground/50">Known inputs</p>
                <ul className="mt-2 space-y-1 text-xs">{profile.knownInputs.map((input) => <li key={input.label}><span className="font-medium">{input.label}:</span> {input.value}</li>)}</ul>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-foreground/50">Missing inputs + why they matter</p>
                <ul className="mt-2 space-y-2 text-xs">{profile.missingInputs.map((input) => <li key={input.label} className="rounded-md border border-border/60 p-2"><p className="font-medium">{input.label}</p><p className="text-foreground/70">{input.whyItMatters}</p></li>)}</ul>
              </div>
            </div>
          </Card>

          <Card title="Executive / SE talk track + walkthrough mode">
            <ol className="list-decimal space-y-2 pl-5 text-sm text-foreground/80">{profile.talkTrack.map((line) => <li key={line}>{line}</li>)}</ol>
          </Card>
        </div>
      </section>
    </div>
  );
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return <section className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm"><h2 className="text-sm font-semibold uppercase tracking-wide text-foreground/60">{title}</h2><div className="mt-3">{children}</div></section>;
}

function Input({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="text-xs font-medium text-foreground/70">{label}<input className="mt-1 w-full rounded-md border border-border/70 px-2 py-2 text-sm" value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}

function Select({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return <label className="text-xs font-medium text-foreground/70">{label}<select className="mt-1 w-full rounded-md border border-border/70 bg-background px-2 py-2 text-sm" value={value} onChange={(event) => onChange(event.target.value)}>{options.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>;
}
