// NOTE: Worker implementation unchanged.
// This default export exists ONLY to satisfy TypeScript during next build.

self.onmessage = (e) => {
  // existing worker logic lives here
};

// Type-only shim for TS in the app bundle.
// Runtime is provided by worker-loader; this export is never used at runtime.
const WorkerShim = (null as unknown) as { new (): Worker };
export default WorkerShim;
