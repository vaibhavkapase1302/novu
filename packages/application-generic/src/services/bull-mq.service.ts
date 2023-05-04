import {
  JobsOptions,
  Metrics,
  MetricsTime,
  Processor,
  Queue,
  QueueOptions,
  Worker,
  WorkerOptions,
} from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';

interface IQueueMetrics {
  completed: Metrics;
  failed: Metrics;
}

const LOG_CONTEXT = 'BullMqService';

@Injectable()
export class BullMqService {
  private _queue: Queue;
  private _worker: Worker;
  public static readonly pro: boolean =
    process.env.NOVU_MANAGED_SERVICE !== undefined;

  get worker() {
    return this._worker;
  }

  get queue() {
    return this._queue;
  }

  public static haveProInstalled(): boolean {
    if (!BullMqService.pro) {
      return false;
    }

    require('@taskforcesh/bullmq-pro');

    return true;
  }

  private runningWithProQueue() {
    return BullMqService.pro && BullMqService.haveProInstalled();
  }

  public async getQueueMetrics(): Promise<IQueueMetrics> {
    return {
      completed: await this._queue.getMetrics('completed'),
      failed: await this._queue.getMetrics('failed'),
    };
  }

  public createQueue(name: string, config: QueueOptions) {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const QueueClass = !BullMqService.pro
      ? Queue
      : require('@taskforcesh/bullmq-pro').QueuePro;

    Logger.log(
      `Creating queue ${name} bullmq pro is ${
        this.runningWithProQueue() ? 'Enabled' : 'Disabled'
      }`
    );

    this._queue = new QueueClass(name, {
      ...config,
    });

    return this._queue;
  }

  public createWorker(
    name: string,
    processor?: string | Processor<any, any, any>,
    options?: WorkerOptions
  ) {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const WorkerClass = !BullMqService.pro
      ? Worker
      : require('@taskforcesh/bullmq-pro').WorkerPro;

    let internalOptions: WorkerOptions = {};
    if (options) {
      internalOptions = options;
    }
    internalOptions.metrics = { maxDataPoints: MetricsTime.ONE_MONTH };

    this._worker = new WorkerClass(name, processor, {
      ...internalOptions,
      ...(BullMqService.pro
        ? {
            group: {},
          }
        : {}),
    });

    return this._worker;
  }

  public add(
    id: string,
    data: any,
    options: JobsOptions = {},
    groupId?: string
  ) {
    this._queue.add(id, data, {
      ...options,
      ...(BullMqService.pro && groupId
        ? {
            group: {
              id: groupId,
            },
          }
        : {}),
    });
  }

  public async gracefulShutdown(): Promise<void> {
    Logger.log('Shutting the BullMQ service down', LOG_CONTEXT);

    if (this._queue) {
      await this._queue.close();
    }
    if (this._worker) {
      await this._worker.close();
    }

    Logger.log('Shutting down the BullMQ service has finished', LOG_CONTEXT);
  }

  public async getRunningStatus(): Promise<{
    queueIsPaused: boolean;
    workerIsRunning: boolean;
  }> {
    const queueIsPaused =
      (this._queue && (await this._queue.isPaused())) || undefined;
    const workerIsRunning =
      (this._worker && (await this._worker.isRunning())) || undefined;

    return {
      queueIsPaused,
      workerIsRunning,
    };
  }

  private async pauseBullMqService(): Promise<void> {
    if (this._queue) {
      await this._queue.pause();
    }
    if (this._worker) {
      await this._worker.pause();
    }
  }

  private async resumeBullMqService(): Promise<void> {
    if (this._queue) {
      await this._queue.resume();
    }
    if (this._worker) {
      await this._worker.resume();
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.gracefulShutdown();
  }
}
