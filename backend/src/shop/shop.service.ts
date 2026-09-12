import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { PlayerService } from "../player/player.service";

@Injectable()
export class ShopService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(PlayerService) private readonly players: PlayerService,
  ) {}

  list() {
    return this.prisma.shop.findMany({ include: { offers: { include: { item: true } } }, orderBy: { name: "asc" } });
  }

  async buy(userId: string, offerId: string, qty = 1) {
    await this.players.ensure(userId);
    if (qty < 1 || qty > 50) throw new BadRequestException("Некорректное количество");
    return this.prisma.$transaction(async (tx) => {
      const offer = await tx.shopOffer.findUnique({ where: { id: offerId }, include: { item: true } });
      if (!offer) throw new BadRequestException("Нет предложения");
      if (offer.item.p2w) throw new BadRequestException("Pay-to-win предметы запрещены");
      const cost = offer.price * qty;
      const stats = await tx.playerStats.findUnique({ where: { userId } });
      if (!stats || stats.coins < cost) throw new BadRequestException("Не хватает монет");
      await tx.playerStats.update({ where: { userId }, data: { coins: { decrement: cost } } });
      const have = await tx.inventoryItem.findFirst({ where: { userId, itemId: offer.itemId } });
      if (have && offer.item.stackable) {
        await tx.inventoryItem.update({ where: { id: have.id }, data: { qty: { increment: qty } } });
      } else {
        await tx.inventoryItem.create({ data: { userId, itemId: offer.itemId, qty } });
      }
      await tx.ledgerEntry.create({
        data: {
          userId,
          kind: "SHOP_BUY",
          delta: -cost,
          balance: stats.coins - cost,
          meta: { offerId, qty },
        },
      });
      return { ok: true, balance: stats.coins - cost };
    });
  }

  async sellKeepnet(userId: string) {
    const stats = await this.prisma.playerStats.findUnique({ where: { userId } });
    if (!stats || stats.keepnetCount === 0) throw new BadRequestException("Садок пуст");
    const coins = Math.max(4, Math.round(stats.keepnetWeightG / 80));
    await this.prisma.$transaction([
      this.prisma.playerStats.update({
        where: { userId },
        data: { coins: { increment: coins }, keepnetCount: 0, keepnetWeightG: 0 },
      }),
      this.prisma.ledgerEntry.create({
        data: { userId, kind: "CATCH_SALE", delta: coins, balance: stats.coins + coins, meta: { keepnet: true } },
      }),
    ]);
    return { coins };
  }
}
