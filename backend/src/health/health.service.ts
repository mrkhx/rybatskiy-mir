import { Inject, Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { RedisService } from "../redis/redis.service";

export type HealthStatus = "ok" | "error";

export type HealthResponse = {
  status: "ok" | "degraded";
  backend: HealthStatus;
  database: HealthStatus;
  redis: HealthStatus;
};

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(RedisService) private readonly redis: RedisService,
  ) {}

  async check(): Promise<HealthResponse> {
    const [database, redis] = await Promise.all([
      this.safePing("database", () => this.prisma.ping()),
      this.safePing("redis", () => this.redis.ping()),
    ]);

    return {
      status: database && redis ? "ok" : "degraded",
      backend: "ok",
      database: database ? "ok" : "error",
      redis: redis ? "ok" : "error",
    };
  }

  private async safePing(name: string, ping: () => Promise<boolean>): Promise<boolean> {
    try {
      return await ping();
    } catch (error) {
      this.logger.warn(`${name} health check failed`);
      this.logger.debug(error instanceof Error ? error.message : "unknown error");
      return false;
    }
  }
}
