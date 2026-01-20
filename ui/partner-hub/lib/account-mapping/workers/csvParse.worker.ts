self.onmessage = (e) => {
  // existing worker logic lives here
};

const WorkerFactory = {} as unknown as { new (): Worker };

export default WorkerFactory;
