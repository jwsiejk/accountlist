import { randomUUID } from "crypto";
import { spawn } from "child_process";
import { mkdir, rm, writeFile } from "fs/promises";
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
const RUNNER_TIMEOUT_MS = Number(process.env.MEDGEMMA_RUNNER_TIMEOUT_MS || 10 * 60 * 1000);

type RunnerResult = {
  ok: boolean;
  result?: string;
  error?: string;
};

const jsonResponse = (body: RunnerResult, status = 200) => NextResponse.json(body, { status });

const isFileLike = (value: FormDataEntryValue | null): value is File => {
  return Boolean(value && typeof value === "object" && "arrayBuffer" in value && "type" in value);
};

const hasValidImageSignature = (bytes: Buffer, mimeType: string) => {
  if (mimeType === "image/jpeg") {
    return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
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

const runMedGemma = (imagePath: string, prompt: string): Promise<RunnerResult> => {
  const pythonPath = process.env.MEDGEMMA_PYTHON_PATH || "python";
  const runnerPath = path.join(process.cwd(), "scripts", "medgemma_runner.py");

  return new Promise((resolve) => {
    const child = spawn(pythonPath, [runnerPath, "--image", imagePath, "--prompt", prompt], {
      cwd: process.cwd(),
      env: process.env,
      windowsHide: true,
    });

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
      finish({ ok: false, error: `Unable to start MedGemma runner: ${error.message}` });
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
        const details = stderr.trim() || trimmedStdout || `Runner exited with code ${code}.`;
        finish({ ok: false, error: `MedGemma runner did not return valid JSON. ${details}` });
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
      return jsonResponse(
        { ok: false, error: "A JPG, PNG, or WebP image upload is required." },
        400,
      );
    }

    const extension = ALLOWED_TYPES.get(image.type);
    if (!extension) {
      return jsonResponse(
        { ok: false, error: "Unsupported file type. Upload a JPG, PNG, or WebP image." },
        400,
      );
    }

    if (image.size <= 0) {
      return jsonResponse({ ok: false, error: "Uploaded image is empty." }, 400);
    }

    if (image.size > MAX_UPLOAD_BYTES) {
      return jsonResponse({ ok: false, error: "Uploaded image must be 10 MB or smaller." }, 400);
    }

    const prompt =
      typeof rawPrompt === "string" && rawPrompt.trim() ? rawPrompt.trim() : DEFAULT_PROMPT;
    const uploadsDir = path.join(process.cwd(), ".medgemma-uploads");
    await mkdir(uploadsDir, { recursive: true });

    uploadPath = path.join(uploadsDir, `${Date.now()}-${randomUUID()}${extension}`);
    const bytes = Buffer.from(await image.arrayBuffer());

    if (!hasValidImageSignature(bytes, image.type)) {
      return jsonResponse(
        { ok: false, error: "Uploaded file content does not match the selected image type." },
        400,
      );
    }

    await writeFile(uploadPath, bytes, { flag: "wx" });

    const result = await runMedGemma(uploadPath, prompt);
    return jsonResponse(result, result.ok ? 200 : 500);
  } catch (error) {
    const message = error instanceof Error ? error.message : "MedGemma analysis failed.";
    return jsonResponse({ ok: false, error: message }, 500);
  } finally {
    if (uploadPath) {
      await rm(uploadPath, { force: true }).catch(() => undefined);
    }
  }
}
