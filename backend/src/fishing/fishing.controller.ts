import { Body, Controller, Get, Inject, Post, UseGuards } from "@nestjs/common";
import type { AuthUser } from "../auth/auth.types";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CastDto, DecideDto, HookDto, StartFishingDto, TickDto } from "./dto/fishing.dto";
import { FishingService } from "./fishing.service";

@Controller("fishing")
@UseGuards(JwtAuthGuard)
export class FishingController {
  constructor(@Inject(FishingService) private readonly fishing: FishingService) {}

  @Get("session")
  session(@CurrentUser() user: AuthUser) {
    return this.fishing.getActive(user.id);
  }

  @Post("start")
  start(@CurrentUser() user: AuthUser, @Body() dto: StartFishingDto) {
    return this.fishing.start(user.id, dto);
  }

  @Post("cast")
  cast(@CurrentUser() user: AuthUser, @Body() dto: CastDto) {
    return this.fishing.cast(user.id, dto);
  }

  @Post("bite")
  bite(@CurrentUser() user: AuthUser) {
    return this.fishing.peekBite(user.id);
  }

  @Post("hook")
  hook(@CurrentUser() user: AuthUser, @Body() dto: HookDto) {
    return this.fishing.hook(user.id, dto.timingMs);
  }

  @Post("tick")
  tick(@CurrentUser() user: AuthUser, @Body() dto: TickDto) {
    return this.fishing.tick(user.id, dto);
  }

  @Post("decide")
  decide(@CurrentUser() user: AuthUser, @Body() dto: DecideDto) {
    return this.fishing.decide(user.id, dto.keep);
  }
}
