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
            live: () => ({ status: "ok", backend: "ok" }),
            readiness: async () => ({
              ready: true,
              body: {
                status: "ok",
                backend: "ok",
                database: "ok",
                redis: "ok",
              },
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
    expect(controller.getLive()).toEqual({ status: "ok", backend: "ok" });
  });

  it("sets 503 when readiness fails", async () => {
    const module = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthService,
          useValue: {
            readiness: async () => ({
              ready: false,
              body: {
                status: "degraded",
                backend: "ok",
                database: "error",
                redis: "ok",
              },
            }),
          },
        },
      ],
    }).compile();

    const controller = module.get(HealthController);
    const res = { status: jest.fn() };
    const body = await controller.getReady(res as never);
    expect(res.status).toHaveBeenCalledWith(503);
    expect(body.status).toBe("degraded");
  });
});
