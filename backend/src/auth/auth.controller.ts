import { Body, Controller, Get, Inject, Post, Query, UseGuards } from "@nestjs/common";
import { AuthService } from "./auth.service";
import type { AuthUser } from "./auth.types";
import { CurrentUser } from "./current-user.decorator";
import { DevSessionDto } from "./dto/dev-session.dto";
import { JwtAuthGuard } from "./jwt-auth.guard";

@Controller("auth")
export class AuthController {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}

  @Get("vk/status")
  vkStatus(): { configured: boolean } {
    return this.auth.getVkStatus();
  }

  @Post("vk/session")
  createVkSession(@Query() query: Record<string, string | undefined>) {
    return this.auth.createVkSession(query);
  }

  @Post("dev/session")
  createDevSession(@Body() dto: DevSessionDto) {
    return this.auth.createDevSession(dto);
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: AuthUser): AuthUser {
    return user;
  }
}
