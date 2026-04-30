"use client";

import { ReactNode, useMemo, useState } from "react";
import { sizingFields, workloadLibrary } from "./workload-mapper-data";
import { buildWorkloadProfile, getSelectedWorkload } from "./workload-mapper-utils";
import { AiPattern, WorkloadFormState } from "./workload-mapper-types";

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
  const [walkthroughMode, setWalkthroughMode] = useState(false);
  const [customCategory, setCustomCategory] = useState("Custom");
  const [customDescription, setCustomDescription] = useState("");
  const [customAssumptions, setCustomAssumptions] = useState("");
  const [customPressurePoints, setCustomPressurePoints] = useState("");

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

  return (
    <div className="space-y-6 pb-10">
      <HeroSection />
      <WalkthroughToggle enabled={walkthroughMode} onToggle={() => setWalkthroughMode((v) => !v)} />

      {walkthroughMode ? (
        <WalkthroughView
          profile={profile}
          workloadName={state.workloadName || selected?.name || "Custom workload"}
          workloadDescription={isCustom ? customDescription : selected?.description || ""}
          assumptions={isCustom ? customAssumptions : selected?.assumptions.join(", ") || ""}
        />
      ) : (
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
            <BomInputCapture state={state} onStateChange={setState} />
          </div>

          <div className="space-y-6">
            <ArchitecturePipeline steps={profile.architectureSteps} />
            <PressurePointChips points={profile.pressurePoints} />
            <BuildingBlocks blocks={profile.buildingBlocks} />
            <BomReadinessCard profile={profile} />
            <TalkTrackCard profile={profile} />
          </div>
        </section>
      )}
    </div>
  );
}

function HeroSection() { return <section className="rounded-2xl border border-border/60 bg-gradient-to-r from-slate-50 to-white p-6 shadow-sm"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground/50">AI Workload Discovery Mapper</p><h1 className="mt-2 text-3xl font-semibold">Story-first discovery from use case to BOM readiness</h1><p className="mt-3 text-sm text-foreground/70">This guided flow helps align AI workload context, architecture pressure points, and BOM-readiness inputs before detailed solution sizing.</p></section>; }

function WalkthroughToggle({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <section className="rounded-xl border border-border/60 bg-card p-3 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold">Walkthrough Mode</p>
          <p className="text-xs text-foreground/60">Screen-share friendly discovery narrative view.</p>
        </div>
        <button className="rounded-md border px-3 py-1 text-sm font-medium" onClick={onToggle}>
          {enabled ? "Exit Walkthrough Mode" : "Enter Walkthrough Mode"}
        </button>
      </div>
    </section>
  );
}

function WorkloadSelectionCard(props: any) { const { state, onStateChange, isCustom, selectedDescription } = props; return <Card title="Workload selection"><select className="w-full rounded-md border px-3 py-2 text-sm" value={state.selectedWorkloadId} onChange={(e)=>onStateChange((p: WorkloadFormState)=>({...p,selectedWorkloadId:e.target.value,aiPattern:"Not sure yet"}))}>{workloadLibrary.map((w)=><option key={w.id} value={w.id}>{w.category} — {w.name}</option>)}<option value="custom">Custom Workload</option></select>{isCustom ? <CustomWorkloadFields {...props} /> : <p className="mt-3 text-sm text-foreground/70">{selectedDescription}</p>}</Card>; }

function CustomWorkloadFields({ state, customCategory, customDescription, customAssumptions, customPressurePoints, onStateChange, onCustomCategoryChange, onCustomDescriptionChange, onCustomAssumptionsChange, onCustomPressurePointsChange }: any) { return <div className="mt-4 grid gap-3"><Input label="Workload name" value={state.workloadName} onChange={(v)=>onStateChange((p: WorkloadFormState)=>({...p,workloadName:v}))}/><Select label="Category" value={customCategory} options={["FSI", "HPC / AI", "Custom"]} onChange={onCustomCategoryChange}/><Input label="Description / business goal" value={customDescription} onChange={onCustomDescriptionChange}/><Select label="Selected AI pattern" value={state.aiPattern} options={aiPatterns} onChange={(v)=>onStateChange((p: WorkloadFormState)=>({...p,aiPattern:v as AiPattern}))}/><Input label="Assumptions (comma-separated)" value={customAssumptions} onChange={onCustomAssumptionsChange}/><Input label="Likely pressure points (comma-separated)" value={customPressurePoints} onChange={onCustomPressurePointsChange}/></div>; }

function DiscoveryQuestionnaire({ state, onStateChange }: any) { return <Card title="Discovery questionnaire"><div className="space-y-4"><div className="grid gap-3 md:grid-cols-2"><Input label="Process/decision being improved" value={state.processImproved} onChange={(v)=>onStateChange((p: WorkloadFormState)=>({...p,processImproved:v}))}/><Input label="Success criteria" value={state.successCriteria} onChange={(v)=>onStateChange((p: WorkloadFormState)=>({...p,successCriteria:v}))}/><Select label="AI pattern" value={state.aiPattern} options={aiPatterns} onChange={(v)=>onStateChange((p: WorkloadFormState)=>({...p,aiPattern:v as AiPattern}))}/></div><DataProfileSection state={state} onStateChange={onStateChange}/><div className="grid gap-3 md:grid-cols-2"><Select label="Performance tier" value={state.performanceTier} options={["real-time", "near real-time", "intraday", "batch/end-of-day"]} onChange={(v)=>onStateChange((p: WorkloadFormState)=>({...p,performanceTier:v as WorkloadFormState["performanceTier"]}))}/><Input label="Latency requirement" value={state.latencyRequirement} onChange={(v)=>onStateChange((p: WorkloadFormState)=>({...p,latencyRequirement:v}))}/><Input label="Concurrency" value={state.queryConcurrency} onChange={(v)=>onStateChange((p: WorkloadFormState)=>({...p,queryConcurrency:v,sizingInputs:{...p.sizingInputs,queryConcurrency:v}}))}/><Select label="GPU dependency" value={state.gpuDependency} options={["Low", "Medium", "High"]} onChange={(v)=>onStateChange((p: WorkloadFormState)=>({...p,gpuDependency:v}))}/></div><GovernanceSection state={state} onStateChange={onStateChange}/></div></Card>; }

function DataProfileSection({ state, onStateChange }: any) { return <section className="rounded-lg border border-border/60 p-3"><h3 className="text-sm font-semibold">Data profile</h3><div className="mt-3 grid gap-3 md:grid-cols-2"><MultiSelectChips label="Data types" selected={state.dataTypes} options={dataTypeOptions} onToggle={(option)=>onStateChange((p: WorkloadFormState)=>({...p,dataTypes:p.dataTypes.includes(option)?p.dataTypes.filter((i)=>i!==option):[...p.dataTypes,option]}))}/><Input label="Data size range" value={state.dataSizeRange} onChange={(v)=>onStateChange((p: WorkloadFormState)=>({...p,dataSizeRange:v}))}/><Input label="Daily ingest range" value={state.dailyIngestRange} onChange={(v)=>onStateChange((p: WorkloadFormState)=>({...p,dailyIngestRange:v}))}/><Input label="File/object pattern" value={state.filePattern} onChange={(v)=>onStateChange((p: WorkloadFormState)=>({...p,filePattern:v}))}/><Input label="Freshness requirement" value={state.freshnessRequirement} onChange={(v)=>onStateChange((p: WorkloadFormState)=>({...p,freshnessRequirement:v}))}/></div></section>; }

function GovernanceSection({ state, onStateChange }: any) { return <section className="rounded-lg border border-border/60 p-3"><h3 className="text-sm font-semibold">Governance and risk</h3><div className="mt-3 grid gap-3 md:grid-cols-2"><Select label="Data sensitivity" value={state.dataSensitivity} options={["Low", "Moderate", "High", "Regulated / Highly sensitive"]} onChange={(v)=>onStateChange((p: WorkloadFormState)=>({...p,dataSensitivity:v}))}/><Select label="Audit trail" value={state.auditTrail} options={["Baseline", "Strict"]} onChange={(v)=>onStateChange((p: WorkloadFormState)=>({...p,auditTrail:v}))}/><Select label="Encryption" value={state.encryption} options={["Required", "Optional"]} onChange={(v)=>onStateChange((p: WorkloadFormState)=>({...p,encryption:v}))}/><Select label="Data residency" value={state.dataResidency} options={["Local", "Regional", "Global"]} onChange={(v)=>onStateChange((p: WorkloadFormState)=>({...p,dataResidency:v}))}/><Input label="Retention" value={state.retention} onChange={(v)=>onStateChange((p: WorkloadFormState)=>({...p,retention:v}))}/><Select label="Explainability" value={state.explainability} options={["Required", "Preferred", "Not required"]} onChange={(v)=>onStateChange((p: WorkloadFormState)=>({...p,explainability:v}))}/><Input label="Access controls" value={state.accessControls} onChange={(v)=>onStateChange((p: WorkloadFormState)=>({...p,accessControls:v}))}/></div></section>; }

function BomInputCapture({ state, onStateChange }: any) { return <Card title="BOM input capture"><div className="grid gap-3 md:grid-cols-2">{sizingFields.map((f)=><Input key={f.key} label={f.label} value={state.sizingInputs[f.key]} onChange={(v)=>onStateChange((p: WorkloadFormState)=>({...p,sizingInputs:{...p.sizingInputs,[f.key]:v}}))}/>)}</div></Card>; }
function ArchitecturePipeline({ steps }: { steps: string[] }) { return <Card title="Architecture pipeline"><ol className="space-y-2">{steps.map((step, index)=><li key={step} className="rounded-md border bg-muted/20 px-3 py-2 text-sm"><span className="mr-2 font-semibold text-foreground/60">{index + 1}.</span>{step}</li>)}</ol></Card>; }
function PressurePointChips({ points }: { points: string[] }) { return <Card title="Top pressure points"><div className="flex flex-wrap gap-2">{points.map((point)=><span key={point} className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs">{point}</span>)}</div></Card>; }
function BuildingBlocks({ blocks }: { blocks: Record<string, string[]> }) { return <Card title="Key building blocks">{Object.entries(blocks).map(([group, values])=><div key={group} className="mb-4"><h3 className="text-sm font-semibold">{group}</h3><ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-foreground/70">{values.map((value)=><li key={value}>{value}</li>)}</ul></div>)}</Card>; }
function BomReadinessCard({ profile }: { profile: ReturnType<typeof buildWorkloadProfile> }) { return <Card title="BOM readiness"><div className="h-3 rounded-full bg-muted"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${profile.readinessPercent}%` }} /></div><p className="mt-2 text-sm font-semibold">{profile.readinessPercent}% readiness</p><p className="mt-2 text-xs font-medium">This is BOM readiness, not a BOM.</p><p className="mt-2 text-xs text-foreground/70">Known inputs: {profile.knownInputs.length} | Missing inputs: {profile.missingInputs.length}</p><ul className="mt-2 space-y-1 text-xs">{profile.missingInputs.slice(0, 5).map((item)=><li key={item.label}><span className="font-medium">{item.label}:</span> {item.whyItMatters}</li>)}</ul><p className="mt-3 text-xs font-semibold">Next best questions</p><ul className="list-disc pl-5 text-xs">{profile.missingInputs.slice(0, 3).map((item)=><li key={item.label}>Can we quantify {item.label.toLowerCase()}?</li>)}</ul></Card>; }
function TalkTrackCard({ profile }: { profile: ReturnType<typeof buildWorkloadProfile> }) { return <Card title="Talk track"><ul className="space-y-2 text-sm">{profile.talkTrack.map((line)=><li key={line}>• {line}</li>)}</ul></Card>; }

function WalkthroughView({ profile, workloadName, workloadDescription, assumptions }: { profile: ReturnType<typeof buildWorkloadProfile>; workloadName: string; workloadDescription: string; assumptions: string; }) { return <section className="space-y-5 rounded-2xl border border-border/60 bg-card p-6 shadow-sm"><h2 className="text-2xl font-semibold">Walkthrough: {workloadName}</h2><p className="text-sm text-foreground/80">{workloadDescription || "Description to be confirmed."}</p><p className="text-sm text-foreground/70"><span className="font-semibold">Assumptions:</span> {assumptions || "Assumptions not yet captured."}</p><p className="text-sm"><span className="font-semibold">Classification:</span> {profile.classification}</p><ArchitecturePipeline steps={profile.architectureSteps} /><PressurePointChips points={profile.pressurePoints} /><BuildingBlocks blocks={profile.buildingBlocks} /><BomReadinessCard profile={profile} /><TalkTrackCard profile={profile} /></section>; }

function Card({ title, children }: { title: string; children: ReactNode }) { return <section className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm"><h2 className="text-sm font-semibold uppercase tracking-wide text-foreground/60">{title}</h2><div className="mt-3">{children}</div></section>; }
function Input({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <label className="text-xs font-medium text-foreground/70">{label}<input className="mt-1 w-full rounded-md border border-border/70 px-2 py-2 text-sm" value={value} onChange={(event) => onChange(event.target.value)} /></label>; }
function Select({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) { return <label className="text-xs font-medium text-foreground/70">{label}<select className="mt-1 w-full rounded-md border border-border/70 bg-background px-2 py-2 text-sm" value={value} onChange={(event) => onChange(event.target.value)}>{options.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>; }
function MultiSelectChips({ label, options, selected, onToggle }: { label: string; options: string[]; selected: string[]; onToggle: (option: string) => void; }) { return <div><p className="text-xs font-medium text-foreground/70">{label}</p><div className="mt-1 flex flex-wrap gap-2">{options.map((option)=><button type="button" key={option} className={`rounded-full border px-3 py-1 text-xs ${selected.includes(option) ? "border-primary bg-primary/10" : "border-border bg-background"}`} onClick={() => onToggle(option)}>{option}</button>)}</div></div>; }
