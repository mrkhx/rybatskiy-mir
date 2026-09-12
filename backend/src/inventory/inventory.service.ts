import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { timeOfDay } from "../game/clock";
import { HARVEST_PATCHES, harvestOnce, regenerateStock, type HarvestPatchSeed } from "../game/harvest";
import { systemRng } from "../game/rng";
import { harvestSkillXp, skillLevelFromXp } from "../game/xp";
import { PlayerService } from "../player/player.service";
import { PrismaService } from "../prisma/prisma.service";

const COOLDOWN_MS = 7000;

function stockLabel(ratio: number): string {
  if (ratio <= 0.05) return "истощён";
  if (ratio < 0.3) return "мало";
  if (ratio < 0.7) return "есть запас";
  return "богатый";
}

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

  async listPatches(userId: string) {
    await this.players.ensure(userId);
    await this.ensurePatches();
    const clock = await this.prisma.worldClock.findUnique({ where: { id: "global" } });
    const skill = await this.prisma.playerSkill.findUnique({
      where: { userId_skill: { userId, skill: "BAIT_HARVEST" } },
    });
    const level = skillLevelFromXp(skill?.xp ?? 0);
    const tod = timeOfDay(clock?.minutes ?? 480);
    const rows = await this.prisma.baitHarvestPatch.findMany({ orderBy: { requiredSkill: "asc" } });
    const now = Date.now();
    const view = [];
    for (const row of rows) {
      const hours = (now - row.stockUpdatedAt.getTime()) / 3_600_000;
      const stock = regenerateStock(row.currentStock, row.maxStock, row.regenerationPerHour, hours);
      if (stock !== row.currentStock) {
        await this.prisma.baitHarvestPatch.update({
          where: { id: row.id },
          data: { currentStock: stock, stockUpdatedAt: new Date(), depletion: 1 - stock / row.maxStock },
        });
      }
      const seed = HARVEST_PATCHES.find((p) => p.id === row.id);
      const rainHint =
        row.id === "lawn-trail" && clock && ["RAIN", "DOWNPOUR"].includes(clock.weather)
          ? "После дождя здесь появились выползки"
          : null;
      const ratio = stock / row.maxStock;
      view.push({
        id: row.id,
        name: row.name,
        description: row.description,
        kind: row.kind,
        requiredSkill: row.requiredSkill,
        tools: asStringArray(row.tools),
        seasons: asStringArray(row.seasons),
        stock: stockLabel(ratio),
        locked: level < row.requiredSkill,
        hint:
          rainHint ??
          (ratio <= 0.05
            ? "Участок почти истощён"
            : seed && clock && !seed.seasons.includes(clock.season)
              ? "В этом сезоне участок пуст"
              : null),
        skill: level,
        timeOfDay: tod,
      });
    }
    return { skill: level, weather: clock?.weather ?? "CLEAR", patches: view };
  }

  async harvest(userId: string, patchId: string) {
    await this.players.ensure(userId);
    await this.ensurePatches();
    const patchRow = await this.prisma.baitHarvestPatch.findUnique({ where: { id: patchId } });
    if (!patchRow) throw new BadRequestException("Нет такого участка");
    const seed = HARVEST_PATCHES.find((p) => p.id === patchId);
    if (!seed) throw new BadRequestException("Участок не настроен");
    if (patchRow.lastHarvestAt && Date.now() - patchRow.lastHarvestAt.getTime() < COOLDOWN_MS) {
      throw new BadRequestException("Подождите, участок ещё оседает");
    }

    const clock = await this.prisma.worldClock.findUnique({ where: { id: "global" } });
    const skillRow = await this.prisma.playerSkill.findUnique({
      where: { userId_skill: { userId, skill: "BAIT_HARVEST" } },
    });
    const skill = skillLevelFromXp(skillRow?.xp ?? 0);
    const hours = (Date.now() - patchRow.stockUpdatedAt.getTime()) / 3_600_000;
    const stock = regenerateStock(patchRow.currentStock, patchRow.maxStock, patchRow.regenerationPerHour, hours);

    const toolId = await this.bestTool(userId, seed);
    const result = harvestOnce(
      seed,
      stock,
      {
        season: clock?.season ?? "SUMMER",
        timeOfDay: timeOfDay(clock?.minutes ?? 480),
        weather: clock?.weather ?? "CLEAR",
        temperatureC: clock?.temperatureC ?? 16,
      },
      skill,
      toolId,
      systemRng,
    );
    if (!result.ok) throw new BadRequestException(result.reason);

    await this.prisma.baitHarvestPatch.update({
      where: { id: patchId },
      data: {
        currentStock: result.stockAfter,
        lastHarvestAt: new Date(),
        stockUpdatedAt: new Date(),
        depletion: 1 - result.stockAfter / patchRow.maxStock,
      },
    });

    const existing = await this.prisma.inventoryItem.findFirst({ where: { userId, itemId: result.itemId } });
    if (existing) {
      await this.prisma.inventoryItem.update({
        where: { id: existing.id },
        data: {
          qty: { increment: result.qty },
          quality: result.quality,
          freshness: result.quality === "fresh" ? 1 : 0.8,
          harvestedAt: new Date(),
        },
      });
    } else {
      await this.prisma.inventoryItem.create({
        data: {
          userId,
          itemId: result.itemId,
          qty: result.qty,
          quality: result.quality,
          freshness: result.quality === "fresh" ? 1 : 0.8,
          harvestedAt: new Date(),
        },
      });
    }

    const gained = harvestSkillXp(result.itemId);
    const nextXp = (skillRow?.xp ?? 0) + gained;
    await this.prisma.playerSkill.upsert({
      where: { userId_skill: { userId, skill: "BAIT_HARVEST" } },
      update: { xp: nextXp, level: skillLevelFromXp(nextXp) },
      create: { userId, skill: "BAIT_HARVEST", xp: nextXp, level: skillLevelFromXp(nextXp) },
    });

    const item = await this.prisma.item.findUnique({ where: { id: result.itemId } });
    return {
      itemId: result.itemId,
      name: item?.name ?? result.itemId,
      qty: result.qty,
      quality: result.quality,
      stock: stockLabel(result.stockAfter / patchRow.maxStock),
      skill: skillLevelFromXp(nextXp),
    };
  }

  async debugPatches() {
    await this.ensurePatches();
    const clock = await this.prisma.worldClock.findUnique({ where: { id: "global" } });
    const rows = await this.prisma.baitHarvestPatch.findMany({ orderBy: { name: "asc" } });
    return {
      clock: {
        season: clock?.season,
        weather: clock?.weather,
        temperatureC: clock?.temperatureC,
        timeOfDay: timeOfDay(clock?.minutes ?? 480),
      },
      patches: rows.map((row) => ({
        id: row.id,
        name: row.name,
        biotope: row.biotope,
        soilType: row.soilType,
        stock: row.currentStock,
        maxStock: row.maxStock,
        depletion: row.depletion,
        regenerationPerHour: row.regenerationPerHour,
        requiredSkill: row.requiredSkill,
        tools: row.tools,
        seasons: row.seasons,
        yields: row.yields,
        lastHarvestAt: row.lastHarvestAt,
      })),
    };
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

  private async bestTool(userId: string, seed: HarvestPatchSeed): Promise<string> {
    const tools = await this.prisma.inventoryItem.findMany({
      where: { userId, itemId: { in: seed.tools } },
    });
    const have = tools.find((t) => seed.tools.includes(t.itemId));
    if (!have) {
      throw new BadRequestException(seed.tools.includes("sieve") ? "Нужно сито" : "Нужна лопата");
    }
    return have.itemId;
  }

  private async ensurePatches() {
    const count = await this.prisma.baitHarvestPatch.count();
    if (count > 0) return;
    for (const patch of HARVEST_PATCHES) {
      await this.prisma.baitHarvestPatch.create({
        data: {
          id: patch.id,
          waterbodyId: patch.waterbodyId,
          slug: patch.slug,
          name: patch.name,
          kind: patch.kind,
          description: patch.description,
          soilType: patch.soilType,
          biotope: patch.biotope,
          currentStock: patch.maxStock,
          maxStock: patch.maxStock,
          regenerationPerHour: patch.regenerationPerHour,
          qualityPotential: patch.qualityPotential,
          requiredSkill: patch.requiredSkill,
          tools: patch.tools as Prisma.InputJsonValue,
          seasons: patch.seasons as Prisma.InputJsonValue,
          yields: patch.yields as Prisma.InputJsonValue,
          weatherBonus: patch.weatherBonus as Prisma.InputJsonValue,
        },
      });
    }
  }
}

function asStringArray(value: Prisma.JsonValue): string[] {
  return Array.isArray(value) ? value.filter((x): x is string => typeof x === "string") : [];
}
