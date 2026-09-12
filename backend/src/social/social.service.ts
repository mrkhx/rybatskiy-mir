import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import type { ChatChannel } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

const SPAM_WINDOW_MS = 2500;

@Injectable()
export class SocialService {
  private readonly lastMessage = new Map<string, number>();

  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async send(userId: string, channel: ChatChannel, roomId: string, body: string) {
    const text = body.trim().slice(0, 280);
    if (text.length < 1) throw new BadRequestException("Пустое сообщение");
    if (/(.)\1{7,}/.test(text)) throw new BadRequestException("Спам");
    const now = Date.now();
    const last = this.lastMessage.get(userId) ?? 0;
    if (now - last < SPAM_WINDOW_MS) throw new BadRequestException("Слишком часто");
    this.lastMessage.set(userId, now);
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (user?.mutedUntil && user.mutedUntil > new Date()) throw new BadRequestException("Мут");
    const filtered = text.replace(/хуй|пизд|ебан|fuck/gi, "***");
    return this.prisma.chatMessage.create({
      data: { channel, roomId, userId, body: filtered },
      include: { user: { select: { nickname: true } } },
    });
  }

  history(channel: ChatChannel, roomId: string) {
    return this.prisma.chatMessage.findMany({
      where: { channel, roomId },
      orderBy: { createdAt: "desc" },
      take: 40,
      include: { user: { select: { nickname: true } } },
    });
  }

  async createClub(userId: string, name: string, tag: string) {
    const cleanTag = tag.replace(/[^A-Za-zА-Яа-я0-9]/g, "").slice(0, 5).toUpperCase();
    if (cleanTag.length < 2) throw new BadRequestException("Тег клуба");
    const existing = await this.prisma.clubMember.findUnique({ where: { userId } });
    if (existing) throw new BadRequestException("Вы уже в клубе");
    return this.prisma.club.create({
      data: {
        name: name.trim().slice(0, 32),
        tag: cleanTag,
        members: { create: { userId, role: "OWNER" } },
      },
    });
  }

  clubs() {
    return this.prisma.club.findMany({ include: { members: true }, orderBy: { xp: "desc" }, take: 20 });
  }

  async myClub(userId: string) {
    return this.prisma.clubMember.findUnique({
      where: { userId },
      include: { club: { include: { members: { include: { user: { select: { nickname: true } } } } } } },
    });
  }
}
