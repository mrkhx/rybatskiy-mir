import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

export type PlayerProfile = {
  id: string;
  vkId: string;
  nickname: string;
  createdAt: Date;
};

@Injectable()
export class PlayerService {
  constructor(private readonly prisma: PrismaService) {}

  async getById(id: string): Promise<PlayerProfile> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException("Player not found");
    }

    return {
      id: user.id,
      vkId: user.vkId,
      nickname: user.nickname,
      createdAt: user.createdAt,
    };
  }
}
