"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api, setToken, token, type Session } from "../api/client";
import {
  eventFromSession,
  type PendingAction,
  type ServerEventName,
} from "./serverFishingVisualAdapter";

const SPOT_ID = "old-bridge";
const METHOD = "FLOAT";
const CAST_BODY = { force: 0.6, direction: 0.2, depthM: 1.4, retrieve: "even" };
const TICK_BODY = { reel: 0.58, rodPressure: 0.5, rodDir: 0, drag: 0.42 };
const REEL_TICK = { reel: 0.72, rodPressure: 0.55, rodDir: 0, drag: 0.45 };
const HOOK_BODY = { timingMs: 80 };

async function ensureAuth(): Promise<void> {
  if (token()) return;
  const auth = await api<{ accessToken: string }>("/auth/dev/session", {
    method: "POST",
    body: JSON.stringify({ vkId: "1", nickname: "temp" }),
  });
  setToken(auth.accessToken);
}

export function useServerFishing(enabled: boolean) {
  const [session, setSession] = useState<Session | null>(null);
  const [pending, setPending] = useState<PendingAction>("none");
  const [error, setError] = useState<string | null>(null);
  const [lastEvent, setLastEvent] = useState<ServerEventName>("—");
  const [speciesNames, setSpeciesNames] = useState<Record<string, string>>({});
  const [connected, setConnected] = useState(false);

  const exclusive = useRef(false);
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;
  const sessionRef = useRef(session);
  sessionRef.current = session;
  const tickBusy = useRef(false);

  const apply = useCallback((s: Session, event?: ServerEventName) => {
    setSession(s);
    setLastEvent(event ?? eventFromSession(sessionRef.current, s));
    setError(null);
    return s;
  }, []);

  const fail = useCallback((e: unknown) => {
    setError(e instanceof Error ? e.message : "Ошибка сервера");
    return null;
  }, []);

  const exclusiveRun = useCallback(
    async <T,>(action: PendingAction, fn: () => Promise<T>): Promise<T | null> => {
      if (!enabledRef.current) return null;
      if (exclusive.current) return null;
      exclusive.current = true;
      setPending(action);
      try {
        return await fn();
      } catch (e) {
        return fail(e);
      } finally {
        exclusive.current = false;
        setPending("none");
      }
    },
    [fail],
  );

  const connect = useCallback(() => {
    return exclusiveRun("start", async () => {
      try {
        await ensureAuth();
      } catch {
        setToken(null);
        await ensureAuth();
      }
      let s: Session | null = null;
      try {
        s = await api<Session | null>("/fishing/session");
      } catch {
        setToken(null);
        await ensureAuth();
        s = await api<Session | null>("/fishing/session");
      }
      if (!s || s.state === "LOST" || s.state === "BROKEN") {
        s = await api<Session>("/fishing/start", {
          method: "POST",
          body: JSON.stringify({ spotId: SPOT_ID, method: METHOD }),
        });
      }
      setConnected(true);
      return apply(s, s.state === "READY" ? "SESSION_READY" : eventFromSession(null, s));
    });
  }, [apply, exclusiveRun]);

  const cast = useCallback(() => {
    return exclusiveRun("cast", async () => {
      const s = await api<Session>("/fishing/cast", {
        method: "POST",
        body: JSON.stringify(CAST_BODY),
      });
      return apply(s, "CAST_CONFIRMED");
    });
  }, [apply, exclusiveRun]);

  const peekBite = useCallback(async () => {
    if (!enabledRef.current || exclusive.current) return null;
    try {
      const s = await api<Session>("/fishing/bite", { method: "POST", body: "{}" });
      if (s.state === "BITE" && sessionRef.current?.state !== "BITE") {
        return apply(s, "BITE");
      }
      setSession(s);
      return s;
    } catch (e) {
      return fail(e);
    }
  }, [apply, fail]);

  const hook = useCallback(() => {
    return exclusiveRun("hook", async () => {
      const s = await api<Session>("/fishing/hook", {
        method: "POST",
        body: JSON.stringify(HOOK_BODY),
      });
      if (s.state === "HOOKED" || s.state === "FIGHTING") return apply(s, "HOOK_OK");
      if (s.state === "LOST" || s.state === "BROKEN") return apply(s, "HOOK_FAIL");
      return apply(s);
    });
  }, [apply, exclusiveRun]);

  const tick = useCallback(
    async (reel = false) => {
      if (!enabledRef.current) return null;
      if (tickBusy.current) return null;
      tickBusy.current = true;
      try {
        const s = await api<Session>("/fishing/tick", {
          method: "POST",
          body: JSON.stringify(reel ? REEL_TICK : TICK_BODY),
        });
        if (s.state === "LANDED") return apply(s, "LANDED");
        if (s.state === "LOST") return apply(s, "LOST");
        if (s.state === "BROKEN") return apply(s, "BROKEN");
        return apply(s, "FIGHT_TICK");
      } catch (e) {
        const msg = e instanceof Error ? e.message : "";
        if (msg === "Нет вываживания") return sessionRef.current;
        return fail(e);
      } finally {
        tickBusy.current = false;
      }
    },
    [apply, fail],
  );

  const decide = useCallback(
    (keep: boolean) => {
      return exclusiveRun("decide", async () => {
        const s = await api<Session>("/fishing/decide", {
          method: "POST",
          body: JSON.stringify({ keep }),
        });
        return apply(s, keep ? "KEEP_OK" : "RELEASE_OK");
      });
    },
    [apply, exclusiveRun],
  );

  const recover = useCallback(() => {
    return exclusiveRun("start", async () => {
      const s = await api<Session>("/fishing/start", {
        method: "POST",
        body: JSON.stringify({ spotId: SPOT_ID, method: METHOD }),
      });
      return apply(s, "SESSION_READY");
    });
  }, [apply, exclusiveRun]);

  useEffect(() => {
    if (!enabled) {
      setConnected(false);
      return;
    }
    void api<Array<{ id: string; name: string }>>("/world/species")
      .then((rows) => setSpeciesNames(Object.fromEntries(rows.map((r) => [r.id, r.name]))))
      .catch(() => undefined);
    void connect();
  }, [enabled, connect]);

  return {
    session,
    pending,
    error,
    lastEvent,
    speciesNames,
    connected,
    connect,
    cast,
    peekBite,
    hook,
    tick,
    decide,
    recover,
  };
}
