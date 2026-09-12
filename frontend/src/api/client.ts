const TOKEN_KEY = "rm_token";

export function token(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(value: string | null): void {
  if (value) localStorage.setItem(TOKEN_KEY, value);
  else localStorage.removeItem(TOKEN_KEY);
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  const t = token();
  if (t) headers.set("Authorization", `Bearer ${t}`);
  const res = await fetch(path, { ...init, headers });
  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const body = (await res.json()) as { message?: string | string[] };
      if (Array.isArray(body.message)) message = body.message.join(", ");
      else if (body.message) message = body.message;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export type Session = {
  id: string;
  state: string;
  spotId: string;
  method: string;
  speciesId: string | null;
  weightG: number | null;
  lengthCm: number | null;
  tier: string | null;
  tension: number;
  fishStamina: number;
  lineIntegrity: number;
  fightProgress: number;
  biteAt: string | null;
  loseReason: string | null;
  depthM: number | null;
};

export type Player = {
  id: string;
  nickname: string;
  nicknameSet: boolean;
  character: Record<string, string> | null;
  stats: {
    level: number;
    xp: number;
    coins: number;
    title: string;
    health: number;
    stamina: number;
    hunger: number;
    thirst: number;
    warmth: number;
    keepnetCount: number;
    keepnetWeightG: number;
    premiumUntil: string | null;
  } | null;
};
