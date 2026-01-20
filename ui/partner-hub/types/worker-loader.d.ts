declare module "*.worker" {
  const WorkerFactory: {
    new (): globalThis.Worker;
  };
  export default WorkerFactory;
}

declare module "*.worker.ts" {
  const WorkerFactory: {
    new (): globalThis.Worker;
  };
  export default WorkerFactory;
}
