import { Inject, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class CatalogService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  encyclopedia(userId: string) {
    return this.prisma.encyclopediaUnlock.findMany({
      where: { userId },
      include: { species: true },
    });
  }

  diary(userId: string) {
    return this.prisma.diaryEntry.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 50 });
  }

  catches(userId: string) {
    return this.prisma.catch.findMany({
      where: { userId },
      include: { species: true, spot: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  }

  records() {
    return this.prisma.catch.findMany({
      where: { tier: { in: ["TROPHY", "RECORD", "LEGENDARY"] } },
      include: { species: true, user: { select: { nickname: true } } },
      orderBy: { createdAt: "desc" },
      take: 30,
    });
  }

  rankings() {
    return this.prisma.playerStats.findMany({
      orderBy: { xp: "desc" },
      take: 20,
      include: { user: { select: { nickname: true, id: true } } },
    });
  }

  quests(userId: string) {
    return this.prisma.quest.findMany({
      include: { progress: { where: { userId } }, npc: true },
    });
  }
}
