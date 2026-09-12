import { Injectable } from "@nestjs/common";
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
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async check(): Promise<HealthResponse> {
    const [databaseOk, redisOk] = await Promise.all([
      this.prisma.ping(),
      this.redis.ping(),
    ]);

    return {
      status: databaseOk && redisOk ? "ok" : "degraded",
      backend: "ok",
      database: databaseOk ? "ok" : "error",
      redis: redisOk ? "ok" : "error",
    };
  }
}
