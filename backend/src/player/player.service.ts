import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { validateNick } from "../game/nick";

const STARTER = [
  { itemId: "rod-willow", qty: 1, equipped: true, slot: "rod" },
  { itemId: "rod-spin-light", qty: 1 },
  { itemId: "reel-basic", qty: 1, equipped: true, slot: "reel" },
  { itemId: "line-025", qty: 1, equipped: true, slot: "line" },
  { itemId: "hook-10", qty: 12, equipped: true, slot: "hook" },
  { itemId: "float-goose", qty: 1, equipped: true, slot: "float" },
  { itemId: "worm", qty: 16, equipped: true, slot: "bait" },
  { itemId: "spinner", qty: 1 },
  { itemId: "bread", qty: 6 },
  { itemId: "shovel", qty: 1 },
  { itemId: "bread-food", qty: 2 },
  { itemId: "water", qty: 2 },
];

export type PlayerProfile = {
  id: string;
  vkId: string;
  nickname: string;
  nicknameSet: boolean;
  createdAt: Date;
  character: {
    sex: string;
    faceType: string;
    ageArchetype: string;
    skinTone: string;
    hairStyle: string;
    hairColor: string;
    facialHair: string;
    hat: string;
    outfit: string;
  } | null;
  stats: {
    level: number;
    xp: number;
    coins: number;
    specialization: string;
    title: string;
    division: string;
    health: number;
    stamina: number;
    hunger: number;
    thirst: number;
    warmth: number;
    wetness: number;
    fatigue: number;
    keepnetCount: number;
    keepnetWeightG: number;
    keepnetCap: number;
    premiumUntil: Date | null;
  } | null;
  skills: Array<{ skill: string; level: number; xp: number }>;
};

@Injectable()
export class PlayerService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async getById(id: string): Promise<PlayerProfile> {
    await this.ensure(id);
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { character: true, stats: true, skills: true, premium: { orderBy: { endsAt: "desc" }, take: 1 } },
    });
    if (!user) throw new NotFoundException("Player not found");
    const prem = user.premium[0];
    return {
      id: user.id,
      vkId: user.vkId,
      nickname: user.nickname,
      nicknameSet: user.nicknameSet,
      createdAt: user.createdAt,
      character: user.character,
      stats: user.stats
        ? {
            level: user.stats.level,
            xp: user.stats.xp,
            coins: user.stats.coins,
            specialization: user.stats.specialization,
            title: user.stats.title,
            division: user.stats.division,
            health: user.stats.health,
            stamina: user.stats.stamina,
            hunger: user.stats.hunger,
            thirst: user.stats.thirst,
            warmth: user.stats.warmth,
            wetness: user.stats.wetness,
            fatigue: user.stats.fatigue,
            keepnetCount: user.stats.keepnetCount,
            keepnetWeightG: user.stats.keepnetWeightG,
            keepnetCap: user.stats.keepnetCap,
            premiumUntil: prem && prem.endsAt > new Date() ? prem.endsAt : null,
          }
        : null,
      skills: user.skills.map((s) => ({ skill: s.skill, level: s.level, xp: s.xp })),
    };
  }

  async claimNickname(userId: string, raw: string): Promise<PlayerProfile> {
    const parsed = validateNick(raw);
    if (!parsed.ok) throw new BadRequestException(parsed.reason);
    const taken = await this.prisma.user.findFirst({
      where: { nickname: parsed.nick, NOT: { id: userId } },
    });
    if (taken) throw new BadRequestException("Ник уже занят");
    await this.prisma.user.update({
      where: { id: userId },
      data: { nickname: parsed.nick, nicknameSet: true },
    });
    return this.getById(userId);
  }

  async saveCharacter(
    userId: string,
    body: {
      sex?: "MALE" | "FEMALE" | "OTHER";
      faceType?: string;
      ageArchetype?: string;
      skinTone?: string;
      hairStyle?: string;
      hairColor?: string;
      facialHair?: string;
      hat?: string;
      outfit?: string;
    },
  ): Promise<PlayerProfile> {
    await this.ensure(userId);
    await this.prisma.character.upsert({
      where: { userId },
      update: body,
      create: { userId, ...body },
    });
    return this.getById(userId);
  }

  async ensure(userId: string): Promise<void> {
    const stats = await this.prisma.playerStats.findUnique({ where: { userId } });
    if (stats) return;
    await this.prisma.$transaction(async (tx) => {
      await tx.playerStats.create({ data: { userId } });
      await tx.character.create({ data: { userId } });
      await tx.playerSkill.createMany({
        data: [
          { userId, skill: "FLOAT", level: 1, xp: 0 },
          { userId, skill: "SPINNING", level: 1, xp: 0 },
          { userId, skill: "HOOKING", level: 1, xp: 0 },
          { userId, skill: "FIGHTING", level: 1, xp: 0 },
          { userId, skill: "BAIT_HARVEST", level: 1, xp: 0 },
          { userId, skill: "COOKING", level: 1, xp: 0 },
          { userId, skill: "CAMP", level: 1, xp: 0 },
        ],
      });
      for (const row of STARTER) {
        await tx.inventoryItem.create({ data: { userId, ...row } });
      }
    });
  }
}
