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

  it("reports liveness without checking dependencies", () => {
    const service = new HealthService(
      { ping: async () => false } as never,
      { ping: async () => false } as never,
    );

    expect(service.live()).toEqual({ status: "ok", backend: "ok" });
  });

  it("marks readiness failed when a dependency is down", async () => {
    const service = new HealthService(
      { ping: async () => false } as never,
      { ping: async () => true } as never,
    );

    await expect(service.readiness()).resolves.toEqual({
      ready: false,
      body: {
        status: "degraded",
        backend: "ok",
        database: "error",
        redis: "ok",
      },
    });
  });
});
