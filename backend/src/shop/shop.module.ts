import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { PlayerModule } from "../player/player.module";
import { ShopController } from "./shop.controller";
import { ShopService } from "./shop.service";

@Module({
  imports: [AuthModule, PlayerModule],
  controllers: [ShopController],
  providers: [ShopService],
})
export class ShopModule {}
