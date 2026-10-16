"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Users } from "lucide-react";
import { clsx } from "clsx";

import { withBasePath } from "@/lib/basePath";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProspectsPanel } from "./ProspectsPanel";
import { ReportPanel } from "./ReportPanel";
import { TemplatesPanel } from "./TemplatesPanel";

interface Campaign {
  id: number;
  name: string;
  description: string | null;
  createdAt: string;
  prospectCount: number;
  templateCount: number;
}

const LAST_CAMPAIGN_KEY = "outreach.lastCampaignId";

/**
 * Top-level shell: a campaign switcher (each campaign is a fully separate
 * prospect list + template library, sharing only the one send/reply
 * infrastructure -- see docs/OUTREACH_SETUP.md) and, below it, the
 * Contacts & sending / Report / Templates tabs scoped to whichever campaign is selected.
 * Within a campaign, contacts are organised into batches (one per round of
 * outreach) and tracked through the Email 1 -> 2 -> 3 sequence.
 */
export function OutreachDashboard() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [tab, setTab] = useState<"prospects" | "report" | "templates">("prospects");
  /** Set when the Batches tab asks for a new template for a given sequence email. */
  const [newTemplateStep, setNewTemplateStep] = useState<number | null>(null);

  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [creatingBusy, setCreatingBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (preferId?: number) => {
    setLoading(true);
    try {
      const res = await fetch(withBasePath("/api/outreach/campaigns"), { cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (!data?.ok) return;
      setCampaigns(data.campaigns);

      setSelectedId((prev) => {
        const candidates = [preferId, prev].filter((id): id is number => typeof id === "number");
        for (const id of candidates) {
          if (data.campaigns.some((c: Campaign) => c.id === id)) return id;
        }
        if (data.campaigns.length > 0) return data.campaigns[0].id;
        return null;
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let stored: number | null = null;
    try {
      const raw = window.localStorage.getItem(LAST_CAMPAIGN_KEY);
      stored = raw ? Number(raw) : null;
    } catch {
      // Private browsing / storage blocked -- fine, just won't remember
      // the last-selected campaign across visits.
    }
    refresh(stored ?? undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedId == null) return;
    try {
      window.localStorage.setItem(LAST_CAMPAIGN_KEY, String(selectedId));
    } catch {
      // Ignore -- purely a convenience, not required for correctness.
    }
  }, [selectedId]);

  async function handleCreateCampaign() {
    if (!newName.trim()) {
      setError("Campaign name is required.");
      return;
    }
    setCreatingBusy(true);
    setError(null);
    try {
      const res = await fetch(withBasePath("/api/outreach/campaigns"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName, description: newDescription || undefined }),
      });
      const data = await res.json().catch(() => null);
      if (!data?.ok) {
        setError(data?.error ?? `HTTP ${res.status}`);
        return;
      }
      setNewName("");
      setNewDescription("");
      setCreating(false);
      await refresh(data.campaign.id);
    } finally {
      setCreatingBusy(false);
    }
  }

  const selectedCampaign = campaigns.find((c) => c.id === selectedId) ?? null;

  const tabs = [
    { id: "prospects" as const, label: "Contacts & sending", count: selectedCampaign?.prospectCount },
    { id: "report" as const, label: "Report" },
    { id: "templates" as const, label: "Templates", count: selectedCampaign?.templateCount },
  ];

  return (
    <div className="space-y-5">
      {/* Campaign switcher */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-foreground/45">Campaign</span>
        {!loading
          ? campaigns.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedId(c.id)}
                className={clsx(
                  "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition",
                  c.id === selectedId
                    ? "border-button-primary bg-button-primary text-button-primary-foreground shadow-sm dark:border-foreground/40"
                    : "border-border/60 bg-card text-foreground/70 hover:border-border hover:text-foreground"
                )}
              >
                {c.name}
                <span className={clsx("text-xs tabular-nums", c.id === selectedId ? "opacity-70" : "text-foreground/40")}>
                  {c.prospectCount}
                </span>
              </button>
            ))
          : null}
        <div className="flex-1" />
        {!creating ? (
          <Button size="sm" variant="secondary" onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" /> New campaign
          </Button>
        ) : null}
      </div>

      {creating ? (
        <div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-card p-4 shadow-sm sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-foreground/60">Campaign name</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. RE:Invent 2026"
              className="h-10 w-full rounded-md border border-border/70 bg-card px-3 text-sm"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreateCampaign();
                if (e.key === "Escape") setCreating(false);
              }}
            />
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-foreground/60">Description (optional)</label>
            <input
              type="text"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              className="h-10 w-full rounded-md border border-border/70 bg-card px-3 text-sm"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="md" onClick={() => setCreating(false)}>
              Cancel
            </Button>
            <Button size="md" onClick={handleCreateCampaign} disabled={creatingBusy}>
              {creatingBusy ? "Creating…" : "Create campaign"}
            </Button>
          </div>
        </div>
      ) : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {loading ? (
        <Card>
          <CardContent>
            <p className="text-sm text-foreground/60">Loading campaigns…</p>
          </CardContent>
        </Card>
      ) : campaigns.length === 0 ? (
        <Card>
          <CardContent>
            <div className="py-8 text-center">
              <Users className="mx-auto mb-3 h-8 w-8 text-foreground/25" />
              <p className="text-base font-medium text-foreground">No campaigns yet</p>
              <p className="mt-1 text-sm text-foreground/60">
                A campaign holds its own contact list and email templates. Create one to start.
              </p>
              <Button className="mt-4" size="md" onClick={() => setCreating(true)}>
                <Plus className="h-4 w-4" /> New campaign
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : selectedCampaign ? (
        <Card className="!p-0">
          <CardHeader className="!mb-0 !gap-0 border-b border-border/60 px-6 pt-5">
            <CardTitle className="text-xl">{selectedCampaign.name}</CardTitle>
            {selectedCampaign.description ? (
              <p className="mt-0.5 text-sm text-foreground/60">{selectedCampaign.description}</p>
            ) : null}
            <nav className="-mb-px mt-4 flex gap-5" aria-label="Campaign sections">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  aria-current={tab === t.id ? "page" : undefined}
                  className={clsx(
                    "inline-flex items-center gap-1.5 border-b-2 pb-3 text-sm font-medium transition",
                    tab === t.id
                      ? "border-button-primary text-foreground"
                      : "border-transparent text-foreground/50 hover:border-border hover:text-foreground"
                  )}
                >
                  {t.label}
                  {t.count !== undefined ? (
                    <span
                      className={clsx(
                        "rounded-full px-1.5 py-px text-[11px] tabular-nums",
                        tab === t.id ? "bg-button-primary text-button-primary-foreground" : "bg-muted text-foreground/55"
                      )}
                    >
                      {t.count}
                    </span>
                  ) : null}
                </button>
              ))}
            </nav>
          </CardHeader>

          <CardContent className="p-6">
            {tab === "prospects" ? (
              <ProspectsPanel
                key={selectedCampaign.id}
                campaignId={selectedCampaign.id}
                onCreateTemplate={(step) => {
                  setNewTemplateStep(step);
                  setTab("templates");
                }}
              />
            ) : tab === "report" ? (
              <ReportPanel key={selectedCampaign.id} campaignId={selectedCampaign.id} />
            ) : (
              <TemplatesPanel
                key={selectedCampaign.id}
                campaignId={selectedCampaign.id}
                startNewForStep={newTemplateStep}
                onStarted={() => setNewTemplateStep(null)}
                onSaved={() => refresh(selectedCampaign.id)}
              />
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
