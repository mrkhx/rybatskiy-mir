import {
  ForbiddenException,
  Inject,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { APP_ENV, type AppEnv } from "../config/env";
import { PrismaService } from "../prisma/prisma.service";
import type { AuthSession, AuthUser } from "./auth.types";
import type { DevSessionDto } from "./dto/dev-session.dto";
import { VK_AUTH_PROVIDER, type VkAuthProvider, type VkLaunchParams } from "./vk/vk-auth.types";

@Injectable()
export class AuthService {
  constructor(
    @Inject(APP_ENV) private readonly env: AppEnv,
    @Inject(VK_AUTH_PROVIDER) private readonly vkAuth: VkAuthProvider,
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async createDevSession(dto: DevSessionDto): Promise<AuthSession> {
    if (!this.env.allowDevAuth) {
      throw new ForbiddenException("Dev authentication is disabled");
    }

    const user = await this.upsertUser(dto.vkId, dto.nickname);
    return this.issueSession(user);
  }

  async createVkSession(params: VkLaunchParams): Promise<AuthSession> {
    if (!this.vkAuth.isConfigured()) {
      throw new ServiceUnavailableException(
        "VK authorization is not configured. See docs/vk-auth.md",
      );
    }

    const identity = await this.vkAuth.verifyLaunchParams(params);
    const user = await this.upsertUser(identity.vkId, identity.nickname);
    return this.issueSession(user);
  }

  getVkStatus(): { configured: boolean } {
    return { configured: this.vkAuth.isConfigured() };
  }

  private async upsertUser(vkId: string, nickname: string): Promise<AuthUser> {
    const user = await this.prisma.user.upsert({
      where: { vkId },
      update: { nickname },
      create: { vkId, nickname },
    });

    return { id: user.id, vkId: user.vkId, nickname: user.nickname };
  }

  private async issueSession(user: AuthUser): Promise<AuthSession> {
    const accessToken = await this.jwt.signAsync(user);
    return { accessToken, user };
  }
}
