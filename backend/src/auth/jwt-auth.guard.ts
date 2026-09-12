import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { Request } from "express";
import type { AuthUser } from "./auth.types";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    const header = request.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      throw new UnauthorizedException("Missing bearer token");
    }

    try {
      const payload = await this.jwt.verifyAsync<AuthUser>(header.slice(7));
      request.user = {
        id: payload.id,
        vkId: payload.vkId,
        nickname: payload.nickname,
      };
      return true;
    } catch {
      throw new UnauthorizedException("Invalid token");
    }
  }
}
