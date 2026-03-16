import webpack from "webpack";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { execFile } from "node:child_process";

const execFileAsync = promisify(execFile);
const scriptDir = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(scriptDir, "..");
const tempDir = await mkdtemp(join(tmpdir(), "job-hunter-companion-build-"));
const outFile = resolve(rootDir, "extensions/job-hunter-apply-companion/content.js");

try {
  await execFileAsync(
    "npx",
    [
      "tsc",
      "--module",
      "esnext",
      "--target",
      "ES2020",
      "--moduleResolution",
      "bundler",
      "--outDir",
      tempDir,
      "--rootDir",
      ".",
      "extensions/job-hunter-apply-companion/content.ts",
      "lib/job-hunter/applyCompanion.ts",
      "lib/job-hunter/applySession.ts",
    ],
    { cwd: rootDir },
  );

  const compiler = webpack({
    mode: "production",
    context: tempDir,
    entry: "./extensions/job-hunter-apply-companion/content.js",
    output: {
      filename: "content.js",
      path: resolve(rootDir, "extensions/job-hunter-apply-companion"),
      iife: true,
      clean: false,
    },
    target: ["web", "es2020"],
    devtool: false,
    optimization: {
      minimize: false,
    },
  });

  const stats = await new Promise((resolveStats, rejectStats) => {
    compiler.run((error, result) => {
      void compiler.close(() => {
        if (error) {
          rejectStats(error);
          return;
        }
        resolveStats(result);
      });
    });
  });

  if (!stats || stats.hasErrors()) {
    throw new Error(stats?.toString({ all: false, errors: true }) ?? "Unknown webpack error");
  }

  console.log(`Built ${outFile}`);
} finally {
  await rm(tempDir, { recursive: true, force: true });
}
