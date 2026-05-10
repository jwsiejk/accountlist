import { spawn } from "child_process";
import { randomUUID } from "crypto";
import { existsSync } from "fs";
import { mkdir, rm, stat, writeFile } from "fs/promises";
import path from "path";

import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const MAX_IMAGE_COUNT = 5;
const ALLOWED_TYPES = new Map([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"],
]);
const RUNNER_TIMEOUT_MS = Number(
  process.env.SKIN_REVIEW_RUNNER_TIMEOUT_MS || 10 * 60 * 1000,
);
const DEFAULT_MAX_MATCHES = 5;

const STAGE_MESSAGES: Record<string, string> = {
  upload_received: "Upload received",
  validating_image: "Validating image",
  writing_temp_file: "Writing temporary local file",
  starting_python_runner: "Starting Python runner",
  loading_model: "Loading DermLIP model",
  running_classification: "Running local dermatology ranking",
  complete: "Complete",
};

type SkinReviewMatch = {
  id: string;
  label: string;
  score: number;
  percent: number;
  plainEnglish: string;
  whatSupports: string[];
  whatArguesAgainst: string[];
  redFlags: string[];
};

type PerImageMatches = {
  imageIndex: number;
  topMatches: SkinReviewMatch[];
};

type RunnerResult = {
  ok: boolean;
  model?: string;
  imageCount?: number;
  topMatches?: SkinReviewMatch[];
  perImageMatches?: PerImageMatches[];
  reviewText?: string;
  error?: string;
  errorType?:
    | "image_decode_failed"
    | "runner_failed"
    | "upload_validation_failed"
    | "temp_write_failed";
  runnerStages?: string[];
};

type StatusEvent = {
  stage: string;
  message: string;
};

type StatusReporter = (event: StatusEvent) => void;

const jsonResponse = (body: RunnerResult, status = 200) =>
  NextResponse.json(body, { status });

const sanitizeStatusText = (value: string) => {
  return value
    .replace(/hf_[A-Za-z0-9]{20,}/g, "[redacted token]")
    .replace(
      /(?:^|\s)[A-Z0-9_]*(?:TOKEN|SECRET|KEY|PASSWORD)=\S+/gi,
      " [redacted env]",
    )
    .replace(/[A-Za-z]:\\(?:[^\\\s]+\\)*[^\\\s]*/g, "[local path]")
    .replace(/\/(?:[^/\s]+\/)+[^/\s]*/g, "[local path]")
    .trim();
};

const isFileLike = (value: FormDataEntryValue | null): value is File => {
  return Boolean(
    value &&
    typeof value === "object" &&
    "arrayBuffer" in value &&
    "type" in value,
  );
};

const hasValidImageSignature = (bytes: Buffer, mimeType: string) => {
  if (mimeType === "image/jpeg") {
    return (
      bytes.length >= 3 &&
      bytes[0] === 0xff &&
      bytes[1] === 0xd8 &&
      bytes[2] === 0xff
    );
  }

  if (mimeType === "image/png") {
    return (
      bytes.length >= 8 &&
      bytes
        .subarray(0, 8)
        .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
    );
  }

  if (mimeType === "image/webp") {
    return (
      bytes.length >= 12 &&
      bytes.subarray(0, 4).toString("ascii") === "RIFF" &&
      bytes.subarray(8, 12).toString("ascii") === "WEBP"
    );
  }

  return false;
};

const getMaxMatchesArg = () => {
  const rawValue = process.env.SKIN_REVIEW_MAX_MATCHES;
  if (!rawValue) {
    return String(DEFAULT_MAX_MATCHES);
  }

  const value = Number(rawValue);
  if (!Number.isInteger(value) || value < 1 || value > 10) {
    return String(DEFAULT_MAX_MATCHES);
  }

  return String(value);
};

const getSkinReviewPythonPath = () => {
  if (process.env.SKIN_REVIEW_PYTHON_PATH) {
    return process.env.SKIN_REVIEW_PYTHON_PATH;
  }

  const localPythonPath = path.join(
    process.cwd(),
    ".venv-skin-review",
    process.platform === "win32" ? "Scripts" : "bin",
    process.platform === "win32" ? "python.exe" : "python",
  );

  return existsSync(localPythonPath) ? localPythonPath : "python";
};

const reportStage = (onStatus: StatusReporter | undefined, stage: string) => {
  onStatus?.({
    stage,
    message: STAGE_MESSAGES[stage] || sanitizeStatusText(stage),
  });
};

const runnerStageFromLine = (line: string) => {
  const match = line.match(/^STAGE:\s*([a-z0-9_:-]+)\s*$/i);
  return match?.[1]?.toLowerCase();
};

const resultForEmptyRunnerOutput = (runnerStages?: string[]): RunnerResult => ({
  ok: false,
  errorType: "runner_failed",
  error:
    "Skin review runner returned no displayable ranked matches or review text; check server stderr for local runner diagnostics.",
  ...(runnerStages?.length ? { runnerStages } : {}),
});

const safeRunnerSummary = (stderr: string) => {
  const lines = stderr
    .split(/\r?\n/)
    .map((line) => sanitizeStatusText(line))
    .filter(Boolean)
    .filter(
      (line) =>
        line.startsWith("STAGE:") ||
        /failed|error|requires|could not|unable/i.test(line),
    );

  return Array.from(new Set(lines)).slice(-8);
};

const runSkinReview = (
  imagePaths: string[],
  onStatus?: StatusReporter,
): Promise<RunnerResult> => {
  const pythonPath = getSkinReviewPythonPath();
  const runnerPath = path.join(
    process.cwd(),
    "scripts",
    "skin_review_runner.py",
  );

  reportStage(onStatus, "starting_python_runner");

  return new Promise((resolve) => {
    const child = spawn(
      pythonPath,
      [
        runnerPath,
        ...imagePaths.flatMap((imagePath) => ["--image", imagePath]),
        "--max-matches",
        getMaxMatchesArg(),
      ],
      {
        cwd: process.cwd(),
        env: process.env,
        windowsHide: true,
      },
    );

    let stdout = "";
    let stderr = "";
    let stderrRemainder = "";
    let settled = false;

    const finish = (result: RunnerResult) => {
      if (settled) {
        return;
      }
      settled = true;
      resolve(result);
    };

    const timeout = setTimeout(() => {
      child.kill("SIGTERM");
      finish({
        ok: false,
        errorType: "runner_failed",
        error: `Skin review runner timed out after ${Math.round(RUNNER_TIMEOUT_MS / 1000)} seconds.`,
        runnerStages: safeRunnerSummary(stderr),
      });
    }, RUNNER_TIMEOUT_MS);

    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf8");
    });

    child.stderr.on("data", (chunk: Buffer) => {
      const text = chunk.toString("utf8");
      stderr += text;
      const lines = `${stderrRemainder}${text}`.split(/\r?\n/);
      stderrRemainder = lines.pop() || "";

      for (const line of lines) {
        const stage = runnerStageFromLine(line.trim());
        if (stage) {
          reportStage(onStatus, stage);
        }
      }
    });

    child.on("error", (error) => {
      clearTimeout(timeout);
      finish({
        ok: false,
        errorType: "runner_failed",
        error: `Unable to start skin review runner: ${sanitizeStatusText(error.message)}`,
        runnerStages: safeRunnerSummary(stderr),
      });
    });

    child.on("close", (code) => {
      clearTimeout(timeout);
      if (settled) {
        return;
      }

      const trimmedStdout = stdout.trim();
      try {
        const parsed = JSON.parse(trimmedStdout) as RunnerResult;
        if (
          parsed.ok &&
          (!parsed.reviewText?.trim() || !parsed.topMatches?.length)
        ) {
          finish(resultForEmptyRunnerOutput(safeRunnerSummary(stderr)));
          return;
        }
        if (!parsed.ok && stderr.trim() && !parsed.error) {
          parsed.error = safeRunnerSummary(stderr).join("\n");
        }
        if (!parsed.ok) {
          parsed.error = sanitizeStatusText(
            parsed.error || "Skin image review could not be completed.",
          );
          parsed.runnerStages = safeRunnerSummary(stderr);
        }
        finish(parsed);
      } catch {
        const details =
          safeRunnerSummary(stderr).join("\n") ||
          sanitizeStatusText(trimmedStdout) ||
          `Runner exited with code ${code}.`;
        finish({
          ok: false,
          errorType: "runner_failed",
          error: `Skin review runner did not return valid JSON. ${details}`,
          runnerStages: safeRunnerSummary(stderr),
        });
      }
    });
  });
};

const resultForUploadValidationError = (error: string): RunnerResult => ({
  ok: false,
  error: `Upload validation failed: ${sanitizeStatusText(error)}`,
  errorType: "upload_validation_failed",
});

const resultForTempWriteError = (error: string): RunnerResult => ({
  ok: false,
  error: `Temporary upload write failed: ${sanitizeStatusText(error)}`,
  errorType: "temp_write_failed",
});

type ValidatedUpload = {
  bytes: Buffer;
  extension: string;
};

const getRequestedImages = (formData: FormData) => {
  const images = formData.getAll("images");
  if (images.length) {
    return images;
  }

  const legacyImage = formData.get("image");
  return legacyImage ? [legacyImage] : [];
};

const validateUpload = async (
  image: FormDataEntryValue,
  index: number,
): Promise<ValidatedUpload | RunnerResult> => {
  const label = `Image ${index + 1}`;

  if (!isFileLike(image)) {
    return resultForUploadValidationError(
      `${label} must be a JPG, PNG, or WebP image upload.`,
    );
  }

  const extension = ALLOWED_TYPES.get(image.type);
  if (!extension) {
    return resultForUploadValidationError(
      `${label} has an unsupported file type. Upload JPG, PNG, or WebP image(s).`,
    );
  }

  if (image.size <= 0) {
    return resultForUploadValidationError(`${label} is empty.`);
  }

  if (image.size > MAX_UPLOAD_BYTES) {
    return resultForUploadValidationError(`${label} must be 10 MB or smaller.`);
  }

  const bytes = Buffer.from(await image.arrayBuffer());

  if (bytes.length !== image.size) {
    return resultForUploadValidationError(
      `${label} size changed while reading form data (expected ${image.size} bytes, got ${bytes.length} bytes).`,
    );
  }

  if (!hasValidImageSignature(bytes, image.type)) {
    return resultForUploadValidationError(
      `${label} content does not match the selected image type.`,
    );
  }

  return { bytes, extension };
};

const writeValidatedUpload = async (
  upload: ValidatedUpload,
  uploadsDir: string,
) => {
  const uploadPath = path.join(
    uploadsDir,
    `${Date.now()}-${randomUUID()}${upload.extension}`,
  );

  await writeFile(uploadPath, upload.bytes, { flag: "wx" });

  const uploadStats = await stat(uploadPath);
  if (!uploadStats.isFile() || uploadStats.size !== upload.bytes.length) {
    throw new Error(
      `Temporary file size mismatch after write (expected ${upload.bytes.length} bytes, got ${uploadStats.size} bytes).`,
    );
  }

  return uploadPath;
};

const analyzeSkinReviewRequest = async (
  request: NextRequest,
  onStatus?: StatusReporter,
): Promise<{ result: RunnerResult; status: number }> => {
  const uploadPaths: string[] = [];

  try {
    const formData = await request.formData();
    reportStage(onStatus, "upload_received");

    const requestedImages = getRequestedImages(formData);

    reportStage(onStatus, "validating_image");

    if (!requestedImages.length) {
      return {
        result: resultForUploadValidationError(
          "At least one JPG, PNG, or WebP image upload is required.",
        ),
        status: 400,
      };
    }

    if (requestedImages.length > MAX_IMAGE_COUNT) {
      return {
        result: resultForUploadValidationError(
          "Upload no more than 5 image(s) for one skin review.",
        ),
        status: 400,
      };
    }

    const validatedUploads: ValidatedUpload[] = [];
    for (const [index, image] of requestedImages.entries()) {
      const validation = await validateUpload(image, index);
      if ("ok" in validation) {
        return { result: validation, status: 400 };
      }
      validatedUploads.push(validation);
    }

    reportStage(onStatus, "writing_temp_file");

    const uploadsDir = path.join(process.cwd(), ".skin-review-uploads");
    await mkdir(uploadsDir, { recursive: true });

    try {
      for (const upload of validatedUploads) {
        uploadPaths.push(await writeValidatedUpload(upload, uploadsDir));
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Could not write uploaded image(s).";
      return { result: resultForTempWriteError(message), status: 500 };
    }

    const result = await runSkinReview(uploadPaths, onStatus);
    if (
      result.ok &&
      (!result.reviewText?.trim() || !result.topMatches?.length)
    ) {
      return {
        result: resultForEmptyRunnerOutput(result.runnerStages),
        status: 500,
      };
    }

    if (!result.ok) {
      const prefix =
        result.errorType === "image_decode_failed"
          ? "Image decode failed"
          : "Skin review runner failed";
      return {
        result: {
          ...result,
          error: `${prefix}: ${sanitizeStatusText(
            result.error || "Skin image review could not be completed.",
          )}`,
        },
        status: 500,
      };
    }

    reportStage(onStatus, "complete");
    return { result, status: 200 };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Skin image review failed.";
    return {
      result: { ok: false, error: sanitizeStatusText(message) },
      status: 500,
    };
  } finally {
    await Promise.all(
      uploadPaths.map((uploadPath) =>
        rm(uploadPath, { force: true }).catch(() => undefined),
      ),
    );
  }
};

const wantsStatusStream = (request: NextRequest) => {
  return request.headers.get("accept")?.includes("text/event-stream");
};

const encodeSse = (event: string, data: unknown) => {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
};

const streamResponse = (request: NextRequest) => {
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(encodeSse(event, data)));
      };

      const startedAt = Date.now();
      const onStatus: StatusReporter = (event) => {
        send("status", {
          ...event,
          elapsedMs: Date.now() - startedAt,
        });
      };

      const { result, status } = await analyzeSkinReviewRequest(
        request,
        onStatus,
      );
      send(result.ok ? "result" : "error", { ...result, status });
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Content-Type": "text/event-stream; charset=utf-8",
    },
  });
};

export async function POST(request: NextRequest) {
  if (wantsStatusStream(request)) {
    return streamResponse(request);
  }

  const { result, status } = await analyzeSkinReviewRequest(request);
  return jsonResponse(result, status);
}
