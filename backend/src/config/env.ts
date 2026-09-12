export type AppEnv = {
  nodeEnv: string;
  isProduction: boolean;
  port: number;
  databaseUrl: string;
  redisUrl: string;
  jwtSecret: string;
  jwtExpiresIn: string;
  frontendOrigin: string;
  adminOrigin: string;
  allowDevAuth: boolean;
  vkAppId: string;
  vkAppSecret: string;
  vkApiVersion: string;
};

function read(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable ${name}`);
  }
  return value;
}

export function loadEnv(): AppEnv {
  const nodeEnv = process.env.NODE_ENV ?? "development";
  const isProduction = nodeEnv === "production";

  if (isProduction && process.env.ALLOW_DEV_AUTH === "true") {
    throw new Error("ALLOW_DEV_AUTH=true is forbidden when NODE_ENV=production");
  }

  const jwtSecret = read(
    "JWT_SECRET",
    isProduction ? undefined : "change-me-local-dev-only",
  );

  if (isProduction && (jwtSecret === "change-me-local-dev-only" || jwtSecret.length < 32)) {
    throw new Error("JWT_SECRET must be a strong unique value in production");
  }

  return {
    nodeEnv,
    isProduction,
    port: Number(process.env.PORT ?? 3000),
    databaseUrl: read("DATABASE_URL"),
    redisUrl: read("REDIS_URL"),
    jwtSecret,
    jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "7d",
    frontendOrigin: process.env.FRONTEND_ORIGIN ?? "http://localhost:5173",
    adminOrigin: process.env.ADMIN_ORIGIN ?? "http://localhost:5174",
    allowDevAuth: process.env.ALLOW_DEV_AUTH === "true" && !isProduction,
    vkAppId: process.env.VK_APP_ID ?? "",
    vkAppSecret: process.env.VK_APP_SECRET ?? "",
    vkApiVersion: process.env.VK_API_VERSION ?? "5.199",
  };
}

export const APP_ENV = "APP_ENV";
