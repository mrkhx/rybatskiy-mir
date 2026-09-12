import { PrismaClient, type Prisma } from "@prisma/client";
import { SPECIES_DIETS } from "../src/game/diets";
import { HARVEST_PATCHES } from "../src/game/harvest";
import {
  fauna,
  items,
  npcs,
  quests,
  recipes,
  shops,
  species,
  spots,
  waterbodies,
} from "./content";

const prisma = new PrismaClient();

async function main(): Promise<void> {
  for (const row of waterbodies) {
    await prisma.waterbody.upsert({
      where: { id: row.id },
      update: row,
      create: row,
    });
  }

  for (const row of spots) {
    const data = { ...row, methods: [...row.methods] };
    await prisma.spot.upsert({
      where: { id: row.id },
      update: data,
      create: data,
    });
  }

  for (const fish of species) {
    const { spots: spotLinks, legendary, legendaryLore, ...rest } = fish;
    const diet = SPECIES_DIETS[fish.id] ?? null;
    const payload = {
      ...rest,
      legendary: Boolean(legendary),
      legendaryLore: legendaryLore ?? null,
      diet: diet === null ? Prisma.JsonNull : (diet as Prisma.InputJsonValue),
    };
    await prisma.fishSpecies.upsert({
      where: { id: fish.id },
      update: payload,
      create: payload,
    });
    await prisma.waterbodySpecies.upsert({
      where: { waterbodyId_speciesId: { waterbodyId: "forest-lake", speciesId: fish.id } },
      update: { abundance: 1 },
      create: { waterbodyId: "forest-lake", speciesId: fish.id, abundance: 1 },
    });
    for (const link of spotLinks) {
      await prisma.spotSpecies.upsert({
        where: { spotId_speciesId: { spotId: link.spotId, speciesId: fish.id } },
        update: { weight: link.weight },
        create: { spotId: link.spotId, speciesId: fish.id, weight: link.weight },
      });
    }
  }

  for (const item of items) {
    const data = {
      ...item,
      stats: item.stats as Prisma.InputJsonValue,
      cosmetic: "cosmetic" in item ? Boolean(item.cosmetic) : false,
    };
    await prisma.item.upsert({
      where: { id: item.id },
      update: data,
      create: data,
    });
  }

  for (const shop of shops) {
    await prisma.shop.upsert({
      where: { id: shop.id },
      update: { name: shop.name, kind: shop.kind, region: shop.region, slug: shop.slug },
      create: { id: shop.id, slug: shop.slug, name: shop.name, kind: shop.kind, region: shop.region },
    });
    for (const itemId of shop.items) {
      const catalog = items.find((i) => i.id === itemId);
      const price = catalog ? Math.max(1, catalog.value) : 10;
      await prisma.shopOffer.upsert({
        where: { shopId_itemId: { shopId: shop.id, itemId } },
        update: { price },
        create: { shopId: shop.id, itemId, price, stock: -1 },
      });
    }
  }

  for (const recipe of recipes) {
    await prisma.recipe.upsert({
      where: { id: recipe.id },
      update: { name: recipe.name, kind: recipe.kind, station: recipe.station, slug: recipe.slug },
      create: { id: recipe.id, slug: recipe.slug, name: recipe.name, kind: recipe.kind, station: recipe.station },
    });
    for (const ing of recipe.ingredients) {
      await prisma.recipeIngredient.upsert({
        where: { recipeId_itemId: { recipeId: recipe.id, itemId: ing.itemId } },
        update: { qty: ing.qty },
        create: { recipeId: recipe.id, itemId: ing.itemId, qty: ing.qty },
      });
    }
    for (const out of recipe.outputs) {
      await prisma.recipeOutput.upsert({
        where: { recipeId_itemId: { recipeId: recipe.id, itemId: out.itemId } },
        update: { qty: out.qty },
        create: { recipeId: recipe.id, itemId: out.itemId, qty: out.qty },
      });
    }
  }

  for (const animal of fauna) {
    await prisma.faunaSpecies.upsert({
      where: { id: animal.id },
      update: animal,
      create: animal,
    });
    await prisma.faunaSpawn.upsert({
      where: { faunaId_waterbodyId: { faunaId: animal.id, waterbodyId: "forest-lake" } },
      update: { abundance: animal.rare ? 0.15 : 1 },
      create: { faunaId: animal.id, waterbodyId: "forest-lake", abundance: animal.rare ? 0.15 : 1 },
    });
  }

  for (const npc of npcs) {
    await prisma.npc.upsert({
      where: { id: npc.id },
      update: npc,
      create: npc,
    });
  }

  for (const quest of quests) {
    await prisma.quest.upsert({
      where: { id: quest.id },
      update: quest,
      create: quest,
    });
  }

  for (const patch of HARVEST_PATCHES) {
    const data = {
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
    };
    const { currentStock, ...meta } = data;
    await prisma.baitHarvestPatch.upsert({
      where: { id: patch.id },
      update: meta,
      create: { id: patch.id, currentStock, ...meta },
    });
  }

  await prisma.worldClock.upsert({
    where: { id: "global" },
    update: {},
    create: { id: "global" },
  });

  const existing = await prisma.tournament.findUnique({ where: { slug: "forest-morning" } });
  if (!existing) {
    const now = new Date();
    await prisma.tournament.create({
      data: {
        slug: "forest-morning",
        title: "Утренний кубок озера",
        format: "heaviest",
        fair: true,
        waterbodyId: "forest-lake",
        startsAt: now,
        endsAt: new Date(now.getTime() + 7 * 24 * 3600 * 1000),
        rewards: { coins: [80, 40, 20], title: "Утренний" },
      },
    });
  }

  const event = await prisma.worldEvent.findFirst({ where: { slug: "perch-run" } });
  if (!event) {
    const now = new Date();
    await prisma.worldEvent.create({
      data: {
        slug: "perch-run",
        title: "На старом мосту начался выход окуня",
        description: "Временно выше активность окуня у мостика.",
        waterbodyId: "forest-lake",
        kind: "hotspot",
        startsAt: now,
        endsAt: new Date(now.getTime() + 6 * 3600 * 1000),
        modifiers: { speciesId: "perch", multiplier: 1.6 },
        active: true,
      },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
