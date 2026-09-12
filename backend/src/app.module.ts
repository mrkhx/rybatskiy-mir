import { Module } from "@nestjs/common";
import { AdminApiModule } from "./admin-api/admin.module";
import { AuthModule } from "./auth/auth.module";
import { CatalogModule } from "./catalog/catalog.module";
import { ConfigModule } from "./config/config.module";
import { FishingModule } from "./fishing/fishing.module";
import { HealthModule } from "./health/health.module";
import { InventoryModule } from "./inventory/inventory.module";
import { PlayerModule } from "./player/player.module";
import { PrismaModule } from "./prisma/prisma.module";
import { RealtimeModule } from "./realtime/realtime.module";
import { RedisModule } from "./redis/redis.module";
import { ShopModule } from "./shop/shop.module";
import { SocialModule } from "./social/social.module";
import { WorldModule } from "./world/world.module";

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    RedisModule,
    HealthModule,
    AuthModule,
    PlayerModule,
    WorldModule,
    FishingModule,
    InventoryModule,
    ShopModule,
    CatalogModule,
    SocialModule,
    AdminApiModule,
    RealtimeModule,
  ],
})
export class AppModule {}
