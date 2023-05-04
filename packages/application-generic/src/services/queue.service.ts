import { JobsOptions, QueueBaseOptions } from 'bullmq';
import { ConnectionOptions } from 'tls';
import { getRedisPrefix } from '@novu/shared';
import { Logger } from '@nestjs/common';

import { BullMqService } from './bull-mq.service';

const LOG_CONTEXT = 'QueueService';

export class QueueService<T = unknown> {
  protected bullConfig: QueueBaseOptions = {
    connection: {
      db: Number(process.env.REDIS_DB_INDEX),
      port: Number(process.env.REDIS_PORT),
      host: process.env.REDIS_HOST,
      password: process.env.REDIS_PASSWORD,
      connectTimeout: 50000,
      keepAlive: 30000,
      family: 4,
      keyPrefix: getRedisPrefix(),
      tls: process.env.REDIS_TLS as ConnectionOptions,
    },
  };
  public readonly bullMqService: BullMqService;
  public readonly DEFAULT_ATTEMPTS = 3;

  constructor(public name = 'standard') {
    this.bullMqService = new BullMqService();
    this.bullMqService.createQueue(name, {
      ...this.bullConfig,
      defaultJobOptions: {
        removeOnComplete: true,
      },
    });
  }

  public async gracefulShutdown(): Promise<void> {
    Logger.log('Shutting the Queue service down', LOG_CONTEXT);

    await this.bullMqService.gracefulShutdown();

    Logger.log('Shutting down the Queue service has finished', LOG_CONTEXT);
  }

  async onModuleDestroy(): Promise<void> {
    await this.gracefulShutdown();
  }

  public async addToQueue(
    id: string,
    data: T,
    groupId?: string,
    options: JobsOptions = {}
  ) {
    await this.bullMqService.add(
      id,
      data,
      {
        removeOnComplete: true,
        removeOnFail: true,
        ...options,
      },
      groupId
    );
  }
}
