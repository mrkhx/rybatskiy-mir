import { ForbiddenException, ServiceUnavailableException } from "@nestjs/common";
import { AuthService } from "./auth.service";
import type { AppEnv } from "../config/env";

function env(overrides: Partial<AppEnv> = {}): AppEnv {
  return {
    nodeEnv: "development",
    isProduction: false,
    port: 3000,
    databaseUrl: "postgresql://localhost/test",
    redisUrl: "redis://localhost:6379",
    jwtSecret: "test-secret",
    jwtExpiresIn: "1h",
    frontendOrigin: "http://localhost:5173",
    adminOrigin: "http://localhost:5174",
    allowDevAuth: true,
    vkAppId: "",
    vkAppSecret: "",
    vkApiVersion: "5.199",
    ...overrides,
  };
}

describe("AuthService", () => {
  it("rejects dev auth when it is disabled", async () => {
    const service = new AuthService(
      env({ allowDevAuth: false }),
      { isConfigured: () => false, verifyLaunchParams: async () => ({ vkId: "1", nickname: "x" }) },
      {} as never,
      {} as never,
    );

    await expect(
      service.createDevSession({ vkId: "1", nickname: "pike" }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("rejects VK session until the provider is configured", async () => {
    const service = new AuthService(
      env(),
      { isConfigured: () => false, verifyLaunchParams: async () => ({ vkId: "1", nickname: "x" }) },
      {} as never,
      {} as never,
    );

    await expect(service.createVkSession({})).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
