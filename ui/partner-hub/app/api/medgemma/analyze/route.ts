import { randomUUID } from "crypto";
import { spawn } from "child_process";
import { existsSync } from "fs";
import { mkdir, rm, stat, writeFile } from "fs/promises";
import path from "path";

import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const DEFAULT_PROMPT =
  "Describe visible findings in cautious medical language. List possible benign explanations and red flags that would require a clinician. Do not provide a definitive diagnosis.";

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Map([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"],
]);
const RUNNER_TIMEOUT_MS = Number(
  process.env.MEDGEMMA_RUNNER_TIMEOUT_MS || 10 * 60 * 1000,
);

type RunnerResult = {
  ok: boolean;
  result?: string;
  error?: string;
  errorType?:
    | "image_decode_failed"
    | "runner_failed"
    | "upload_validation_failed"
    | "temp_write_failed";
};

const jsonResponse = (body: RunnerResult, status = 200) =>
  NextResponse.json(body, { status });

const uploadValidationError = (error: string) =>
  jsonResponse(
    {
      ok: false,
      error: `Upload validation failed: ${error}`,
      errorType: "upload_validation_failed",
    },
    400,
  );

const tempWriteError = (error: string) =>
  jsonResponse(
    {
      ok: false,
      error: `Temporary upload write failed: ${error}`,
      errorType: "temp_write_failed",
    },
    500,
  );

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

const runMedGemma = (
  imagePath: string,
  prompt: string,
): Promise<RunnerResult> => {
  const pythonPath = getMedGemmaPythonPath();
  const runnerPath = path.join(process.cwd(), "scripts", "medgemma_runner.py");

  return new Promise((resolve) => {
    const child = spawn(
      pythonPath,
      [runnerPath, "--image", imagePath, "--prompt", prompt],
      {
        cwd: process.cwd(),
        env: process.env,
        windowsHide: true,
      },
    );

    let stdout = "";
    let stderr = "";
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
      });
    }, RUNNER_TIMEOUT_MS);

    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf8");
    });

    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });

    child.on("error", (error) => {
      clearTimeout(timeout);
      finish({
        ok: false,
        errorType: "runner_failed",
        error: `Unable to start MedGemma runner: ${error.message}`,
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
        if (!parsed.ok && stderr.trim() && !parsed.error) {
          parsed.error = stderr.trim();
        }
        finish(parsed);
      } catch {
        const details =
          stderr.trim() || trimmedStdout || `Runner exited with code ${code}.`;
        finish({
          ok: false,
          errorType: "runner_failed",
          error: `MedGemma runner did not return valid JSON. ${details}`,
        });
      }
    });
  });
};

export async function POST(request: NextRequest) {
  let uploadPath = "";

  try {
    const formData = await request.formData();
    const image = formData.get("image");
    const rawPrompt = formData.get("prompt");

    if (!isFileLike(image)) {
      return uploadValidationError(
        "A JPG, PNG, or WebP image upload is required.",
      );
    }

    const extension = ALLOWED_TYPES.get(image.type);
    if (!extension) {
      return uploadValidationError(
        "Unsupported file type. Upload a JPG, PNG, or WebP image.",
      );
    }

    if (image.size <= 0) {
      return uploadValidationError("Uploaded image is empty.");
    }

    if (image.size > MAX_UPLOAD_BYTES) {
      return uploadValidationError("Uploaded image must be 10 MB or smaller.");
    }

    const prompt =
      typeof rawPrompt === "string" && rawPrompt.trim()
        ? rawPrompt.trim()
        : DEFAULT_PROMPT;
    const uploadsDir = path.join(process.cwd(), ".medgemma-uploads");
    await mkdir(uploadsDir, { recursive: true });

    uploadPath = path.join(
      uploadsDir,
      `${Date.now()}-${randomUUID()}${extension}`,
    );
    const bytes = Buffer.from(await image.arrayBuffer());

    if (bytes.length !== image.size) {
      return uploadValidationError(
        `Uploaded image size changed while reading form data (expected ${image.size} bytes, got ${bytes.length} bytes).`,
      );
    }

    if (!hasValidImageSignature(bytes, image.type)) {
      return uploadValidationError(
        "Uploaded file content does not match the selected image type.",
      );
    }

    try {
      await writeFile(uploadPath, bytes, { flag: "wx" });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Could not write uploaded image.";
      return tempWriteError(message);
    }

    let uploadStats;
    try {
      uploadStats = await stat(uploadPath);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Temporary upload file is missing.";
      return tempWriteError(
        `Temporary file was not readable after write. ${message}`,
      );
    }

    if (!uploadStats.isFile() || uploadStats.size !== bytes.length) {
      return tempWriteError(
        `Temporary file size mismatch after write (expected ${bytes.length} bytes, got ${uploadStats.size} bytes).`,
      );
    }

    const result = await runMedGemma(uploadPath, prompt);
    if (!result.ok) {
      const prefix =
        result.errorType === "image_decode_failed"
          ? "Image decode failed"
          : "MedGemma runner failed";
      return jsonResponse(
        {
          ...result,
          error: `${prefix}: ${result.error || "Analysis could not be completed."}`,
        },
        500,
      );
    }

    return jsonResponse(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "MedGemma analysis failed.";
    return jsonResponse({ ok: false, error: message }, 500);
  } finally {
    if (uploadPath) {
      await rm(uploadPath, { force: true }).catch(() => undefined);
    }
  }
}
