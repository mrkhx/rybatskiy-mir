import { useCallback, useEffect, useRef } from "react";
import { api, type Session } from "./client";

/** One ordered stream of session mutations. Polls never queue behind user actions. */
export class FishingRequestQueue {
  private tail: Promise<void> = Promise.resolve();
  private pending = new Set<string>();

  run<T>(key: string, request: () => Promise<T>, background = false): Promise<T | null> {
    if (this.pending.has(key) || (background && this.pending.size > 0)) return Promise.resolve(null);
    this.pending.add(key);
    const result = this.tail.then(request);
    const settled = result.finally(() => this.pending.delete(key));
    this.tail = settled.then(() => undefined, () => undefined);
    return settled;
  }
}

export function useFishingRequests() {
  const queue = useRef(new FishingRequestQueue());
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  return useCallback((path: string, init?: RequestInit, background = false) => queue.current.run(
    `${background ? "poll" : "action"}:${path}`,
    async () => {
      if (!mounted.current) return null;
      const session = await api<Session | null>(path, init);
      return mounted.current ? session : null;
    }, background,
  ), []);
}
