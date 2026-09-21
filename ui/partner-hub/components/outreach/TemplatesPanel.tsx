"use client";

import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";
import { FileText, Pencil, Plus, Trash2, Upload } from "lucide-react";

import { withBasePath } from "@/lib/basePath";
import { Button } from "@/components/ui/button";
import { previewMerge, PLACEHOLDER_HINT } from "./mergePreview";

export interface Template {
  id: number;
  campaignId: number;
  name: string;
  subject: string;
  html: string;
  updatedAt: string;
}

const BLANK_DRAFT = { name: "", subject: "", html: "" };

/**
 * Per-campaign template library, DB-backed (see lib/outreach/templates.ts)
 * -- create, edit, and delete templates right here instead of editing a
 * file in the repo and redeploying. The same editor form is used for both
 * "new template" and "editing an existing one"; which one is active is
 * just whether `editingId` is set.
 */
export function TemplatesPanel({ campaignId }: { campaignId: number }) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<number | null | "new">(null);
  const [draft, setDraft] = useState(BLANK_DRAFT);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(withBasePath(`/api/outreach/templates?campaignId=${campaignId}`), {
        cache: "no-store",
      });
      const data = await res.json().catch(() => null);
      if (data?.ok) setTemplates(data.templates);
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    refresh();
    setEditingId(null);
  }, [refresh]);

  function startNew() {
    setDraft(BLANK_DRAFT);
    setEditingId("new");
    setMessage(null);
  }

  function startEdit(t: Template) {
    setDraft({ name: t.name, subject: t.subject, html: t.html });
    setEditingId(t.id);
    setMessage(null);
  }

  /**
   * Loads an .html/.htm/.txt file's contents into the body field, so a
   * template someone already has as a file (exported from an email client,
   * a design tool, or a previous campaign) doesn't have to be retyped or
   * pasted by hand. {{PLACEHOLDER}} merge tokens in the file carry through
   * untouched, same as typing them directly. If the name/subject fields are
   * still empty, they're filled in from the file's <title> tag (subject)
   * and filename (name) as a starting point -- both stay fully editable
   * either way, and neither is required to come from the file.
   */
  async function handleImportFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setMessage(null);
    try {
      const text = await file.text();
      const titleMatch = text.match(/<title[^>]*>([^<]*)<\/title>/i);
      const inferredSubject = titleMatch?.[1]?.trim();
      const inferredName = file.name.replace(/\.(html?|txt)$/i, "").replace(/[-_]+/g, " ").trim();

      if (editingId === null) setEditingId("new");
      setDraft((d) => ({
        name: d.name || inferredName,
        subject: d.subject || inferredSubject || "",
        html: text,
      }));
      setMessage(`Imported "${file.name}" into the HTML body.`);
    } catch (err) {
      setMessage(`Import failed: ${err instanceof Error ? err.message : "could not read that file."}`);
    } finally {
      e.target.value = "";
    }
  }

  async function handleSave() {
    if (!draft.name.trim() || !draft.subject.trim() || !draft.html.trim()) {
      setMessage("Name, subject, and body are all required.");
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const isNew = editingId === "new";
      const res = await fetch(
        withBasePath(isNew ? "/api/outreach/templates" : `/api/outreach/templates/${editingId}`),
        {
          method: isNew ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(isNew ? { campaignId, ...draft } : draft),
        }
      );
      const data = await res.json().catch(() => null);
      if (!data?.ok) {
        setMessage(`Save failed: ${data?.error ?? `HTTP ${res.status}`}`);
        return;
      }
      setEditingId(null);
      refresh();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this template? This can't be undone.")) return;
    setDeletingId(id);
    try {
      const res = await fetch(withBasePath(`/api/outreach/templates/${id}`), { method: "DELETE" });
      const data = await res.json().catch(() => null);
      if (!data?.ok) {
        setMessage(`Delete failed: ${data?.error ?? `HTTP ${res.status}`}`);
        return;
      }
      if (editingId === id) setEditingId(null);
      refresh();
    } finally {
      setDeletingId(null);
    }
  }

  const isEditorOpen = editingId !== null;

  return (
    <div className="space-y-4">
      <input
        ref={importInputRef}
        type="file"
        accept=".html,.htm,.txt,text/html,text/plain"
        className="hidden"
        onChange={handleImportFile}
      />

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground/80">Templates</h3>
        {!isEditorOpen ? (
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => importInputRef.current?.click()}>
              <Upload className="h-4 w-4" /> Import HTML
            </Button>
            <Button size="sm" variant="secondary" onClick={startNew}>
              <Plus className="h-4 w-4" /> New template
            </Button>
          </div>
        ) : null}
      </div>

      {message ? <p className="text-sm text-foreground/70">{message}</p> : null}

      {isEditorOpen ? (
        <div className="space-y-3 rounded-lg border border-border/60 p-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold">{editingId === "new" ? "New template" : "Edit template"}</h4>
          </div>
          <p className="text-xs text-foreground/60">{PLACEHOLDER_HINT}</p>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground/70">Template name</label>
              <input
                type="text"
                value={draft.name}
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                placeholder="e.g. Initial invite"
                className="w-full rounded-lg border border-border/60 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground/70">Subject</label>
              <input
                type="text"
                value={draft.subject}
                onChange={(e) => setDraft((d) => ({ ...d, subject: e.target.value }))}
                className="w-full rounded-lg border border-border/60 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="block text-xs font-medium text-foreground/70">HTML body</label>
                <button
                  type="button"
                  onClick={() => importInputRef.current?.click()}
                  className="text-xs font-medium text-foreground/60 underline decoration-dotted hover:text-foreground"
                >
                  Import file…
                </button>
              </div>
              <textarea
                value={draft.html}
                onChange={(e) => setDraft((d) => ({ ...d, html: e.target.value }))}
                rows={16}
                spellCheck={false}
                className="w-full rounded-lg border border-border/60 p-2 font-mono text-xs"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground/70">Preview (sample data)</label>
              <iframe
                title="Template preview"
                srcDoc={previewMerge(draft.html)}
                sandbox=""
                className="h-[420px] w-full rounded-lg border border-border/60 bg-white"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setEditingId(null)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save template"}
            </Button>
          </div>
        </div>
      ) : null}

      <div className="space-y-2">
        {loading && templates.length === 0 ? (
          <p className="text-sm text-foreground/60">Loading templates…</p>
        ) : null}
        {!loading && templates.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border/60 p-6 text-center text-sm text-foreground/60">
            <FileText className="mx-auto mb-2 h-6 w-6 text-foreground/30" />
            No templates yet for this campaign. Create one to start sending.
          </div>
        ) : null}
        {templates.map((t) => (
          <div
            key={t.id}
            className="flex items-center justify-between gap-3 rounded-lg border border-border/60 p-3"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{t.name}</p>
              <p className="truncate text-xs text-foreground/60">{t.subject}</p>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button variant="ghost" size="sm" onClick={() => startEdit(t)} title="Edit">
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(t.id)}
                disabled={deletingId === t.id}
                title="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
