import fs from "node:fs/promises";
import path from "node:path";

const outDir = path.join(process.cwd(), "out");
const basePathDirName = "partner-hub";
const baseDir = path.join(outDir, basePathDirName);

async function pathExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function ensureEmptyDir(dir) {
  if (await pathExists(dir)) {
    await fs.rm(dir, { recursive: true, force: true });
  }
  await fs.mkdir(dir, { recursive: true });
}

async function main() {
  if (!(await pathExists(outDir))) {
    throw new Error(
      `Expected Next.js static export output at ${outDir} but it does not exist. ` +
        `Did the build succeed?`,
    );
  }

  // Next.js static export (output: "export") always writes routes to out/ based on
  // their route path WITHOUT basePath. When basePath is "/partner-hub", we want the
  // filesystem to match the served URL prefix, so we move the export under out/partner-hub/.
  await ensureEmptyDir(baseDir);

  const entries = await fs.readdir(outDir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === basePathDirName) continue;

    const from = path.join(outDir, entry.name);
    const to = path.join(baseDir, entry.name);
    await fs.rename(from, to);
  }

  // Optional convenience: make / redirect to /partner-hub/ when serving out/.
  const redirectHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta http-equiv="refresh" content="0; url=/${basePathDirName}/" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Redirecting…</title>
    <script>
      window.location.replace('/${basePathDirName}/');
    </script>
  </head>
  <body>
    <p>Redirecting to <a href="/${basePathDirName}/">/${basePathDirName}/</a>…</p>
  </body>
</html>
`;

  await fs.writeFile(path.join(outDir, "index.html"), redirectHtml, "utf8");

  console.log(`Static export relocated to: ${baseDir}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
