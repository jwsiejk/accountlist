"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { withBasePath } from "@/lib/basePath";

const acceptedImageTypes = ["image/jpeg", "image/png", "image/webp"];
const maxImageCount = 5;

const initialProgressMessages: ProgressMessage[] = [
  { stage: "waiting", message: "Waiting for image(s)", elapsedMs: 0 },
];

type SkinReviewMatch = {
  id: string;
  label: string;
  parentId?: string;
  parentLabel?: string;
  score: number;
  percent: number;
  rawScore?: number;
  rawMarginFromTop?: number;
  plainEnglish: string;
  whatSupports: string[];
  whatArguesAgainst: string[];
  redFlags: string[];
  highConsequence?: boolean;
  childMatches?: SkinReviewMatch[];
};

type SkinReviewCategory = SkinReviewMatch;

type PerImageMatches = {
  imageIndex: number;
  topMatches: SkinReviewMatch[];
};

type PerImageCategoryMatches = {
  imageIndex: number;
  topCategories: SkinReviewCategory[];
};

type AnalysisResponse = {
  ok: boolean;
  model?: string;
  imageCount?: number;
  scoringMode?: string;
  displayTemperature?: number;
  topMatches?: SkinReviewMatch[];
  topCategories?: SkinReviewCategory[];
  perImageMatches?: PerImageMatches[];
  perImageCategoryMatches?: PerImageCategoryMatches[];
  reviewText?: string;
  confidenceLabel?:
    | "strong visual match"
    | "moderate visual match"
    | "weak/mixed visual match";
  mixedEvidence?: boolean;
  topMargin?: number;
  topRawMargin?: number;
  agreementSummary?: string;
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

const formatAnalysisError = (data: AnalysisResponse) => {
  const runnerDetails = data.runnerStages?.length
    ? `\n\nRunner status:\n${data.runnerStages.join("\n")}`
    : "";

  return `${data.error || "Skin image review failed."}${runnerDetails}`;
};

const requireReview = (data: AnalysisResponse) => {
  const reviewText = data.reviewText?.trim();
  if (!reviewText || !data.topMatches?.length) {
    throw new Error(
      "Skin image review completed without ranked matches or review text. Check the server log for local runner diagnostics.",
    );
  }

  return {
    model: data.model || "local DermLIP skin review model",
    imageCount: data.imageCount || 1,
    perImageMatches: data.perImageMatches || [],
    topCategories: data.topCategories || [],
    perImageCategoryMatches: data.perImageCategoryMatches || [],
    reviewText,
    topMatches: data.topMatches,
    confidenceLabel: data.confidenceLabel || "weak/mixed visual match",
    mixedEvidence: Boolean(data.mixedEvidence),
    topRawMargin: data.topRawMargin ?? data.topMargin ?? 0,
    displayTemperature: data.displayTemperature ?? 0.7,
    scoringMode: data.scoringMode || "raw-margin-calibrated",
    agreementSummary:
      data.agreementSummary ||
      "Agreement summary was not returned by the local runner.",
  };
};

const formatReviewText = (value: string) => {
  const normalized = value.trim().replace(/\r\n/g, "\n");
  if (!normalized) {
    return [];
  }

  const sectionHeadings = [
    "Most likely visual match / combined impression",
    "Confidence / agreement",
    "Why it may fit",
    "Other possibilities",
    "Other visual categories",
    "Concerns / red flags",
    "What to do",
    "Disclaimer",
  ];
  const sectionHeadingPattern = new RegExp(
    `\\n(?=(?:${sectionHeadings.join("|")}):)`,
    "gi",
  );
  const textWithSectionSpacing = normalized.replace(
    sectionHeadingPattern,
    "\n\n",
  );

  const sections = textWithSectionSpacing
    .split(/\n{2,}/)
    .map((section) => section.trim())
    .filter(Boolean);

  return sections.length ? sections : [normalized];
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

export function SkinReviewTool() {
  const [images, setImages] = useState<File[]>([]);
  const [reviewText, setReviewText] = useState("");
  const [topMatches, setTopMatches] = useState<SkinReviewMatch[]>([]);
  const [topCategories, setTopCategories] = useState<SkinReviewCategory[]>([]);
  const [perImageMatches, setPerImageMatches] = useState<PerImageMatches[]>([]);
  const [perImageCategoryMatches, setPerImageCategoryMatches] = useState<
    PerImageCategoryMatches[]
  >([]);
  const [imageCount, setImageCount] = useState(0);
  const [model, setModel] = useState("");
  const [confidenceLabel, setConfidenceLabel] = useState("");
  const [mixedEvidence, setMixedEvidence] = useState(false);
  const [agreementSummary, setAgreementSummary] = useState("");
  const [topRawMargin, setTopRawMargin] = useState(0);
  const [displayTemperature, setDisplayTemperature] = useState(0.7);
  const [scoringMode, setScoringMode] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [progressMessages, setProgressMessages] = useState<ProgressMessage[]>(
    initialProgressMessages,
  );

  const selectedImagePreviews = useMemo(
    () =>
      images.map((image) => ({
        name: image.name,
        sizeInMb: image.size / (1024 * 1024),
        url: URL.createObjectURL(image),
      })),
    [images],
  );

  useEffect(() => {
    return () => {
      selectedImagePreviews.forEach((preview) =>
        URL.revokeObjectURL(preview.url),
      );
    };
  }, [selectedImagePreviews]);

  const helperText = useMemo(() => {
    if (!images.length) {
      return "Choose 1–5 JPG, PNG, or WebP image(s) to review locally.";
    }

    return `${images.length} selected image${images.length === 1 ? "" : "s"}`;
  }, [images]);

  const latestProgress = progressMessages[progressMessages.length - 1];
  const combinedVisualCategories = topCategories.length
    ? topCategories
    : topMatches;
  const perImageVisualCategories = perImageCategoryMatches.length
    ? perImageCategoryMatches
    : perImageMatches.map((imageResult) => ({
        imageIndex: imageResult.imageIndex,
        topCategories: imageResult.topMatches,
      }));

  const addProgressMessage = (message: ProgressMessage) => {
    setProgressMessages((current) => {
      const previous = current[current.length - 1];
      if (previous?.stage === message.stage) {
        return current;
      }

      return [...current, message];
    });
  };

  const applyReviewResponse = (data: AnalysisResponse) => {
    const review = requireReview(data);
    setReviewText(review.reviewText);
    setTopMatches(review.topMatches);
    setTopCategories(review.topCategories);
    setPerImageMatches(review.perImageMatches);
    setPerImageCategoryMatches(review.perImageCategoryMatches);
    setImageCount(review.imageCount);
    setModel(review.model);
    setConfidenceLabel(review.confidenceLabel);
    setMixedEvidence(review.mixedEvidence);
    setAgreementSummary(review.agreementSummary);
    setTopRawMargin(review.topRawMargin);
    setDisplayTemperature(review.displayTemperature);
    setScoringMode(review.scoringMode);
  };

  const readStreamingResponse = async (response: Response) => {
    if (!response.body) {
      const data = (await response.json()) as AnalysisResponse;
      if (!response.ok || !data.ok) {
        throw new Error(formatAnalysisError(data));
      }
      applyReviewResponse(data);
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
            throw new Error(formatAnalysisError(event.data));
          }
          applyReviewResponse(event.data);
        }

        if (event.event === "error") {
          throw new Error(formatAnalysisError(event.data));
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
    setReviewText("");
    setTopMatches([]);
    setTopCategories([]);
    setPerImageMatches([]);
    setPerImageCategoryMatches([]);
    setImageCount(0);
    setModel("");
    setConfidenceLabel("");
    setMixedEvidence(false);
    setAgreementSummary("");
    setTopRawMargin(0);
    setDisplayTemperature(0.7);
    setScoringMode("");

    if (!images.length) {
      setError(
        "Please select 1–5 JPG, PNG, or WebP image(s) before reviewing.",
      );
      return;
    }

    if (images.length > maxImageCount) {
      setError("Please select no more than 5 image(s) for one review.");
      return;
    }

    if (images.some((image) => !acceptedImageTypes.includes(image.type))) {
      setError(
        "Unsupported file type. Please upload JPG, PNG, or WebP image(s).",
      );
      return;
    }

    setIsLoading(true);
    setProgressMessages([
      {
        stage: "queued",
        message: "Preparing local skin review request",
        elapsedMs: 0,
      },
    ]);

    try {
      const formData = new FormData();
      images.forEach((image) => formData.append("images", image));

      const response = await fetch(withBasePath("/api/skin-review/analyze"), {
        method: "POST",
        headers: {
          Accept: "text/event-stream",
        },
        body: formData,
      });

      await readStreamingResponse(response);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Skin image review failed.";
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
            Skin Image Review
          </h1>
          <p className="max-w-3xl text-base leading-relaxed text-foreground/70">
            Upload 1–5 skin images and run one local dermatology-focused visual
            ranking workflow. Images are passed only to the local Python runner
            and are not sent to a remote image API.
          </p>
        </div>
        <div className="rounded-2xl border border-amber-300/70 bg-amber-50 p-4 text-sm font-medium text-amber-900 dark:border-amber-400/40 dark:bg-amber-950/40 dark:text-amber-100">
          This local educational review ranks visual possibilities, explains
          what may fit or argue against them, lists red flags, and gives
          conservative next steps. It is not a diagnosis and does not replace a
          clinician.
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle>Review image(s)</CardTitle>
            <p className="text-sm text-foreground/60">
              The API route stores uploads in a temporary ignored folder, calls
              the local DermLIP ranking runner, then removes the temporary
              files.
            </p>
          </CardHeader>
          <CardContent>
            <form className="space-y-5" onSubmit={onSubmit}>
              <div className="space-y-2">
                <label
                  className="text-sm font-semibold text-foreground"
                  htmlFor="skin-review-image"
                >
                  Image file(s)
                </label>
                <input
                  id="skin-review-image"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                  multiple
                  className="block w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground file:mr-4 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-2 file:text-sm file:font-semibold file:text-foreground hover:file:bg-muted/80"
                  onChange={(event) => {
                    const selectedFiles = Array.from(event.target.files ?? []);
                    const limitedFiles = selectedFiles.slice(0, maxImageCount);
                    setImages(limitedFiles);
                    if (selectedFiles.length > maxImageCount) {
                      setError(
                        "Only the first 5 image(s) will be included in one local review.",
                      );
                    } else if (error.startsWith("Only the first 5")) {
                      setError("");
                    }
                  }}
                />
                <p className="text-xs text-foreground/60">{helperText}</p>
                <div className="rounded-lg bg-muted/50 p-3 text-xs leading-relaxed text-foreground/65">
                  <p className="font-semibold text-foreground/75">
                    Recommended image set:
                  </p>
                  <ul className="mt-2 list-disc space-y-1 pl-5">
                    <li>context/orientation shot</li>
                    <li>close-up</li>
                    <li>side angle if raised or swollen</li>
                    <li>another affected area</li>
                    <li>normal nearby skin if useful for comparison</li>
                  </ul>
                </div>
                {selectedImagePreviews.length ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {selectedImagePreviews.map((preview, index) => (
                      <div
                        key={`${preview.name}-${index}`}
                        className="rounded-xl border border-border bg-background p-3"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element -- Local object URL previews are not remote optimized assets. */}
                        <img
                          src={preview.url}
                          alt={`Selected skin review image ${index + 1}`}
                          className="h-32 w-full rounded-lg object-cover"
                        />
                        <p className="mt-2 truncate text-sm font-medium text-foreground">
                          {index + 1}. {preview.name}
                        </p>
                        <p className="text-xs text-foreground/60">
                          {preview.sizeInMb.toFixed(2)} MB
                        </p>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full sm:w-auto"
              >
                {isLoading ? "Reviewing locally..." : "Review image(s)"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-border/70">
            <CardHeader>
              <CardTitle>Review format</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="rounded-lg bg-muted/50 p-4 text-sm leading-relaxed text-foreground/75">
                The local review returns combined top ranked visual
                possibilities, plain-English context, other possibilities, red
                flags, confidence/agreement calibration, conservative care
                guidance, and a bottom disclaimer. Scores are relative visual
                similarity rankings rather than diagnosis confidence. Confidence
                uses raw ranking separation and cross-image agreement, and the UI
                does not show raw prompts or embeddings.
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
                  into GPU memory. Status messages are generated locally and
                  omit tokens, raw embeddings, raw prompts, and full local
                  paths.
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

          {combinedVisualCategories.length ? (
            <Card className="border-emerald-300 bg-emerald-50 dark:border-emerald-900/70 dark:bg-emerald-950/30">
              <CardHeader>
                <CardTitle>Combined visual categories</CardTitle>
                <p className="text-sm text-emerald-950/70 dark:text-emerald-50/70">
                  Model: {model}. Image count:{" "}
                  {imageCount || images.length || 1}. Percentages are
                  display-scaled visual-similarity rollups, not diagnosis
                  confidence. Child labels remain visible so
                  related subtypes do not split the broader visual signal. All
                  image processing stays local.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-xl border border-emerald-200 bg-white/70 p-4 text-sm text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-50">
                  <p className="font-semibold capitalize">
                    Confidence: {confidenceLabel || "visual match"}
                  </p>
                  <p className="mt-1 text-emerald-950/75 dark:text-emerald-50/75">
                    {agreementSummary}
                  </p>
                  <p className="mt-1 text-xs text-emerald-950/65 dark:text-emerald-50/65">
                    Ranking separation from #2: {topRawMargin.toFixed(4)}.
                    Confidence is calibrated from this parent-category raw
                    separation plus per-image parent agreement, not from the
                    display percentage.
                  </p>
                </div>

                <p className="text-xs leading-relaxed text-emerald-950/65 dark:text-emerald-50/65">
                  Scoring mode: {scoringMode || "raw-margin-calibrated"}. Display
                  temperature: {displayTemperature.toFixed(2)}. Lower display
                  temperatures make visible ranking-score differences sharper;
                  they do not change raw confidence calibration.
                </p>

                {mixedEvidence || confidenceLabel === "weak/mixed visual match" ? (
                  <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm font-medium text-amber-950 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-50">
                    The uploaded images have close rankings or do not strongly
                    agree. Treat this as a mixed visual match, not a conclusion.
                  </div>
                ) : null}

                <ol className="space-y-3">
                  {combinedVisualCategories.map((match, index) => (
                    <li
                      key={match.id}
                      className="rounded-xl border border-emerald-200 bg-white/70 p-4 text-sm text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-50"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-semibold">
                            {index + 1}. {match.label}
                          </p>
                          <p className="mt-1 text-emerald-950/75 dark:text-emerald-50/75">
                            {match.plainEnglish}
                          </p>
                        </div>
                        <span className="shrink-0 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-900 dark:bg-emerald-900 dark:text-emerald-50">
                          {match.percent.toFixed(1)}% display
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-emerald-950/60 dark:text-emerald-50/60">
                        Raw similarity signal: {match.rawScore?.toFixed(4) ?? "n/a"};
                        separation from top: {match.rawMarginFromTop?.toFixed(4) ?? "n/a"}.
                        These are model ranking signals, not medical probabilities.
                      </p>
                      {match.childMatches?.length ? (
                        <p className="mt-2 text-xs text-emerald-950/70 dark:text-emerald-50/70">
                          Includes:{" "}
                          {match.childMatches
                            .map((child) => child.label)
                            .join(", ")}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          ) : null}

          {perImageVisualCategories.length ? (
            <Card className="border-emerald-300 bg-emerald-50 dark:border-emerald-900/70 dark:bg-emerald-950/30">
              <CardHeader>
                <CardTitle>Per-image visual categories</CardTitle>
                <p className="text-sm text-emerald-950/70 dark:text-emerald-50/70">
                  These local-only per-image parent-category rankings are shown
                  for visibility when images disagree. Percentages are
                  display-scaled; raw separation drives confidence calibration.
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                {perImageVisualCategories.map((imageResult) => (
                  <details
                    key={imageResult.imageIndex}
                    className="rounded-xl border border-emerald-200 bg-white/70 p-4 text-sm text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-50"
                  >
                    <summary className="cursor-pointer font-semibold">
                      Image {imageResult.imageIndex} top categories
                    </summary>
                    <ol className="mt-3 space-y-2">
                      {imageResult.topCategories.map((match, index) => (
                        <li
                          key={match.id}
                          className="flex justify-between gap-3"
                        >
                          <span>
                            {index + 1}. {match.label}
                          </span>
                          <span className="text-right font-semibold">
                            {match.percent.toFixed(1)}% display
                            <span className="block text-xs font-normal text-emerald-950/60 dark:text-emerald-50/60">
                              raw gap {match.rawMarginFromTop?.toFixed(4) ?? "n/a"}
                            </span>
                            {match.childMatches?.length ? (
                              <span className="block max-w-xs text-xs font-normal text-emerald-950/60 dark:text-emerald-50/60">
                                Includes:{" "}
                                {match.childMatches
                                  .map((child) => child.label)
                                  .join(", ")}
                              </span>
                            ) : null}
                          </span>
                        </li>
                      ))}
                    </ol>
                  </details>
                ))}
              </CardContent>
            </Card>
          ) : null}

          {reviewText ? (
            <Card className="border-emerald-300 bg-emerald-50 dark:border-emerald-900/70 dark:bg-emerald-950/30">
              <CardHeader>
                <CardTitle>Plain-English review</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 text-sm leading-relaxed text-emerald-950 dark:text-emerald-50">
                  {formatReviewText(reviewText).map((section, index) => (
                    <p
                      key={`${section.slice(0, 32)}-${index}`}
                      className="whitespace-pre-wrap"
                    >
                      {section}
                    </p>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
