"use client";

import { FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { loadJobHunterStore, saveJobHunterStore } from "@/lib/job-hunter/storage";
import { getSourceValidationMessage, truncateBoardToken } from "@/lib/job-hunter/sourceSettings";
import type { BoardType } from "@/lib/job-hunter/types";

const DEFAULT_FORM = {
  company: "",
  boardType: "greenhouse" as BoardType,
  boardToken: "",
};

export default function JobHunterSettingsPage() {
  const [store, setStore] = useState(loadJobHunterStore());
  const [form, setForm] = useState(DEFAULT_FORM);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);


  const addSource = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const company = form.company.trim();
    const boardToken = form.boardToken.trim();

    const message = getSourceValidationMessage(form, store.sources);
    if (message) {
      setValidationMessage(message);
      return;
    }

    const nextStore = {
      ...store,
      sources: [
        ...store.sources,
        {
          company,
          boardType: form.boardType,
          boardToken,
        },
      ],
    };

    saveJobHunterStore(nextStore);
    setStore(nextStore);
    setForm(DEFAULT_FORM);
    setValidationMessage(null);
  };

  const deleteSource = (index: number) => {
    const nextStore = {
      ...store,
      sources: store.sources.filter((_, sourceIndex) => sourceIndex !== index),
    };

    saveJobHunterStore(nextStore);
    setStore(nextStore);
  };

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Job Source Settings</h1>
        <p className="text-sm text-foreground/70">Manage Greenhouse and Lever boards used by Sync Jobs.</p>
      </header>

      <section className="space-y-3 rounded-lg border border-border/60 p-4">
        <h2 className="text-sm font-semibold">Configured Sources</h2>
        {store.sources.length === 0 ? (
          <p className="text-sm text-foreground/70">No sources configured yet.</p>
        ) : (
          <ul className="space-y-2">
            {store.sources.map((source, index) => (
              <li className="flex items-center justify-between rounded-md border border-border/60 p-3" key={`${source.boardType}-${source.boardToken}-${index}`}>
                <p className="text-sm">
                  <span className="font-medium">{source.company}</span> · {source.boardType} · {truncateBoardToken(source.boardToken)}
                </p>
                <Button onClick={() => deleteSource(index)} size="sm" type="button" variant="destructive">
                  Delete
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3 rounded-lg border border-border/60 p-4">
        <h2 className="text-sm font-semibold">Add Source</h2>
        <form className="grid gap-3 md:grid-cols-3" onSubmit={addSource}>
          <input
            className="rounded-md border border-border/60 bg-background px-3 py-2 text-sm"
            onChange={(event) => setForm((prev) => ({ ...prev, company: event.target.value }))}
            placeholder="Company"
            value={form.company}
          />
          <select
            className="rounded-md border border-border/60 bg-background px-3 py-2 text-sm"
            onChange={(event) => setForm((prev) => ({ ...prev, boardType: event.target.value as BoardType }))}
            value={form.boardType}
          >
            <option value="greenhouse">greenhouse</option>
            <option value="lever">lever</option>
          </select>
          <input
            className="rounded-md border border-border/60 bg-background px-3 py-2 text-sm"
            onChange={(event) => setForm((prev) => ({ ...prev, boardToken: event.target.value }))}
            placeholder="Board token"
            value={form.boardToken}
          />
          <div className="md:col-span-3">
            <Button type="submit">Add source</Button>
            {validationMessage ? <p className="mt-2 text-sm text-red-600">{validationMessage}</p> : null}
          </div>
        </form>
      </section>
    </main>
  );
}
