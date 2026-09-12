import "reflect-metadata";
import { Test } from "@nestjs/testing";
import { HealthController } from "./health.controller";
import { HealthService } from "./health.service";

describe("HealthController", () => {
  it("uses injected HealthService", async () => {
    const module = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthService,
          useValue: {
            check: async () => ({
              status: "ok",
              backend: "ok",
              database: "ok",
              redis: "ok",
            }),
          },
        },
      ],
    }).compile();

    const controller = module.get(HealthController);
    await expect(controller.getHealth()).resolves.toEqual({
      status: "ok",
      backend: "ok",
      database: "ok",
      redis: "ok",
    });
  });
});
