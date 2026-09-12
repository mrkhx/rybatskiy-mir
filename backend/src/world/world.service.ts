import { Inject, Injectable } from "@nestjs/common";
import { advanceClock, timeOfDay, type ClockState } from "../game/clock";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class WorldService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async getClock() {
    const row = await this.prisma.worldClock.upsert({
      where: { id: "global" },
      update: {},
      create: { id: "global" },
    });
    const last = row.updatedAt.getTime();
    const elapsed = Math.max(1, Math.round((Date.now() - last) / 1000));
    if (elapsed < 20) return row;
    const next = advanceClock(row as ClockState, elapsed);
    return this.prisma.worldClock.update({ where: { id: "global" }, data: next });
  }

  async snapshot() {
    const clock = await this.getClock();
    const waterbody = await this.prisma.waterbody.findUnique({
      where: { id: "forest-lake" },
      include: {
        spots: { orderBy: { name: "asc" } },
        fauna: { include: { fauna: true } },
        npcs: true,
      },
    });
    const events = await this.activeEvents("forest-lake");
    return {
      clock: { ...clock, timeOfDay: timeOfDay(clock.minutes) },
      waterbody,
      events,
    };
  }

  async activeEvents(waterbodyId: string) {
    const now = new Date();
    return this.prisma.worldEvent.findMany({
      where: {
        active: true,
        startsAt: { lte: now },
        endsAt: { gte: now },
        OR: [{ waterbodyId }, { waterbodyId: null }],
      },
    });
  }

  async listSpecies() {
    return this.prisma.fishSpecies.findMany({ orderBy: { name: "asc" } });
  }
}
