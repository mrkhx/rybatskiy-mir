import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { PlayerModule } from "../player/player.module";
import { WorldModule } from "../world/world.module";
import { FishingController } from "./fishing.controller";
import { FishingGateway } from "./fishing.gateway";
import { FishingService } from "./fishing.service";

@Module({
  imports: [AuthModule, PlayerModule, WorldModule],
  controllers: [FishingController],
  providers: [FishingService, FishingGateway],
  exports: [FishingService],
})
export class FishingModule {}
