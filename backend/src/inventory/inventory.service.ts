import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { PlayerService } from "../player/player.service";

@Injectable()
export class InventoryService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(PlayerService) private readonly players: PlayerService,
  ) {}

  async list(userId: string) {
    await this.players.ensure(userId);
    return this.prisma.inventoryItem.findMany({
      where: { userId },
      include: { item: true },
      orderBy: { itemId: "asc" },
    });
  }

  async equip(userId: string, inventoryId: string, slot: string) {
    const row = await this.prisma.inventoryItem.findFirst({ where: { id: inventoryId, userId } });
    if (!row) throw new BadRequestException("Нет предмета");
    await this.prisma.inventoryItem.updateMany({
      where: { userId, slot },
      data: { equipped: false, slot: null },
    });
    return this.prisma.inventoryItem.update({
      where: { id: row.id },
      data: { equipped: true, slot },
    });
  }

  async harvest(userId: string, kind: "worm" | "bloodworm") {
    const toolId = kind === "worm" ? "shovel" : "sieve";
    const tool = await this.prisma.inventoryItem.findFirst({ where: { userId, itemId: toolId } });
    if (!tool) throw new BadRequestException(kind === "worm" ? "Нужна лопата" : "Нужно сито");
    const clock = await this.prisma.worldClock.findUnique({ where: { id: "global" } });
    const rainBonus = clock && ["RAIN", "DOWNPOUR"].includes(clock.weather) ? 3 : 0;
    const qty = 3 + rainBonus;
    const itemId = kind;
    const existing = await this.prisma.inventoryItem.findFirst({ where: { userId, itemId } });
    if (existing) {
      await this.prisma.inventoryItem.update({ where: { id: existing.id }, data: { qty: { increment: qty } } });
    } else {
      await this.prisma.inventoryItem.create({ data: { userId, itemId, qty } });
    }
    await this.prisma.playerSkill.upsert({
      where: { userId_skill: { userId, skill: "BAIT_HARVEST" } },
      update: { xp: { increment: 6 } },
      create: { userId, skill: "BAIT_HARVEST", xp: 6 },
    });
    return { itemId, qty };
  }

  async craft(userId: string, recipeId: string) {
    const recipe = await this.prisma.recipe.findUnique({
      where: { id: recipeId },
      include: { ingredients: true, outputs: true },
    });
    if (!recipe) throw new BadRequestException("Нет рецепта");
    await this.prisma.$transaction(async (tx) => {
      for (const ing of recipe.ingredients) {
        const have = await tx.inventoryItem.findFirst({ where: { userId, itemId: ing.itemId } });
        if (!have || have.qty < ing.qty) throw new BadRequestException("Не хватает ингредиентов");
        if (have.qty === ing.qty) await tx.inventoryItem.delete({ where: { id: have.id } });
        else await tx.inventoryItem.update({ where: { id: have.id }, data: { qty: { decrement: ing.qty } } });
      }
      for (const out of recipe.outputs) {
        const have = await tx.inventoryItem.findFirst({ where: { userId, itemId: out.itemId } });
        if (have) await tx.inventoryItem.update({ where: { id: have.id }, data: { qty: { increment: out.qty } } });
        else await tx.inventoryItem.create({ data: { userId, itemId: out.itemId, qty: out.qty } });
      }
    });
    return this.list(userId);
  }

  async eat(userId: string, inventoryId: string) {
    const row = await this.prisma.inventoryItem.findFirst({
      where: { id: inventoryId, userId },
      include: { item: true },
    });
    if (!row || (row.item.kind !== "FOOD" && row.item.kind !== "DRINK")) {
      throw new BadRequestException("Это нельзя съесть");
    }
    const stats = (row.item.stats ?? {}) as { hunger?: number; thirst?: number; warmth?: number; stamina?: number };
    await this.prisma.$transaction(async (tx) => {
      if (row.qty <= 1) await tx.inventoryItem.delete({ where: { id: row.id } });
      else await tx.inventoryItem.update({ where: { id: row.id }, data: { qty: { decrement: 1 } } });
      await tx.playerStats.update({
        where: { userId },
        data: {
          hunger: { increment: stats.hunger ?? 0 },
          thirst: { increment: stats.thirst ?? 0 },
          warmth: { increment: stats.warmth ?? 0 },
          stamina: { increment: stats.stamina ?? 0 },
        },
      });
    });
    return this.players.getById(userId);
  }
}
