import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { FishingModule } from "../fishing/fishing.module";
import { InventoryModule } from "../inventory/inventory.module";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";

@Module({
  imports: [AuthModule, FishingModule, InventoryModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminApiModule {}
