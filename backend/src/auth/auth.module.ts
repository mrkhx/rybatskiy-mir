import { Module } from "@nestjs/common";
import { JwtModule, type JwtModuleOptions } from "@nestjs/jwt";
import { APP_ENV, type AppEnv } from "../config/env";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { UnconfiguredVkAuthProvider } from "./vk/unconfigured-vk-auth.provider";
import { VK_AUTH_PROVIDER } from "./vk/vk-auth.types";

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [APP_ENV],
      useFactory: (env: AppEnv): JwtModuleOptions => ({
        secret: env.jwtSecret,
        signOptions: {
          expiresIn: env.jwtExpiresIn as JwtModuleOptions["signOptions"] extends
            | { expiresIn?: infer T }
            | undefined
            ? T
            : never,
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtAuthGuard,
    {
      provide: VK_AUTH_PROVIDER,
      useClass: UnconfiguredVkAuthProvider,
    },
  ],
  exports: [AuthService, JwtAuthGuard, JwtModule],
})
export class AuthModule {}
