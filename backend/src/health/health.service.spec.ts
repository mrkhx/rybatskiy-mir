import { HealthService } from "./health.service";

describe("HealthService", () => {
  it("returns ok when database and redis respond", async () => {
    const service = new HealthService(
      { ping: async () => true } as never,
      { ping: async () => true } as never,
    );

    await expect(service.check()).resolves.toEqual({
      status: "ok",
      backend: "ok",
      database: "ok",
      redis: "ok",
    });
  });

  it("returns degraded when a dependency is down", async () => {
    const service = new HealthService(
      { ping: async () => true } as never,
      { ping: async () => false } as never,
    );

    await expect(service.check()).resolves.toEqual({
      status: "degraded",
      backend: "ok",
      database: "ok",
      redis: "error",
    });
  });
});
