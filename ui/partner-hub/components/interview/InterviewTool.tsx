"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const services = [
  { name: "Ollama", url: "http://127.0.0.1:11434" },
  { name: "STT", url: "http://127.0.0.1:9000" },
  { name: "TTS", url: "http://127.0.0.1:8000" },
];

export function InterviewTool() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <header className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-foreground/40">Tools</p>
        <h1 className="text-3xl font-semibold text-foreground">AI Interview</h1>
        <p className="max-w-2xl text-sm text-foreground/60">
          This is a placeholder for the AI Interview workflow. Enable the required services locally to begin wiring up
          the next steps.
        </p>
      </header>

      <Card className="border-border/60 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Local Services</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <ul className="space-y-2 text-sm text-foreground/70">
            {services.map((service) => (
              <li key={service.name} className="flex flex-col gap-1 rounded-lg border border-border/50 px-4 py-3">
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground/40">
                  {service.name}
                </span>
                <span className="font-mono text-sm text-foreground/80">{service.url}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
