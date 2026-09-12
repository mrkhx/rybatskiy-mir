import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { PlayerModule } from "../player/player.module";
import { InventoryController } from "./inventory.controller";
import { InventoryService } from "./inventory.service";

@Module({
  imports: [AuthModule, PlayerModule],
  controllers: [InventoryController],
  providers: [InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {}
