import { Body, Controller, Get, Inject, Post, UseGuards } from "@nestjs/common";
import { IsString } from "class-validator";
import type { AuthUser } from "../auth/auth.types";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { InventoryService } from "./inventory.service";

class EquipDto {
  @IsString()
  inventoryId!: string;

  @IsString()
  slot!: string;
}

class HarvestDto {
  @IsString()
  patchId!: string;
}

class CraftDto {
  @IsString()
  recipeId!: string;
}

class EatDto {
  @IsString()
  inventoryId!: string;
}

@Controller("inventory")
@UseGuards(JwtAuthGuard)
export class InventoryController {
  constructor(@Inject(InventoryService) private readonly inventory: InventoryService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.inventory.list(user.id);
  }

  @Get("patches")
  patches(@CurrentUser() user: AuthUser) {
    return this.inventory.listPatches(user.id);
  }

  @Post("equip")
  equip(@CurrentUser() user: AuthUser, @Body() dto: EquipDto) {
    return this.inventory.equip(user.id, dto.inventoryId, dto.slot);
  }

  @Post("harvest")
  harvest(@CurrentUser() user: AuthUser, @Body() dto: HarvestDto) {
    return this.inventory.harvest(user.id, dto.patchId);
  }

  @Post("craft")
  craft(@CurrentUser() user: AuthUser, @Body() dto: CraftDto) {
    return this.inventory.craft(user.id, dto.recipeId);
  }

  @Post("eat")
  eat(@CurrentUser() user: AuthUser, @Body() dto: EatDto) {
    return this.inventory.eat(user.id, dto.inventoryId);
  }
}
