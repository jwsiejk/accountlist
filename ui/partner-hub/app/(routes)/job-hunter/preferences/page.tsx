"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { getDefaultPreferences, normalizePreferences } from "@/lib/job-hunter/preferences";
import { loadJobHunterStore, saveJobHunterStore } from "@/lib/job-hunter/storage";

const toLines = (items: string[]) => items.join("\n");

const parseLines = (value: string) =>
  value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

export default function JobHunterPreferencesPage() {
  const initialStore = loadJobHunterStore();
  const initialPreferences = normalizePreferences(initialStore.preferences);

  const [targetRolesText, setTargetRolesText] = useState(toLines(initialPreferences.targetRoles));
  const [targetKeywordsText, setTargetKeywordsText] = useState(toLines(initialPreferences.targetKeywords));
  const [hybridLocationsText, setHybridLocationsText] = useState(toLines(initialPreferences.preferredHybridLocations));
  const [remoteRegionsText, setRemoteRegionsText] = useState(toLines(initialPreferences.preferredRemoteRegions));
  const [allowRemoteRoles, setAllowRemoteRoles] = useState(initialPreferences.allowRemoteRoles);
  const [allowHybridRoles, setAllowHybridRoles] = useState(initialPreferences.allowHybridRoles);
  const [allowOnsiteRoles, setAllowOnsiteRoles] = useState(initialPreferences.allowOnsiteRoles);
  const [excludedCompaniesText, setExcludedCompaniesText] = useState(toLines(initialPreferences.excludedCompanies));
  const [excludedTitlesText, setExcludedTitlesText] = useState(toLines(initialPreferences.excludedTitles));
  const [minimumScore, setMinimumScore] = useState(String(initialPreferences.minimumScore ?? 0));
  const [message, setMessage] = useState<string | null>(null);

  const applyDefaultsToForm = () => {
    const defaults = getDefaultPreferences();
    setTargetRolesText(toLines(defaults.targetRoles));
    setTargetKeywordsText(toLines(defaults.targetKeywords));
    setHybridLocationsText(toLines(defaults.preferredHybridLocations));
    setRemoteRegionsText(toLines(defaults.preferredRemoteRegions));
    setAllowRemoteRoles(defaults.allowRemoteRoles);
    setAllowHybridRoles(defaults.allowHybridRoles);
    setAllowOnsiteRoles(defaults.allowOnsiteRoles);
    setExcludedCompaniesText("");
    setExcludedTitlesText("");
    setMinimumScore(String(defaults.minimumScore ?? 0));
  };

  const handleSave = () => {
    const normalized = normalizePreferences({
      targetRoles: parseLines(targetRolesText),
      targetKeywords: parseLines(targetKeywordsText),
      preferredHybridLocations: parseLines(hybridLocationsText),
      preferredRemoteRegions: parseLines(remoteRegionsText),
      targetLocations: parseLines(hybridLocationsText),
      allowRemoteRoles,
      allowHybridRoles,
      allowOnsiteRoles,
      excludedCompanies: parseLines(excludedCompaniesText),
      excludedTitles: parseLines(excludedTitlesText),
      minimumScore: Number(minimumScore),
    });

    const currentStore = loadJobHunterStore();
    saveJobHunterStore({ ...currentStore, preferences: normalized });
    setMinimumScore(String(normalized.minimumScore ?? 0));
    setMessage("Preferences saved.");
  };

  const handleReset = () => {
    applyDefaultsToForm();
    setMessage("Form reset to defaults. Click Save Preferences to persist.");
  };

  const handleRestoreJamesDefaults = () => {
    applyDefaultsToForm();
    setMessage("James defaults restored. Click Save Preferences to persist.");
  };

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Targeting Preferences</h1>
        <p className="text-sm text-foreground/70">Personalize scoring and filtering for your job search goals.</p>
      </header>

      <section className="grid gap-4 rounded-lg border border-border/60 p-4 md:grid-cols-2">
        <label className="space-y-2 text-sm">
          <span className="font-medium">Target roles (one per line)</span>
          <textarea className="min-h-28 w-full rounded-md border border-border/60 bg-background p-3" value={targetRolesText} onChange={(event) => setTargetRolesText(event.target.value)} />
        </label>

        <label className="space-y-2 text-sm">
          <span className="font-medium">Target keywords (one per line)</span>
          <textarea className="min-h-28 w-full rounded-md border border-border/60 bg-background p-3" value={targetKeywordsText} onChange={(event) => setTargetKeywordsText(event.target.value)} />
        </label>

        <label className="space-y-2 text-sm">
          <span className="font-medium">Preferred hybrid locations (one per line)</span>
          <textarea className="min-h-28 w-full rounded-md border border-border/60 bg-background p-3" value={hybridLocationsText} onChange={(event) => setHybridLocationsText(event.target.value)} />
        </label>

        <label className="space-y-2 text-sm">
          <span className="font-medium">Preferred remote regions (one per line)</span>
          <textarea className="min-h-28 w-full rounded-md border border-border/60 bg-background p-3" value={remoteRegionsText} onChange={(event) => setRemoteRegionsText(event.target.value)} />
        </label>

        <label className="space-y-2 text-sm">
          <span className="font-medium">Excluded companies (one per line)</span>
          <textarea className="min-h-28 w-full rounded-md border border-border/60 bg-background p-3" value={excludedCompaniesText} onChange={(event) => setExcludedCompaniesText(event.target.value)} />
        </label>

        <label className="space-y-2 text-sm">
          <span className="font-medium">Excluded titles (one per line)</span>
          <textarea className="min-h-28 w-full rounded-md border border-border/60 bg-background p-3" value={excludedTitlesText} onChange={(event) => setExcludedTitlesText(event.target.value)} />
        </label>

        <div className="space-y-4 text-sm">
          <label className="flex items-center gap-2">
            <input checked={allowRemoteRoles} onChange={(event) => setAllowRemoteRoles(event.target.checked)} type="checkbox" />
            <span className="font-medium">Allow remote roles</span>
          </label>
          <label className="flex items-center gap-2">
            <input checked={allowHybridRoles} onChange={(event) => setAllowHybridRoles(event.target.checked)} type="checkbox" />
            <span className="font-medium">Allow hybrid roles</span>
          </label>
          <label className="flex items-center gap-2">
            <input checked={allowOnsiteRoles} onChange={(event) => setAllowOnsiteRoles(event.target.checked)} type="checkbox" />
            <span className="font-medium">Allow onsite roles</span>
          </label>

          <label className="space-y-2">
            <span className="font-medium">Minimum score</span>
            <input className="w-full rounded-md border border-border/60 bg-background px-3 py-2" min={0} max={100} step={1} type="number" value={minimumScore} onChange={(event) => setMinimumScore(event.target.value)} />
          </label>
        </div>
      </section>

      <section className="flex flex-wrap items-center gap-3">
        <Button onClick={handleSave} type="button">Save Preferences</Button>
        <Button onClick={handleReset} type="button" variant="secondary">Reset to Defaults</Button>
        <Button onClick={handleRestoreJamesDefaults} type="button" variant="secondary">Restore James Defaults</Button>
        {message ? <p className="text-sm text-foreground/70">{message}</p> : null}
      </section>
    </main>
  );
}
