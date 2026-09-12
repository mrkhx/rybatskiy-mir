import { ForbiddenException, Inject, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AdminService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async assertAdmin(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.isAdmin) throw new ForbiddenException("Admin only");
  }

  overview() {
    return Promise.all([
      this.prisma.user.count(),
      this.prisma.catch.count(),
      this.prisma.fishSpecies.count(),
      this.prisma.item.count(),
    ]).then(([players, catches, species, items]) => ({ players, catches, species, items }));
  }

  players() {
    return this.prisma.user.findMany({
      include: { stats: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  }

  species() {
    return this.prisma.fishSpecies.findMany({ orderBy: { name: "asc" } });
  }

  waterbodies() {
    return this.prisma.waterbody.findMany({ include: { spots: true } });
  }

  items() {
    return this.prisma.item.findMany({ orderBy: { name: "asc" } });
  }

  shops() {
    return this.prisma.shop.findMany({ include: { offers: { include: { item: true } } } });
  }

  async compensate(actorId: string, userId: string, coins: number, reason: string) {
    const stats = await this.prisma.playerStats.findUnique({ where: { userId } });
    if (!stats) return { ok: false };
    await this.prisma.$transaction([
      this.prisma.playerStats.update({ where: { userId }, data: { coins: { increment: coins } } }),
      this.prisma.ledgerEntry.create({
        data: {
          userId,
          kind: "ADMIN_COMPENSATION",
          delta: coins,
          balance: stats.coins + coins,
          meta: { reason },
        },
      }),
      this.prisma.auditLog.create({
        data: { actorId, action: "compensate", target: userId, payload: { coins, reason } },
      }),
    ]);
    return { ok: true };
  }
}
