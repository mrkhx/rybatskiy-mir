import { Body, Controller, Get, Inject, Post, UseGuards } from "@nestjs/common";
import { IsInt, IsString } from "class-validator";
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

  @Post("compensate")
  async compensate(@CurrentUser() user: AuthUser, @Body() dto: CompensateDto) {
    await this.admin.assertAdmin(user.id);
    return this.admin.compensate(user.id, dto.userId, dto.coins, dto.reason);
  }
}
