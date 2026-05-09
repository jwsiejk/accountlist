import { spawn } from "child_process";
import { randomUUID } from "crypto";
import { existsSync } from "fs";
import { mkdir, rm, stat, writeFile } from "fs/promises";
import path from "path";

import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const DEFAULT_PROMPT =
  "Describe this image briefly. Include visible findings and red flags. Do not provide a diagnosis.";

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Map([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"],
]);
const RUNNER_TIMEOUT_MS = Number(
  process.env.MEDGEMMA_RUNNER_TIMEOUT_MS || 10 * 60 * 1000,
);
const DEFAULT_MAX_NEW_TOKENS = 192;

const STAGE_MESSAGES: Record<string, string> = {
  upload_received: "Upload received",
  validating_image: "Validating image",
  writing_temp_file: "Writing temporary local file",
  starting_python_runner: "Starting Python runner",
  loading_model: "Loading MedGemma model",
  generating: "Running generation",
  complete: "Complete",
};

type RunnerResult = {
  ok: boolean;
  result?: string;
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

const getMedGemmaMaxNewTokensArg = () => {
  const rawValue = process.env.MEDGEMMA_MAX_NEW_TOKENS;
  if (!rawValue) {
    return String(DEFAULT_MAX_NEW_TOKENS);
  }

  const value = Number(rawValue);
  if (!Number.isInteger(value) || value < 1) {
    return String(DEFAULT_MAX_NEW_TOKENS);
  }

  return String(value);
};

const getMedGemmaPythonPath = () => {
  if (process.env.MEDGEMMA_PYTHON_PATH) {
    return process.env.MEDGEMMA_PYTHON_PATH;
  }

  const localPythonPath = path.join(
    process.cwd(),
    ".venv-medgemma",
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
    "MedGemma runner returned an empty response. The model generated no displayable text; check server stderr for safe generation metadata.",
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
        line.startsWith("GENERATION_DEBUG:") ||
        /failed|error|requires|could not|unable/i.test(line),
    );

  return Array.from(new Set(lines)).slice(-8);
};

const runMedGemma = (
  imagePath: string,
  prompt: string,
  onStatus?: StatusReporter,
): Promise<RunnerResult> => {
  const pythonPath = getMedGemmaPythonPath();
  const runnerPath = path.join(process.cwd(), "scripts", "medgemma_runner.py");
  const maxNewTokens = getMedGemmaMaxNewTokensArg();

  reportStage(onStatus, "starting_python_runner");

  return new Promise((resolve) => {
    const child = spawn(
      pythonPath,
      [
        runnerPath,
        "--image",
        imagePath,
        "--prompt",
        prompt,
        "--max-new-tokens",
        maxNewTokens,
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
        error: `MedGemma runner timed out after ${Math.round(RUNNER_TIMEOUT_MS / 1000)} seconds.`,
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
        error: `Unable to start MedGemma runner: ${sanitizeStatusText(error.message)}`,
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
        if (parsed.ok && !parsed.result?.trim()) {
          finish(resultForEmptyRunnerOutput(safeRunnerSummary(stderr)));
          return;
        }
        if (!parsed.ok && stderr.trim() && !parsed.error) {
          parsed.error = safeRunnerSummary(stderr).join("\n");
        }
        if (!parsed.ok) {
          parsed.error = sanitizeStatusText(
            parsed.error || "Analysis could not be completed.",
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
          error: `MedGemma runner did not return valid JSON. ${details}`,
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

const analyzeMedGemmaRequest = async (
  request: NextRequest,
  onStatus?: StatusReporter,
): Promise<{ result: RunnerResult; status: number }> => {
  let uploadPath = "";

  try {
    const formData = await request.formData();
    reportStage(onStatus, "upload_received");

    const image = formData.get("image");
    const rawPrompt = formData.get("prompt");

    reportStage(onStatus, "validating_image");

    if (!isFileLike(image)) {
      return {
        result: resultForUploadValidationError(
          "A JPG, PNG, or WebP image upload is required.",
        ),
        status: 400,
      };
    }

    const extension = ALLOWED_TYPES.get(image.type);
    if (!extension) {
      return {
        result: resultForUploadValidationError(
          "Unsupported file type. Upload a JPG, PNG, or WebP image.",
        ),
        status: 400,
      };
    }

    if (image.size <= 0) {
      return {
        result: resultForUploadValidationError("Uploaded image is empty."),
        status: 400,
      };
    }

    if (image.size > MAX_UPLOAD_BYTES) {
      return {
        result: resultForUploadValidationError(
          "Uploaded image must be 10 MB or smaller.",
        ),
        status: 400,
      };
    }

    const prompt =
      typeof rawPrompt === "string" && rawPrompt.trim()
        ? rawPrompt.trim()
        : DEFAULT_PROMPT;
    const bytes = Buffer.from(await image.arrayBuffer());

    if (bytes.length !== image.size) {
      return {
        result: resultForUploadValidationError(
          `Uploaded image size changed while reading form data (expected ${image.size} bytes, got ${bytes.length} bytes).`,
        ),
        status: 400,
      };
    }

    if (!hasValidImageSignature(bytes, image.type)) {
      return {
        result: resultForUploadValidationError(
          "Uploaded file content does not match the selected image type.",
        ),
        status: 400,
      };
    }

    reportStage(onStatus, "writing_temp_file");

    const uploadsDir = path.join(process.cwd(), ".medgemma-uploads");
    await mkdir(uploadsDir, { recursive: true });

    uploadPath = path.join(
      uploadsDir,
      `${Date.now()}-${randomUUID()}${extension}`,
    );

    try {
      await writeFile(uploadPath, bytes, { flag: "wx" });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Could not write uploaded image.";
      return { result: resultForTempWriteError(message), status: 500 };
    }

    let uploadStats;
    try {
      uploadStats = await stat(uploadPath);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Temporary upload file is missing.";
      return {
        result: resultForTempWriteError(
          `Temporary file was not readable after write. ${message}`,
        ),
        status: 500,
      };
    }

    if (!uploadStats.isFile() || uploadStats.size !== bytes.length) {
      return {
        result: resultForTempWriteError(
          `Temporary file size mismatch after write (expected ${bytes.length} bytes, got ${uploadStats.size} bytes).`,
        ),
        status: 500,
      };
    }

    const result = await runMedGemma(uploadPath, prompt, onStatus);
    if (result.ok && !result.result?.trim()) {
      return {
        result: resultForEmptyRunnerOutput(result.runnerStages),
        status: 500,
      };
    }

    if (!result.ok) {
      const prefix =
        result.errorType === "image_decode_failed"
          ? "Image decode failed"
          : "MedGemma runner failed";
      return {
        result: {
          ...result,
          error: `${prefix}: ${sanitizeStatusText(
            result.error || "Analysis could not be completed.",
          )}`,
        },
        status: 500,
      };
    }

    reportStage(onStatus, "complete");
    return { result, status: 200 };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "MedGemma analysis failed.";
    return {
      result: { ok: false, error: sanitizeStatusText(message) },
      status: 500,
    };
  } finally {
    if (uploadPath) {
      await rm(uploadPath, { force: true }).catch(() => undefined);
    }
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

      const { result, status } = await analyzeMedGemmaRequest(
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

  const { result, status } = await analyzeMedGemmaRequest(request);
  return jsonResponse(result, status);
}
