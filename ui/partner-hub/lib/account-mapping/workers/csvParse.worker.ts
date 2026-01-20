/// <reference lib="webworker" />

/**
 * NOTE:
 * This file is bundled via `worker-loader` (see next.config.mjs). At runtime, the *importing*
 * code receives a Worker constructor as the module's default export.
 *
 * TypeScript does not understand that webpack transform, so we provide a typed placeholder
 * default export here to satisfy `import CsvParseWorker from "...csvParse.worker"`.
 *
 * The placeholder value is never used at runtime because `worker-loader` replaces the module.
 */
export default null as unknown as { new (): Worker };

self.onmessage = (e) => {
  // existing worker logic lives here
};
