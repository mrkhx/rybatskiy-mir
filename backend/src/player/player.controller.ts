import { Body, Controller, Get, Inject, Post, UseGuards } from "@nestjs/common";
import { IsIn, IsOptional, IsString } from "class-validator";
import type { AuthUser } from "../auth/auth.types";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { NicknameDto } from "../fishing/dto/fishing.dto";
import { PlayerService, type PlayerProfile } from "./player.service";

class CharacterDto {
  @IsOptional()
  @IsIn(["MALE", "FEMALE", "OTHER"])
  sex?: "MALE" | "FEMALE" | "OTHER";

  @IsOptional()
  @IsString()
  faceType?: string;

  @IsOptional()
  @IsString()
  ageArchetype?: string;

  @IsOptional()
  @IsString()
  skinTone?: string;

  @IsOptional()
  @IsString()
  hairStyle?: string;

  @IsOptional()
  @IsString()
  hairColor?: string;

  @IsOptional()
  @IsString()
  facialHair?: string;

  @IsOptional()
  @IsString()
  hat?: string;

  @IsOptional()
  @IsString()
  outfit?: string;
}

@Controller("players")
export class PlayerController {
  constructor(@Inject(PlayerService) private readonly players: PlayerService) {}

  @Get("me")
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: AuthUser): Promise<PlayerProfile> {
    return this.players.getById(user.id);
  }

  @Post("me/nickname")
  @UseGuards(JwtAuthGuard)
  nick(@CurrentUser() user: AuthUser, @Body() dto: NicknameDto) {
    return this.players.claimNickname(user.id, dto.nickname);
  }

  @Post("me/character")
  @UseGuards(JwtAuthGuard)
  character(@CurrentUser() user: AuthUser, @Body() dto: CharacterDto) {
    return this.players.saveCharacter(user.id, dto);
  }
}
