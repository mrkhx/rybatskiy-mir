import { Controller, Get, UseGuards } from "@nestjs/common";
import type { AuthUser } from "../auth/auth.types";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PlayerService, type PlayerProfile } from "./player.service";

@Controller("players")
export class PlayerController {
  constructor(private readonly players: PlayerService) {}

  @Get("me")
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: AuthUser): Promise<PlayerProfile> {
    return this.players.getById(user.id);
  }
}
