import { Controller, Get, Inject, UseGuards } from "@nestjs/common";
import type { AuthUser } from "../auth/auth.types";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CatalogService } from "./catalog.service";

@Controller("catalog")
export class CatalogController {
  constructor(@Inject(CatalogService) private readonly catalog: CatalogService) {}

  @Get("encyclopedia")
  @UseGuards(JwtAuthGuard)
  encyclopedia(@CurrentUser() user: AuthUser) {
    return this.catalog.encyclopedia(user.id);
  }

  @Get("diary")
  @UseGuards(JwtAuthGuard)
  diary(@CurrentUser() user: AuthUser) {
    return this.catalog.diary(user.id);
  }

  @Get("catches")
  @UseGuards(JwtAuthGuard)
  catches(@CurrentUser() user: AuthUser) {
    return this.catalog.catches(user.id);
  }

  @Get("records")
  records() {
    return this.catalog.records();
  }

  @Get("rankings")
  rankings() {
    return this.catalog.rankings();
  }

  @Get("quests")
  @UseGuards(JwtAuthGuard)
  quests(@CurrentUser() user: AuthUser) {
    return this.catalog.quests(user.id);
  }
}
