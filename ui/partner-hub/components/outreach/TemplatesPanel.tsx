"use client";

import { useCallback, useEffect, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { ClipboardPaste, Copy, FileText, Pencil, Plus, Trash2, Upload, Wand2 } from "lucide-react";

import { withBasePath } from "@/lib/basePath";
import { Button } from "@/components/ui/button";
import { previewMerge, PLACEHOLDER_HINT } from "./mergePreview";
import { importPastedContent, looksLikeHtml, prepareForSending } from "@/lib/outreach/templateImport";

/** File types the import accepts (converted server-side; see api/outreach/templates/import). */
const IMPORT_ACCEPT = ".docx,.eml,.html,.htm,.txt,.md,text/html,text/plain,message/rfc822";

export interface Template {
  id: number;
  campaignId: number;
  name: string;
  subject: string;
  html: string;
  /** Which sequence email this template is (1-3), or null if it isn't one. */
  sequenceStep: number | null;
  updatedAt: string;
}

interface Draft {
  name: string;
  subject: string;
  html: string;
  sequenceStep: number | null;
}

const BLANK_DRAFT: Draft = { name: "", subject: "", html: "", sequenceStep: null };

/**
 * Per-campaign template library, DB-backed (see lib/outreach/templates.ts)
 * -- create, edit, and delete templates right here instead of editing a
 * file in the repo and redeploying. The same editor form is used for both
 * "new template" and "editing an existing one"; which one is active is
 * just whether `editingId` is set.
 */
export function TemplatesPanel({
  campaignId,
  startNewForStep,
  onStarted,
  onSaved,
}: {
  campaignId: number;
  /** Open the editor on a new template tagged for this sequence email (from the Batches tab). */
  startNewForStep?: number | null;
  onStarted?: () => void;
  /** Called after a template is created/updated, so counts elsewhere can refresh. */
  onSaved?: () => void;
}) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<number | null | "new">(null);
  const [draft, setDraft] = useState<Draft>(BLANK_DRAFT);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  /** What the last import changed (merge fields, booking link, tracking), shown above the editor. */
  const [importNotes, setImportNotes] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [dragOver, setDragOver] = useState(false);
  /** Save problems shown right next to the Save button (the panel-level message can be scrolled out of view). */
  const [saveError, setSaveError] = useState<string | null>(null);
  /** Fields left empty on the last Save attempt -- outlined in red until filled. */
  const [missing, setMissing] = useState<Set<"name" | "subject" | "html">>(new Set());

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

  useEffect(() => {
    if (!startNewForStep) return;
    setDraft({
      ...BLANK_DRAFT,
      name: `Email ${startNewForStep} follow-up`,
      subject: suggestedSubject(startNewForStep),
      sequenceStep: startNewForStep,
    });
    setEditingId("new");
    setMessage(`New Email ${startNewForStep} template — it'll be picked automatically when you send Email ${startNewForStep} from the Batches tab.`);
    onStarted?.();
  }, [startNewForStep, onStarted]);

  // Templates load after the editor may already be open (e.g. "Create Email 2
  // template" from the Batches tab): fill in the suggested follow-up subject then.
  useEffect(() => {
    if (editingId !== "new" || !draft.sequenceStep || draft.sequenceStep < 2) return;
    setDraft((d) => (d.subject ? d : { ...d, subject: suggestedSubject(d.sequenceStep) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templates]);

  function startNew() {
    setDraft(BLANK_DRAFT);
    setEditingId("new");
    setMessage(null);
    setImportNotes([]);
    setPasteOpen(false);
    setSaveError(null);
    setMissing(new Set());
  }

  function startEdit(t: Template) {
    setDraft({ name: t.name, subject: t.subject, html: t.html, sequenceStep: t.sequenceStep ?? null });
    setEditingId(t.id);
    setMessage(null);
    setImportNotes([]);
    setPasteOpen(false);
    setSaveError(null);
    setMissing(new Set());
  }

  /** New template starting from a copy of an existing one (e.g. Email 1 as the basis for Email 2). */
  function startCopy(t: Template) {
    const nextStep = t.sequenceStep && t.sequenceStep < 3 ? t.sequenceStep + 1 : null;
    setDraft({
      name: `${t.name} (copy)`,
      // A follow-up reads as a reply to the earlier email, which usually keeps it in the same thread.
      subject: nextStep && !/^re:/i.test(t.subject) ? `Re: ${t.subject}` : t.subject,
      html: t.html,
      sequenceStep: nextStep,
    });
    setEditingId("new");
    setImportNotes([]);
    setPasteOpen(false);
    setSaveError(null);
    setMissing(new Set());
    setMessage(`Copied "${t.name}"${nextStep ? ` as a starting point for Email ${nextStep}` : ""} — edit it, then save.`);
  }

  /**
   * For a follow-up (Email 2/3) with no subject yet: "Re: <the earlier email's
   * subject>", which usually keeps it in the same thread as the first email.
   */
  function suggestedSubject(step: number | null): string {
    if (!step || step < 2) return "";
    const earlier =
      templates.find((t) => t.sequenceStep === step - 1) ??
      (step === 2 ? templates.find((t) => t.sequenceStep === null) : undefined);
    if (!earlier) return "";
    return /^re:/i.test(earlier.subject) ? earlier.subject : `Re: ${earlier.subject}`;
  }

  /** Put an import's result into the editor, without overwriting a name/subject the person already typed. */
  function applyImport(result: { name?: string; subject?: string | null; html: string; notes: string[] }, source: string) {
    if (editingId === null) setEditingId("new");
    const notes = [...result.notes];
    const suggested = !draft.subject && !result.subject ? suggestedSubject(draft.sequenceStep) : "";
    if (suggested) notes.push(`Subject set to "${suggested}" so it threads with the earlier email — change it if you like.`);
    else if (!draft.subject && !result.subject) notes.push("No subject found — type one in the Subject field before saving.");
    setDraft((d) => ({
      ...d,
      name: d.name || result.name || "",
      subject: d.subject || result.subject || suggested,
      html: result.html,
    }));
    setImportNotes(notes);
    setSaveError(null);
    setMissing(new Set());
    setMessage(`Imported ${source} — review the preview, then save.`);
  }

  function convertPasted() {
    if (!pasteText.trim()) return;
    applyImport(importPastedContent(pasteText), "pasted text");
    setPasteText("");
    setPasteOpen(false);
  }

  /**
   * Import an email someone already has -- Word (.docx), a saved email
   * (.eml), HTML or plain text -- into the editor. The server converts it
   * (paragraphs and lists, {{FIRST_NAME}}-style merge fields, the tracked
   * {{BOOKING_LINK}}, {{TRACKING_PIXEL}}); nothing is saved until the person
   * reviews it and clicks Save.
   */
  async function importFile(file: File) {
    setMessage(null);
    setImporting(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(withBasePath("/api/outreach/templates/import"), { method: "POST", body: form });
      const data = await res.json().catch(() => null);
      if (!data?.ok) {
        setMessage(`Import failed: ${data?.error ?? `HTTP ${res.status}`}`);
        return;
      }
      applyImport(data, `"${file.name}"`);
    } catch (err) {
      setMessage(`Import failed: ${err instanceof Error ? err.message : "could not read that file."}`);
    } finally {
      setImporting(false);
    }
  }

  async function handleImportFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) await importFile(file);
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) importFile(file);
  }

  async function handleSave() {
    const empty = new Set<"name" | "subject" | "html">();
    if (!draft.name.trim()) empty.add("name");
    if (!draft.subject.trim()) empty.add("subject");
    if (!draft.html.trim()) empty.add("html");
    setMissing(empty);
    if (empty.size > 0) {
      const labels = { name: "Template name", subject: "Subject", html: "HTML body" };
      setSaveError(`Fill in ${Array.from(empty).map((k) => labels[k]).join(" and ")} to save.`);
      return;
    }
    setSaving(true);
    setSaveError(null);
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
        setSaveError(`Save failed: ${data?.error ?? `HTTP ${res.status}`}`);
        return;
      }
      setEditingId(null);
      setImportNotes([]);
      setMissing(new Set());
      setMessage(`Saved "${draft.name.trim()}"${draft.sequenceStep ? ` — it'll be used for Email ${draft.sequenceStep} on the Batches tab` : ""}.`);
      refresh();
      onSaved?.();
    } catch (err) {
      setSaveError(`Save failed: ${err instanceof Error ? err.message : "network error"} — check your connection and try again.`);
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
  const fieldClass = (field: "name" | "subject") =>
    `w-full rounded-lg border px-3 py-2 text-sm ${missing.has(field) ? "border-red-500 ring-1 ring-red-500" : "border-border/60"}`;
  function clearMissing(field: "name" | "subject" | "html") {
    if (!missing.has(field)) return;
    const next = new Set(missing);
    next.delete(field);
    setMissing(next);
    if (next.size === 0) setSaveError(null);
  }
  const missingPixel = !/\{\{\s*TRACKING_PIXEL\s*\}\}/.test(draft.html);
  const missingBooking = !/\{\{\s*BOOKING_LINK\s*\}\}/.test(draft.html);

  return (
    <div className="space-y-4">
      <input
        ref={importInputRef}
        type="file"
        accept={IMPORT_ACCEPT}
        className="hidden"
        onChange={handleImportFile}
      />

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground/80">Templates</h3>
        {!isEditorOpen ? (
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => importInputRef.current?.click()} disabled={importing}>
              <Upload className="h-4 w-4" /> {importing ? "Importing…" : "Import template"}
            </Button>
            <Button size="sm" variant="secondary" onClick={startNew}>
              <Plus className="h-4 w-4" /> New template
            </Button>
          </div>
        ) : null}
      </div>

      {message ? <p className="text-sm text-foreground/70">{message}</p> : null}

      {isEditorOpen ? (
        <div
          className={`space-y-3 rounded-lg border p-4 ${dragOver ? "border-button-primary bg-muted/30" : "border-border/60"}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold">{editingId === "new" ? "New template" : "Edit template"}</h4>
          </div>

          {/* Start from something that already exists */}
          <div className="flex flex-wrap items-center gap-2 rounded-lg bg-muted/30 px-3 py-2">
            <span className="text-xs font-medium text-foreground/70">
              {editingId === "new" ? "Start from:" : "Replace the body with:"}
            </span>
            <Button size="sm" variant="secondary" onClick={() => importInputRef.current?.click()} disabled={importing}>
              <Upload className="h-4 w-4" /> {importing ? "Importing…" : "Import file"}
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setPasteOpen((o) => !o)}>
              <ClipboardPaste className="h-4 w-4" /> Paste text
            </Button>
            {editingId === "new" && templates.length > 0 ? (
              <select
                value=""
                onChange={(e) => {
                  const t = templates.find((x) => x.id === Number(e.target.value));
                  if (t) startCopy(t);
                }}
                className="h-8 rounded-md border border-border/60 bg-background px-2 text-xs"
              >
                <option value="">Copy an existing template…</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                    {t.sequenceStep ? ` (Email ${t.sequenceStep})` : ""}
                  </option>
                ))}
              </select>
            ) : null}
            <span className="text-xs text-foreground/50">
              Word (.docx), saved email (.eml), HTML or text — or drop a file here.
            </span>
          </div>

          {pasteOpen ? (
            <div className="space-y-2 rounded-lg border border-border/60 p-3">
              <label className="block text-xs font-medium text-foreground/70">
                Paste your email as written (plain text or HTML). Bullets, [First Name]-style fields and a copied booking link are converted.
              </label>
              <textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                rows={10}
                autoFocus
                placeholder={"Hi [First Name],\n\nI'm following up on my last note…"}
                className="w-full rounded-lg border border-border/60 p-2 text-sm"
              />
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="ghost" onClick={() => setPasteOpen(false)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={convertPasted} disabled={!pasteText.trim()}>
                  Convert &amp; use
                </Button>
              </div>
            </div>
          ) : null}

          {importNotes.length > 0 ? (
            <ul className="list-disc space-y-0.5 rounded-lg border border-border/60 bg-muted/20 py-2 pl-7 pr-3 text-xs text-foreground/70">
              {importNotes.map((n, i) => (
                <li key={i}>{n}</li>
              ))}
            </ul>
          ) : null}

          <p className="text-xs text-foreground/60">{PLACEHOLDER_HINT}</p>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground/70">Template name</label>
              <input
                type="text"
                value={draft.name}
                onChange={(e) => {
                  setDraft((d) => ({ ...d, name: e.target.value }));
                  clearMissing("name");
                }}
                placeholder="e.g. Initial invite"
                className={fieldClass("name")}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground/70">Subject</label>
              <input
                type="text"
                value={draft.subject}
                onChange={(e) => {
                  setDraft((d) => ({ ...d, subject: e.target.value }));
                  clearMissing("subject");
                }}
                placeholder={draft.sequenceStep && draft.sequenceStep > 1 ? "e.g. Re: your Email 1 subject" : "Subject line"}
                className={fieldClass("subject")}
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-foreground/70">Sequence email</label>
            <select
              value={draft.sequenceStep ?? ""}
              onChange={(e) => setDraft((d) => ({ ...d, sequenceStep: e.target.value ? Number(e.target.value) : null }))}
              className="rounded-lg border border-border/60 px-3 py-2 text-sm"
            >
              <option value="">Not part of the sequence</option>
              <option value={1}>Email 1</option>
              <option value={2}>Email 2</option>
              <option value={3}>Email 3</option>
            </select>
            <p className="mt-1 text-xs text-foreground/50">
              When you choose which email to send on the Batches tab, the template tagged for it is picked automatically.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="block text-xs font-medium text-foreground/70">HTML body</label>
                {draft.html.trim() && !looksLikeHtml(draft.html) ? (
                  <button
                    type="button"
                    onClick={() => applyImport(importPastedContent(draft.html), "the text in the body")}
                    className="inline-flex items-center gap-1 text-xs font-medium text-foreground/60 underline decoration-dotted hover:text-foreground"
                    title="This looks like plain text -- convert it to email HTML (paragraphs, bullets, merge fields, tracking)."
                  >
                    <Wand2 className="h-3.5 w-3.5" /> Convert plain text to email
                  </button>
                ) : null}
              </div>
              <textarea
                value={draft.html}
                onChange={(e) => {
                  setDraft((d) => ({ ...d, html: e.target.value }));
                  clearMissing("html");
                }}
                rows={16}
                spellCheck={false}
                className={`w-full rounded-lg border p-2 font-mono text-xs ${missing.has("html") ? "border-red-500 ring-1 ring-red-500" : "border-border/60"}`}
              />
              {draft.html.trim() && looksLikeHtml(draft.html) && (missingPixel || missingBooking) ? (
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-amber-800 dark:text-amber-300">
                  <span>
                    {missingPixel && missingBooking
                      ? "No {{TRACKING_PIXEL}} or {{BOOKING_LINK}} — opens and clicks won't be tracked."
                      : missingPixel
                        ? "No {{TRACKING_PIXEL}} — opens won't be tracked."
                        : "No {{BOOKING_LINK}} — clicks won't be tracked."}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const notes: string[] = [];
                      const html = prepareForSending(draft.html, notes);
                      setDraft((d) => ({ ...d, html }));
                      setImportNotes(notes);
                    }}
                    className="font-medium underline decoration-dotted"
                  >
                    Fix it
                  </button>
                </div>
              ) : null}
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
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setEditingId(null);
                setImportNotes([]);
                setPasteOpen(false);
                setSaveError(null);
                setMissing(new Set());
              }}
            >
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save template"}
            </Button>
          </div>
          {saveError ? (
            <p role="alert" className="text-right text-sm font-medium text-red-600 dark:text-red-400">
              {saveError}
            </p>
          ) : null}
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
              <p className="truncate text-sm font-medium">
                {t.name}
                {t.sequenceStep ? (
                  <span className="ml-2 rounded-full bg-muted px-2 py-0.5 align-middle text-[11px] font-medium text-foreground/70">
                    Email {t.sequenceStep}
                  </span>
                ) : null}
              </p>
              <p className="truncate text-xs text-foreground/60">{t.subject}</p>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button variant="ghost" size="sm" onClick={() => startCopy(t)} title="Copy into a new template">
                <Copy className="h-4 w-4" />
              </Button>
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
