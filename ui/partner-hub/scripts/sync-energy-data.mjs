import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const cwd = process.cwd();
const repoRoot = path.resolve(cwd, "..", "..");
const sourceFiles = [
  "energy/data/netapp_e_series.csv",
  "energy/data/pure_flashblade_e.csv",
];
const reportFile = "energy/data/vendor_update_report.json";

const destDir = path.join(cwd, "public", "data", "energy");

const readFileSha256 = async (filePath) => {
  const buf = await fs.readFile(filePath);
  return crypto.createHash("sha256").update(buf).digest("hex");
};

const main = async () => {
  await fs.mkdir(destDir, { recursive: true });

  const copiedFiles = [];
  const sha256 = {};
  const reportFiles = [];

  for (const rel of sourceFiles) {
    const sourcePath = path.join(repoRoot, rel);
    const destPath = path.join(destDir, path.basename(rel));
    await fs.copyFile(sourcePath, destPath);
    copiedFiles.push(path.join("ui", "partner-hub", "public", "data", "energy", path.basename(rel)));
    sha256[path.basename(rel)] = await readFileSha256(destPath);
  }

  const reportSourcePath = path.join(repoRoot, reportFile);
  try {
    await fs.access(reportSourcePath);
    const reportDestPath = path.join(destDir, path.basename(reportFile));
    await fs.copyFile(reportSourcePath, reportDestPath);
    copiedFiles.push(path.join("ui", "partner-hub", "public", "data", "energy", path.basename(reportFile)));
    sha256[path.basename(reportFile)] = await readFileSha256(reportDestPath);
    reportFiles.push(reportFile);
  } catch (err) {
    if (err && err.code !== "ENOENT") {
      throw err;
    }
  }

  const meta = {
    lastSyncedISO: new Date().toISOString(),
    sourceFiles,
    copiedFiles,
    sha256,
    reportFiles,
  };

  const metaPath = path.join(destDir, "energy_data_meta.json");
  await fs.writeFile(metaPath, `${JSON.stringify(meta, null, 2)}\n`);
};

main().catch((err) => {
  console.error("Failed to sync energy data:", err);
  process.exitCode = 1;
});
