declare module "*.worker.ts" {
  export const Worker: {
    new (): globalThis.Worker;
  };
}
