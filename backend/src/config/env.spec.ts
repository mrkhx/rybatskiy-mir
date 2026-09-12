import { loadEnv } from "./env";

describe("loadEnv", () => {
  const keys = [
    "NODE_ENV",
    "DATABASE_URL",
    "REDIS_URL",
    "JWT_SECRET",
    "ALLOW_DEV_AUTH",
  ] as const;
  const original: Partial<Record<(typeof keys)[number], string | undefined>> = {};

  beforeAll(() => {
    for (const key of keys) {
      original[key] = process.env[key];
    }
  });

  afterEach(() => {
    for (const key of keys) {
      const value = original[key];
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  });

  function withBase(overrides: NodeJS.ProcessEnv = {}): void {
    process.env.NODE_ENV = "development";
    process.env.DATABASE_URL =
      "postgresql://rybatskiy:rybatskiy@localhost:5432/rybatskiy_mir";
    process.env.REDIS_URL = "redis://localhost:6379";
    process.env.JWT_SECRET = "change-me-local-dev-only";
    process.env.ALLOW_DEV_AUTH = "true";
    Object.assign(process.env, overrides);
  }

  it("enables dev auth only outside production", () => {
    withBase();
    expect(loadEnv().allowDevAuth).toBe(true);
  });

  it("refuses to start production with ALLOW_DEV_AUTH=true", () => {
    withBase({
      NODE_ENV: "production",
      ALLOW_DEV_AUTH: "true",
      JWT_SECRET: "a-sufficiently-long-production-jwt-secret",
    });
    expect(() => loadEnv()).toThrow(/ALLOW_DEV_AUTH=true is forbidden/);
  });

  it("refuses a weak JWT secret in production", () => {
    withBase({
      NODE_ENV: "production",
      ALLOW_DEV_AUTH: "false",
      JWT_SECRET: "short",
    });
    expect(() => loadEnv()).toThrow(/JWT_SECRET must be a strong unique value/);
  });
});
