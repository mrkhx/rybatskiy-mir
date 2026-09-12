import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import Redis from "ioredis";
import { APP_ENV, type AppEnv } from "../config/env";

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly client: Redis;

  constructor(@Inject(APP_ENV) env: AppEnv) {
    this.client = new Redis(env.redisUrl, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableReadyCheck: true,
    });
    this.client.on("error", () => {
      this.logger.error("Redis connection error");
    });
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.client.connect();
    } catch {
      this.logger.error("Redis is unavailable at startup");
    }
  }

  async onModuleDestroy(): Promise<void> {
    this.client.disconnect();
  }

  async ping(): Promise<boolean> {
    try {
      return (await this.client.ping()) === "PONG";
    } catch {
      return false;
    }
  }

  getClient(): Redis {
    return this.client;
  }
}
