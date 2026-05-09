"use client";

import { FormEvent, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { withBasePath } from "@/lib/basePath";

const DEFAULT_PROMPT =
  "Provide a concise local image review in cautious medical language. Use brief bullets for visible findings, possible benign explanations, and red flags that would require a clinician. Do not provide a definitive diagnosis.";

const acceptedImageTypes = ["image/jpeg", "image/png", "image/webp"];

const initialProgressMessages: ProgressMessage[] = [
  { stage: "waiting", message: "Waiting for an image", elapsedMs: 0 },
];

type AnalysisResponse = {
  ok: boolean;
  result?: string;
  error?: string;
  runnerStages?: string[];
};

type ProgressMessage = {
  stage: string;
  message: string;
  elapsedMs: number;
};

type StreamEvent = {
  event: string;
  data: AnalysisResponse & Partial<ProgressMessage> & { status?: number };
};

const formatElapsed = (elapsedMs: number) => {
  const totalSeconds = Math.max(0, Math.floor(elapsedMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes > 0) {
    return `${minutes}m ${seconds.toString().padStart(2, "0")}s`;
  }

  return `${seconds}s`;
};

const requireResponseText = (value: string | undefined) => {
  const responseText = value?.trim();
  if (!responseText) {
    throw new Error(
      "MedGemma analysis completed without response text. Treating the empty output as a runner error; check the server log for safe generation diagnostics.",
    );
  }

  return responseText;
};

const parseSseEvents = (buffer: string): StreamEvent[] => {
  return buffer
    .split("\n\n")
    .filter(Boolean)
    .map((block) => {
      const event = block.match(/^event:\s*(.+)$/m)?.[1]?.trim() || "message";
      const dataLines = block
        .split("\n")
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.replace(/^data:\s?/, ""));

      return {
        event,
        data: JSON.parse(dataLines.join("\n")) as StreamEvent["data"],
      };
    });
};

export function MedGemmaReviewTool() {
  const [image, setImage] = useState<File | null>(null);
  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [progressMessages, setProgressMessages] = useState<ProgressMessage[]>(
    initialProgressMessages,
  );

  const helperText = useMemo(() => {
    if (!image) {
      return "Choose a JPG, PNG, or WebP image to review locally.";
    }

    const sizeInMb = image.size / (1024 * 1024);
    return `${image.name} • ${sizeInMb.toFixed(2)} MB`;
  }, [image]);

  const latestProgress = progressMessages[progressMessages.length - 1];

  const addProgressMessage = (message: ProgressMessage) => {
    setProgressMessages((current) => {
      const previous = current[current.length - 1];
      if (previous?.stage === message.stage) {
        return current;
      }

      return [...current, message];
    });
  };

  const readStreamingResponse = async (response: Response) => {
    if (!response.body) {
      const data = (await response.json()) as AnalysisResponse;
      if (!response.ok || !data.ok) {
        throw new Error(data.error || "MedGemma analysis failed.");
      }
      setResult(requireResponseText(data.result));
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { value, done } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });
      const eventBlocks = buffer.split("\n\n");
      buffer = eventBlocks.pop() || "";

      const events = parseSseEvents(eventBlocks.join("\n\n"));
      if (done && buffer.trim()) {
        events.push(...parseSseEvents(buffer));
        buffer = "";
      }

      for (const event of events) {
        if (event.event === "status") {
          addProgressMessage({
            stage: event.data.stage || "status",
            message: event.data.message || "Working locally",
            elapsedMs: event.data.elapsedMs || 0,
          });
        }

        if (event.event === "result") {
          if (!event.data.ok) {
            throw new Error(event.data.error || "MedGemma analysis failed.");
          }
          setResult(requireResponseText(event.data.result));
        }

        if (event.event === "error") {
          const runnerDetails = event.data.runnerStages?.length
            ? `\n\nRunner status:\n${event.data.runnerStages.join("\n")}`
            : "";
          throw new Error(
            `${event.data.error || "MedGemma analysis failed."}${runnerDetails}`,
          );
        }
      }

      if (done) {
        break;
      }
    }
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setResult("");

    if (!image) {
      setError("Please select a JPG, PNG, or WebP image before analyzing.");
      return;
    }

    if (!acceptedImageTypes.includes(image.type)) {
      setError(
        "Unsupported file type. Please upload a JPG, PNG, or WebP image.",
      );
      return;
    }

    setIsLoading(true);
    setProgressMessages([
      {
        stage: "queued",
        message: "Preparing local analysis request",
        elapsedMs: 0,
      },
    ]);

    try {
      const formData = new FormData();
      formData.append("image", image);
      formData.append("prompt", prompt.trim());

      const response = await fetch(withBasePath("/api/medgemma/analyze"), {
        method: "POST",
        headers: {
          Accept: "text/event-stream",
        },
        body: formData,
      });

      await readStreamingResponse(response);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "MedGemma analysis failed.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <section className="space-y-4 rounded-3xl border border-border/70 bg-gradient-to-br from-primary/10 via-card to-secondary/10 p-8 shadow-sm md:p-10">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground/50">
          Local AI Tool
        </p>
        <div className="space-y-3">
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
            Local MedGemma Image Review
          </h1>
          <p className="max-w-3xl text-base leading-relaxed text-foreground/70">
            Upload an image and run a local MedGemma review from this Next.js
            app. Images are passed only to the local Python runner and are not
            sent to a remote API.
          </p>
        </div>
        <div className="rounded-2xl border border-amber-300/70 bg-amber-50 p-4 text-sm font-medium text-amber-900 dark:border-amber-400/40 dark:bg-amber-950/40 dark:text-amber-100">
          This tool is for image description and red-flag review only. It is not
          a diagnosis and does not replace a clinician.
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle>Analyze an image</CardTitle>
            <p className="text-sm text-foreground/60">
              The API route stores the upload in a temporary ignored folder,
              calls the local Python runner, then removes the temporary file.
            </p>
          </CardHeader>
          <CardContent>
            <form className="space-y-5" onSubmit={onSubmit}>
              <div className="space-y-2">
                <label
                  className="text-sm font-semibold text-foreground"
                  htmlFor="medgemma-image"
                >
                  Image file
                </label>
                <input
                  id="medgemma-image"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                  className="block w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground file:mr-4 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-2 file:text-sm file:font-semibold file:text-foreground hover:file:bg-muted/80"
                  onChange={(event) =>
                    setImage(event.target.files?.[0] ?? null)
                  }
                />
                <p className="text-xs text-foreground/60">{helperText}</p>
              </div>

              <div className="space-y-2">
                <label
                  className="text-sm font-semibold text-foreground"
                  htmlFor="medgemma-prompt"
                >
                  Optional prompt
                </label>
                <textarea
                  id="medgemma-prompt"
                  rows={7}
                  value={prompt}
                  onChange={(event) => setPrompt(event.target.value)}
                  placeholder={DEFAULT_PROMPT}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground shadow-sm transition placeholder:text-foreground/40 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
                />
                <p className="text-xs text-foreground/60">
                  Leave blank to use the cautious concise default prompt. Set
                  MEDGEMMA_MAX_NEW_TOKENS if you need a longer local response.
                </p>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full sm:w-auto"
              >
                {isLoading ? "Analyzing locally..." : "Analyze image"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-border/70">
            <CardHeader>
              <CardTitle>Default safety prompt</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="rounded-lg bg-muted/50 p-4 text-sm leading-relaxed text-foreground/75">
                {DEFAULT_PROMPT}
              </p>
            </CardContent>
          </Card>

          {isLoading ? (
            <Card className="border-primary/30 bg-primary/5">
              <CardHeader>
                <CardTitle>Local run status</CardTitle>
                <p className="text-sm text-foreground/60">
                  {latestProgress?.message || "Working locally"} · elapsed{" "}
                  {formatElapsed(latestProgress?.elapsedMs || 0)}
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-foreground/70">
                  The first run may be slow while model files download and load
                  into GPU memory. After the model is cached, the concise default
                  output is intended to finish well before the 10-minute timeout
                  on a 6 GB laptop GPU. Status messages are generated locally and
                  omit tokens and full local paths.
                </p>
                <ol className="space-y-2 text-sm text-foreground/75">
                  {progressMessages.map((message, index) => (
                    <li
                      key={`${message.stage}-${index}`}
                      className="flex items-start gap-3 rounded-lg bg-background/60 p-3"
                    >
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                        {index + 1}
                      </span>
                      <span>
                        <span className="font-medium text-foreground">
                          {message.message}
                        </span>
                        <span className="ml-2 text-xs text-foreground/50">
                          {formatElapsed(message.elapsedMs)}
                        </span>
                      </span>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          ) : null}

          {error ? (
            <Card className="border-red-300 bg-red-50 dark:border-red-900/70 dark:bg-red-950/30">
              <CardHeader>
                <CardTitle>Error</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm text-red-800 dark:text-red-100">
                  {error}
                </p>
              </CardContent>
            </Card>
          ) : null}

          {result ? (
            <Card className="border-emerald-300 bg-emerald-50 dark:border-emerald-900/70 dark:bg-emerald-950/30">
              <CardHeader>
                <CardTitle>MedGemma response</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-emerald-950 dark:text-emerald-50">
                  {result}
                </p>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
