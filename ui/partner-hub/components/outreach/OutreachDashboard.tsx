"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Users } from "lucide-react";
import { clsx } from "clsx";

import { withBasePath } from "@/lib/basePath";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProspectsPanel } from "./ProspectsPanel";
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
 * Prospects/Templates tabs scoped to whichever campaign is selected.
 */
export function OutreachDashboard() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [tab, setTab] = useState<"prospects" | "templates">("prospects");

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

  return (
    <Card>
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle>Campaigns</CardTitle>
          {!creating ? (
            <Button size="sm" variant="secondary" onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4" /> New campaign
            </Button>
          ) : null}
        </div>

        {creating ? (
          <div className="flex flex-col gap-2 rounded-lg border border-border/60 p-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-foreground/70">Campaign name</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. RE:Invent 2026"
                className="w-full rounded-lg border border-border/60 px-3 py-2 text-sm"
                autoFocus
              />
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-foreground/70">Description (optional)</label>
              <input
                type="text"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                className="w-full rounded-lg border border-border/60 px-3 py-2 text-sm"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="md" onClick={() => setCreating(false)}>
                Cancel
              </Button>
              <Button size="md" onClick={handleCreateCampaign} disabled={creatingBusy}>
                {creatingBusy ? "Creating…" : "Create"}
              </Button>
            </div>
          </div>
        ) : null}
        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        {!loading && campaigns.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            {campaigns.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedId(c.id)}
                className={clsx(
                  "rounded-full border px-3 py-1.5 text-sm font-medium transition",
                  c.id === selectedId
                    ? "border-button-primary bg-button-primary text-button-primary-foreground"
                    : "border-border/60 text-foreground/70 hover:bg-muted/60"
                )}
              >
                {c.name}
                <span className={clsx("ml-1.5 text-xs", c.id === selectedId ? "opacity-80" : "text-foreground/40")}>
                  {c.prospectCount}
                </span>
              </button>
            ))}
          </div>
        ) : null}
      </CardHeader>

      <CardContent>
        {loading ? (
          <p className="text-sm text-foreground/60">Loading campaigns…</p>
        ) : campaigns.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border/60 p-8 text-center text-sm text-foreground/60">
            <Users className="mx-auto mb-2 h-6 w-6 text-foreground/30" />
            No campaigns yet. Create one above to start importing prospects and sending outreach.
          </div>
        ) : selectedCampaign ? (
          <div className="space-y-4">
            {selectedCampaign.description ? (
              <p className="text-sm text-foreground/60">{selectedCampaign.description}</p>
            ) : null}

            <div className="flex gap-1 border-b border-border/60">
              {(["prospects", "templates"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={clsx(
                    "-mb-px border-b-2 px-3 py-2 text-sm font-medium capitalize transition",
                    tab === t
                      ? "border-button-primary text-foreground"
                      : "border-transparent text-foreground/50 hover:text-foreground"
                  )}
                >
                  {t === "templates" ? `Templates (${selectedCampaign.templateCount})` : "Prospects"}
                </button>
              ))}
            </div>

            {tab === "prospects" ? (
              <ProspectsPanel key={selectedCampaign.id} campaignId={selectedCampaign.id} />
            ) : (
              <TemplatesPanel key={selectedCampaign.id} campaignId={selectedCampaign.id} />
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
