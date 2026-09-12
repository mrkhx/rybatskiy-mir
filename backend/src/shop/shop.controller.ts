import { Body, Controller, Get, Inject, Post, UseGuards } from "@nestjs/common";
import type { AuthUser } from "../auth/auth.types";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { BuyDto } from "../fishing/dto/fishing.dto";
import { ShopService } from "./shop.service";

@Controller("shops")
export class ShopController {
  constructor(@Inject(ShopService) private readonly shops: ShopService) {}

  @Get()
  list() {
    return this.shops.list();
  }

  @Post("buy")
  @UseGuards(JwtAuthGuard)
  buy(@CurrentUser() user: AuthUser, @Body() dto: BuyDto) {
    return this.shops.buy(user.id, dto.offerId, dto.qty ?? 1);
  }

  @Post("sell-keepnet")
  @UseGuards(JwtAuthGuard)
  sell(@CurrentUser() user: AuthUser) {
    return this.shops.sellKeepnet(user.id);
  }
}
