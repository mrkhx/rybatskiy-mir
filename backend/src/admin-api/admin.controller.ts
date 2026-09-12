import { Body, Controller, Get, Inject, Post, Query, UseGuards } from "@nestjs/common";
import { IsInt, IsOptional, IsString } from "class-validator";
import { Type } from "class-transformer";
import type { FishingMethod } from "@prisma/client";
import type { AuthUser } from "../auth/auth.types";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { AdminService } from "./admin.service";

class CompensateDto {
  @IsString()
  userId!: string;

  @IsInt()
  coins!: number;

  @IsString()
  reason!: string;
}

class BiteDebugQuery {
  @IsOptional()
  @IsString()
  spotId?: string;

  @IsOptional()
  @IsString()
  method?: FishingMethod;

  @IsOptional()
  @IsString()
  bait?: string;

  @IsOptional()
  @IsString()
  lure?: string;

  @IsOptional()
  @IsString()
  retrieve?: string;

  @IsOptional()
  @Type(() => Number)
  depthM?: number;
}

@Controller("admin")
@UseGuards(JwtAuthGuard)
export class AdminController {
  constructor(@Inject(AdminService) private readonly admin: AdminService) {}

  @Get("overview")
  async overview(@CurrentUser() user: AuthUser) {
    await this.admin.assertAdmin(user.id);
    return this.admin.overview();
  }

  @Get("players")
  async players(@CurrentUser() user: AuthUser) {
    await this.admin.assertAdmin(user.id);
    return this.admin.players();
  }

  @Get("species")
  async species(@CurrentUser() user: AuthUser) {
    await this.admin.assertAdmin(user.id);
    return this.admin.species();
  }

  @Get("waterbodies")
  async waterbodies(@CurrentUser() user: AuthUser) {
    await this.admin.assertAdmin(user.id);
    return this.admin.waterbodies();
  }

  @Get("items")
  async items(@CurrentUser() user: AuthUser) {
    await this.admin.assertAdmin(user.id);
    return this.admin.items();
  }

  @Get("shops")
  async shops(@CurrentUser() user: AuthUser) {
    await this.admin.assertAdmin(user.id);
    return this.admin.shops();
  }

  @Get("bite-debug")
  async biteDebug(@CurrentUser() user: AuthUser, @Query() query: BiteDebugQuery) {
    await this.admin.assertAdmin(user.id);
    return this.admin.biteDebug(query);
  }

  @Get("harvest-debug")
  async harvestDebug(@CurrentUser() user: AuthUser) {
    await this.admin.assertAdmin(user.id);
    return this.admin.harvestDebug();
  }

  @Post("compensate")
  async compensate(@CurrentUser() user: AuthUser, @Body() dto: CompensateDto) {
    await this.admin.assertAdmin(user.id);
    return this.admin.compensate(user.id, dto.userId, dto.coins, dto.reason);
  }
}
