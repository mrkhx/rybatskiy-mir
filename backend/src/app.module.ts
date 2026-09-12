import { Module } from "@nestjs/common";
import { AuthModule } from "./auth/auth.module";
import { ConfigModule } from "./config/config.module";
import { HealthModule } from "./health/health.module";
import { PlayerModule } from "./player/player.module";
import { PrismaModule } from "./prisma/prisma.module";
import { RealtimeModule } from "./realtime/realtime.module";
import { RedisModule } from "./redis/redis.module";

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    RedisModule,
    HealthModule,
    AuthModule,
    PlayerModule,
    RealtimeModule,
  ],
})
export class AppModule {}
