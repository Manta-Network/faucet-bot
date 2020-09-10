import Queue from "bull";
import { Config } from "../util/config";
import { SendConfig } from "../types";

export interface TaskData {
  channel: Record<string, string>;
  params: SendConfig;
}

type TaskConfig = Config["task"];

export class TaskQueue {
  private queue!: Queue.Queue;
  private config!: Config["task"];

  constructor(config: TaskConfig) {
    this.config = config;

    this.queue = new Queue("faucet-queue", {
      redis: config.redis,
    });
  }

  async insert(task: TaskData) {
    return this.queue.add(task);
  }

  process(callback: (task: TaskData) => Promise<any>) {
    this.queue.process((data) => {
      return callback(data.data);
    });
  }

  async checkPendingTask(): Promise<boolean> {
    const count = await this.queue.getDelayedCount();

    return count <= this.config.maxPendingCount;
  }
}
