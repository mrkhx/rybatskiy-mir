import { Body, Controller, Get, Inject, Post, Query, UseGuards } from "@nestjs/common";
import { IsString } from "class-validator";
import type { AuthUser } from "../auth/auth.types";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { ChatDto } from "../fishing/dto/fishing.dto";
import { SocialService } from "./social.service";

class ClubDto {
  @IsString()
  name!: string;

  @IsString()
  tag!: string;
}

@Controller("social")
export class SocialController {
  constructor(@Inject(SocialService) private readonly social: SocialService) {}

  @Get("chat")
  history(@Query("channel") channel: ChatDto["channel"] = "GLOBAL", @Query("roomId") roomId = "global") {
    return this.social.history(channel, roomId);
  }

  @Post("chat")
  @UseGuards(JwtAuthGuard)
  send(@CurrentUser() user: AuthUser, @Body() dto: ChatDto) {
    return this.social.send(user.id, dto.channel, dto.roomId, dto.body);
  }

  @Get("clubs")
  clubs() {
    return this.social.clubs();
  }

  @Get("club")
  @UseGuards(JwtAuthGuard)
  mine(@CurrentUser() user: AuthUser) {
    return this.social.myClub(user.id);
  }

  @Post("club")
  @UseGuards(JwtAuthGuard)
  create(@CurrentUser() user: AuthUser, @Body() dto: ClubDto) {
    return this.social.createClub(user.id, dto.name, dto.tag);
  }
}
