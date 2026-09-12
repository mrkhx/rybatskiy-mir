export type HealthPayload = {
  status: "ok" | "degraded";
  backend: "ok" | "error";
  database: "ok" | "error";
  redis: "ok" | "error";
};

const apiBase = (import.meta.env.VITE_ADMIN_API_URL ?? "").replace(/\/$/, "");

export async function fetchHealth(signal?: AbortSignal): Promise<HealthPayload> {
  const response = await fetch(`${apiBase}/health`, { signal });
  if (!response.ok) {
    throw new Error(`Health request failed: ${response.status}`);
  }
  return (await response.json()) as HealthPayload;
}
