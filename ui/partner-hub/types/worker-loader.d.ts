declare module "*.worker.ts" {
  const WorkerFactory: {
    new (): globalThis.Worker;
  };
  export default WorkerFactory;
}
