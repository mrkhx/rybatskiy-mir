import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { FishingMethod, Prisma } from "@prisma/client";
import { rollBite } from "../game/bite";
import { timeOfDay } from "../game/clock";
import { hookSuccess, stepFight, type FightConfig } from "../game/fight";
import { systemRng, type Rng } from "../game/rng";
import { assertTransition, isTerminal } from "../game/state-machine";
import type { BiteContext, FightSnapshot, FightTick, FishingState, LoseReason, SpeciesForBite } from "../game/types";
import { rollSpecimen } from "../game/weight";
import { applyXp, catchXp, skillXpForCatch } from "../game/xp";
import { PlayerService } from "../player/player.service";
import { PrismaService } from "../prisma/prisma.service";
import { WorldService } from "../world/world.service";

const METHOD_SKILL: Record<string, "FLOAT" | "SPINNING" | "FEEDER" | "BOTTOM"> = {
  FLOAT: "FLOAT",
  SPINNING: "SPINNING",
  FEEDER: "FEEDER",
  BOTTOM: "BOTTOM",
};

@Injectable()
export class FishingService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(WorldService) private readonly world: WorldService,
    @Inject(PlayerService) private readonly players: PlayerService,
  ) {}

  async getActive(userId: string) {
    return this.prisma.fishingSession.findFirst({
      where: { userId, endedAt: null },
      orderBy: { createdAt: "desc" },
    });
  }

  async start(userId: string, input: { spotId: string; method: FishingMethod }) {
    await this.players.ensure(userId);

    const spot = await this.prisma.spot.findUnique({ where: { id: input.spotId } });
    if (!spot) throw new NotFoundException("Spot not found");
    if (spot.secret) {
      const stats = await this.prisma.playerStats.findUnique({ where: { userId } });
      if ((stats?.explorationPct ?? 0) < 35) {
        throw new BadRequestException("Секретная точка ещё не открыта");
      }
    }
    if (!spot.methods.includes(input.method)) {
      throw new BadRequestException("Этот метод здесь недоступен");
    }

    const kit = await this.equipped(userId, input.method);
    const existing = await this.getActive(userId);
    if (existing && !isTerminal(existing.state as FishingState)) {
      const same = existing.spotId === input.spotId && existing.method === input.method;
      if (same && existing.state === "READY") return existing;
      if (existing.state === "BITE" || existing.state === "HOOKED" || existing.state === "FIGHTING") {
        throw new BadRequestException("Сначала закончите текущую ловлю");
      }
    }
    if (existing) {
      await this.prisma.fishingSession.update({
        where: { id: existing.id },
        data: { endedAt: new Date() },
      });
    }

    return this.prisma.fishingSession.create({
      data: {
        userId,
        waterbodyId: spot.waterbodyId,
        spotId: spot.id,
        method: input.method,
        state: "READY",
        rodItemId: kit.rod,
        reelItemId: kit.reel,
        lineItemId: kit.line,
        baitItemId: kit.bait,
        lureItemId: kit.lure,
      },
    });
  }

  async cast(userId: string, input: { force: number; direction: number; depthM: number }) {
    const session = await this.requireActive(userId);
    assertTransition(session.state as FishingState, "CAST");
    const force = clamp(input.force, 0.15, 1);
    const depthM = clamp(input.depthM, 0.3, 8);
    await this.prisma.fishingSession.update({
      where: { id: session.id },
      data: { state: "CAST", castForce: force, castDir: input.direction, depthM },
    });
    const waiting = await this.prisma.fishingSession.update({
      where: { id: session.id },
      data: { state: "WAITING_BITE" },
    });
    return this.scheduleBite(waiting);
  }

  async peekBite(userId: string, rng: Rng = systemRng) {
    const session = await this.requireActive(userId);
    if (session.state !== "WAITING_BITE") return session;
    if (session.biteAt && session.biteAt > new Date()) return session;
    return this.resolveWaiting(session, rng);
  }

  async hook(userId: string, timingMs: number, rng: Rng = systemRng) {
    const session = await this.peekBite(userId, rng);
    if (session.state === "WAITING_BITE") {
      return this.fail(session, "missed_bite");
    }
    if (session.state !== "BITE") {
      throw new BadRequestException("Сейчас нельзя подсекать");
    }
    const ok = hookSuccess(rng, timingMs, 900, 0.7, 0.2);
    if (!ok) return this.fail(session, "weak_hookset");
    assertTransition("BITE", "HOOKED");
    return this.prisma.fishingSession.update({
      where: { id: session.id },
      data: { state: "HOOKED", hookedAt: new Date(), fishStamina: 1, tension: 0.3, fightProgress: 0, lineIntegrity: 1 },
    });
  }

  async tick(userId: string, tick: FightTick, rng: Rng = systemRng) {
    const session = await this.requireActive(userId);
    if (session.state === "HOOKED") {
      assertTransition("HOOKED", "FIGHTING");
      await this.prisma.fishingSession.update({ where: { id: session.id }, data: { state: "FIGHTING" } });
    }
    const live = await this.requireActive(userId);
    if (live.state !== "FIGHTING") throw new BadRequestException("Нет вываживания");

    const species = live.speciesId
      ? await this.prisma.fishSpecies.findUnique({ where: { id: live.speciesId } })
      : null;
    const profile = (species?.fightProfile as FightConfig["profile"]) ?? {
      pull: 0.5,
      directionChange: 0.4,
      coverSeek: 0.2,
      stamina: 0.8,
    };
    const spot = await this.prisma.spot.findUnique({ where: { id: live.spotId } });
    const snap: FightSnapshot = {
      tension: live.tension,
      fishStamina: live.fishStamina,
      lineIntegrity: live.lineIntegrity,
      progress: live.fightProgress,
      surge: 0,
    };
    const result = stepFight(rng, snap, tick, {
      profile,
      lineStrength: 0.95,
      rodPower: 0.6,
      dragQuality: 0.65,
      hookQuality: 0.7,
      skill: 0.2,
      cover: spot?.kind === "snags" ? 0.8 : 0.25,
      playerStamina: 0.9,
    }, 0.35);

    if (result.outcome === "lost") return this.fail(live, result.reason);
    if (result.outcome === "landed") {
      return this.land(live);
    }
    return this.prisma.fishingSession.update({
      where: { id: live.id },
      data: {
        tension: result.snap.tension,
        fishStamina: result.snap.fishStamina,
        lineIntegrity: result.snap.lineIntegrity,
        fightProgress: result.snap.progress,
      },
    });
  }

  async decide(userId: string, keep: boolean) {
    const session = await this.prisma.fishingSession.findFirst({
      where: { userId, state: "LANDED" },
      orderBy: { createdAt: "desc" },
    });
    if (!session?.speciesId || !session.weightG) throw new BadRequestException("Нет улова");
    const catchRow = await this.prisma.catch.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
    if (catchRow && keep !== catchRow.kept) {
      await this.prisma.catch.update({ where: { id: catchRow.id }, data: { kept: keep } });
    }
    if (keep && catchRow) {
      const stats = await this.prisma.playerStats.findUnique({ where: { userId } });
      if (stats) {
        const nextCount = stats.keepnetCount + 1;
        const nextWeight = stats.keepnetWeightG + catchRow.weightG;
        if (nextCount > stats.keepnetCap || nextWeight > stats.keepnetWeightCap) {
          throw new BadRequestException("Садок полон — отпустите рыбу");
        }
        await this.prisma.playerStats.update({
          where: { userId },
          data: { keepnetCount: nextCount, keepnetWeightG: nextWeight },
        });
      }
    }
    await this.prisma.fishingSession.update({
      where: { id: session.id },
      data: { state: "READY", speciesId: null, weightG: null, lengthCm: null, tier: null, endedAt: new Date() },
    });
    return this.start(userId, { spotId: session.spotId, method: session.method });
  }

  private async scheduleBite(session: { id: string; userId: string; spotId: string; method: FishingMethod; baitItemId: string | null; lureItemId: string | null; depthM: number | null }) {
    const rng = systemRng;
    const clock = await this.world.getClock();
    const links = await this.prisma.spotSpecies.findMany({
      where: { spotId: session.spotId },
      include: { species: true },
    });
    const events = await this.world.activeEvents("forest-lake");
    const ctx = this.context(session, clock, events);
    const pool: SpeciesForBite[] = links.map((l) => ({
      id: l.species.id,
      slug: l.species.slug,
      spotWeight: l.weight,
      baits: asStringArray(l.species.baits),
      lures: asStringArray(l.species.lures),
      methods: speciesMethods(asStringArray(l.species.baits), asStringArray(l.species.lures)),
      activity: l.species.activity as SpeciesForBite["activity"],
      legendary: l.species.legendary,
    }));
    const roll = rollBite(rng, pool, ctx);
    return this.prisma.fishingSession.update({
      where: { id: session.id },
      data: { biteAt: new Date(Date.now() + roll.delayMs) },
    });
  }

  private async resolveWaiting(
    session: {
      id: string;
      userId: string;
      spotId: string;
      method: FishingMethod;
      baitItemId: string | null;
      lureItemId: string | null;
      depthM: number | null;
    },
    rng: Rng,
  ) {
    const clock = await this.world.getClock();
    const links = await this.prisma.spotSpecies.findMany({
      where: { spotId: session.spotId },
      include: { species: true },
    });
    const events = await this.world.activeEvents("forest-lake");
    const ctx = this.context(session, clock, events);
    const pool: SpeciesForBite[] = links.map((l) => ({
      id: l.species.id,
      slug: l.species.slug,
      spotWeight: l.weight * eventBoost(l.speciesId, events),
      baits: asStringArray(l.species.baits),
      lures: asStringArray(l.species.lures),
      methods: speciesMethods(asStringArray(l.species.baits), asStringArray(l.species.lures)),
      activity: l.species.activity as SpeciesForBite["activity"],
      legendary: l.species.legendary,
    }));
    const roll = rollBite(rng, pool, ctx);
    if (!roll.species) return this.fail(session, "missed_bite");
    const species = await this.prisma.fishSpecies.findUnique({ where: { id: roll.species.id } });
    if (!species) return this.fail(session, "missed_bite");
    const spot = await this.prisma.spot.findUnique({ where: { id: session.spotId } });
    const specimen = rollSpecimen(rng, species, 1 + (spot?.trophyChance ?? 0));
    assertTransition("WAITING_BITE", "BITE");
    return this.prisma.fishingSession.update({
      where: { id: session.id },
      data: {
        state: "BITE",
        speciesId: specimen.speciesId,
        weightG: specimen.weightG,
        lengthCm: specimen.lengthCm,
        tier: specimen.tier,
      },
    });
  }

  private async land(session: {
    id: string;
    userId: string;
    speciesId: string | null;
    waterbodyId: string;
    spotId: string;
    method: FishingMethod;
    weightG: number | null;
    lengthCm: number | null;
    tier: string | null;
    rodItemId: string | null;
    baitItemId: string | null;
    lureItemId: string | null;
    depthM: number | null;
  }) {
    if (!session.speciesId || !session.weightG || !session.tier || !session.lengthCm) {
      throw new BadRequestException("Нет экземпляра");
    }
    assertTransition("FIGHTING", "LANDED");
    const species = await this.prisma.fishSpecies.findUnique({ where: { id: session.speciesId } });
    if (!species) throw new NotFoundException("species");
    const clock = await this.world.getClock();
    const stats = await this.prisma.playerStats.findUnique({ where: { userId: session.userId } });
    const premium = await this.prisma.premiumGrant.findFirst({
      where: { userId: session.userId, endsAt: { gt: new Date() } },
    });
    const xp = catchXp({
      baseXp: species.baseXp,
      weightG: session.weightG,
      avgWeightG: species.avgWeightG,
      tier: session.tier as "COMMON" | "LARGE" | "TROPHY" | "RECORD" | "LEGENDARY",
      methodBonus: 0,
      released: false,
      premiumBoost: premium?.xpBoost ?? 0,
    });
    const progress = applyXp(stats?.level ?? 1, stats?.xp ?? 0, xp);
    const flags = await this.recordFlags(session.userId, session.speciesId, session.waterbodyId, session.weightG);

    await this.prisma.$transaction(async (tx) => {
      const caught = await tx.catch.create({
        data: {
          userId: session.userId,
          speciesId: session.speciesId!,
          waterbodyId: session.waterbodyId,
          spotId: session.spotId,
          weightG: session.weightG!,
          lengthCm: session.lengthCm!,
          tier: session.tier as "COMMON" | "LARGE" | "TROPHY" | "RECORD" | "LEGENDARY",
          method: session.method,
          rodItemId: session.rodItemId,
          baitItemId: session.baitItemId,
          lureItemId: session.lureItemId,
          weather: clock.weather,
          timeOfDay: timeOfDay(clock.minutes),
          season: clock.season,
          depthM: session.depthM ?? 1.5,
          xpGranted: xp,
          coinsGranted: 0,
          kept: false,
          recordFlags: flags as Prisma.InputJsonValue,
        },
      });
      await tx.fishingSession.update({ where: { id: session.id }, data: { state: "LANDED" } });
      if (stats) {
        await tx.playerStats.update({
          where: { userId: session.userId },
          data: { level: progress.level, xp: progress.xp },
        });
      }
      const skill = METHOD_SKILL[session.method] ?? "FLOAT";
      await tx.playerSkill.upsert({
        where: { userId_skill: { userId: session.userId, skill } },
        update: { xp: { increment: skillXpForCatch(session.tier as "COMMON", true) } },
        create: { userId: session.userId, skill, xp: skillXpForCatch(session.tier as "COMMON", true) },
      });
      await tx.encyclopediaUnlock.upsert({
        where: { userId_speciesId: { userId: session.userId, speciesId: session.speciesId! } },
        update: { fields: { seen: true, weight: session.weightG } },
        create: {
          userId: session.userId,
          speciesId: session.speciesId!,
          fields: { seen: true, weight: session.weightG },
        },
      });
      if (["TROPHY", "RECORD", "LEGENDARY"].includes(session.tier ?? "")) {
        await tx.diaryEntry.create({
          data: {
            userId: session.userId,
            catchId: caught.id,
            summary: `${species.name} ${session.weightG} г`,
            details: { spotId: session.spotId, weather: clock.weather, method: session.method },
          },
        });
      }
    });

    await this.consumeBait(session.userId, session.method === "SPINNING" ? session.lureItemId : session.baitItemId);
    return this.prisma.fishingSession.findUnique({ where: { id: session.id } });
  }

  private async fail(session: { id: string }, reason: LoseReason) {
    const from = (await this.prisma.fishingSession.findUnique({ where: { id: session.id } }))?.state as FishingState;
    const to = reason === "line_broke" || reason === "over_tension" ? "BROKEN" : "LOST";
    if (from && from !== to) {
      try {
        assertTransition(from, to);
      } catch {
        /* already ending */
      }
    }
    return this.prisma.fishingSession.update({
      where: { id: session.id },
      data: { state: to, loseReason: reason, endedAt: new Date() },
    });
  }

  private async recordFlags(userId: string, speciesId: string, waterbodyId: string, weightG: number) {
    const personal = await this.prisma.catch.findFirst({
      where: { userId, speciesId },
      orderBy: { weightG: "desc" },
    });
    const water = await this.prisma.catch.findFirst({
      where: { waterbodyId, speciesId },
      orderBy: { weightG: "desc" },
    });
    const flags = {
      personal: !personal || weightG > personal.weightG,
      waterbody: !water || weightG > water.weightG,
    };
    if (flags.personal) {
      await this.prisma.recordEntry.create({
        data: {
          scope: "personal",
          speciesId,
          waterbodyId,
          userId,
          catchId: "pending",
          weightG,
          previousUserId: personal?.userId,
        },
      });
    }
    return flags;
  }

  private async consumeBait(userId: string, itemId: string | null) {
    if (!itemId) return;
    const row = await this.prisma.inventoryItem.findFirst({ where: { userId, itemId } });
    if (!row) return;
    if (row.qty <= 1) await this.prisma.inventoryItem.delete({ where: { id: row.id } });
    else await this.prisma.inventoryItem.update({ where: { id: row.id }, data: { qty: { decrement: 1 } } });
  }

  private context(
    session: { method: FishingMethod; baitItemId: string | null; lureItemId: string | null; depthM: number | null },
    clock: { season: BiteContext["season"]; minutes: number; weather: BiteContext["weather"]; temperatureC: number; pressureHpa: number; windKmh: number; waterClarity: number },
    events: Array<{ modifiers: Prisma.JsonValue }>,
  ): BiteContext {
    return {
      method: session.method,
      bait: session.baitItemId ?? undefined,
      lure: session.lureItemId ?? undefined,
      depthM: session.depthM ?? 1.5,
      season: clock.season,
      timeOfDay: timeOfDay(clock.minutes),
      weather: clock.weather,
      temperatureC: clock.temperatureC,
      pressureHpa: clock.pressureHpa,
      windKmh: clock.windKmh,
      waterClarity: clock.waterClarity,
      eventMultiplier: events.reduce((m, e) => {
        const mod = e.modifiers as { multiplier?: number };
        return m * (mod.multiplier ?? 1);
      }, 1),
      skillBonus: 0.1,
      baitQuality: 0.7,
    };
  }

  private async equipped(userId: string, method: FishingMethod) {
    const all = await this.prisma.inventoryItem.findMany({
      where: { userId },
      include: { item: true },
    });
    const rows = all.filter((r) => r.equipped);
    const bySlot = Object.fromEntries(rows.filter((r) => r.slot).map((r) => [r.slot as string, r]));
    let rod = bySlot.rod;
    if (!rod) throw new BadRequestException("Соберите снасть: удилище, катушка, леска");
    if (!bySlot.reel || !bySlot.line) {
      throw new BadRequestException("Соберите снасть: удилище, катушка, леска");
    }
    const rodMethod = (rod.item.stats as { method?: string }).method;
    if (rodMethod && rodMethod !== method) {
      const alt = all.find((r) => r.item.kind === "ROD" && (r.item.stats as { method?: string }).method === method);
      if (!alt) throw new BadRequestException("Удилище не подходит для этого метода");
      rod = alt;
    }
    const bait =
      rows.find((r) => r.item.kind === "BAIT") ?? all.find((r) => r.item.kind === "BAIT");
    const lure =
      rows.find((r) => r.item.kind === "LURE") ?? all.find((r) => r.item.kind === "LURE");
    if (method === "SPINNING" && !lure) throw new BadRequestException("Нужна приманка");
    if (method !== "SPINNING" && !bait) throw new BadRequestException("Нужна наживка");
    return {
      rod: rod.itemId,
      reel: bySlot.reel.itemId,
      line: bySlot.line.itemId,
      bait: bait?.itemId ?? null,
      lure: lure?.itemId ?? null,
    };
  }

  private async requireActive(userId: string) {
    const session = await this.getActive(userId);
    if (!session) throw new BadRequestException("Нет активной сессии");
    return session;
  }
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function asStringArray(value: Prisma.JsonValue): string[] {
  return Array.isArray(value) ? value.filter((x): x is string => typeof x === "string") : [];
}

function eventBoost(speciesId: string, events: Array<{ modifiers: Prisma.JsonValue }>): number {
  let m = 1;
  for (const event of events) {
    const mod = event.modifiers as { speciesId?: string; multiplier?: number };
    if (mod.speciesId === speciesId) m *= mod.multiplier ?? 1;
  }
  return m;
}

function speciesMethods(baits: string[], lures: string[]): string[] {
  const methods: string[] = [];
  if (baits.length) methods.push("FLOAT", "BOTTOM", "FEEDER", "CARP");
  if (lures.length) methods.push("SPINNING", "TROLLING");
  return methods;
}
