import { describe, expect, it, vi } from "vitest";
import { FishingRequestQueue } from "./useFishingRequests";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

describe("fishing request ordering", () => {
  it("finishes an in-flight bite poll before sending recast, and rejects overlapping background polls", async () => {
    const queue = new FishingRequestQueue();
    const bite = deferred<string>();
    const events: string[] = [];
    const poll = queue.run("poll:bite", async () => { events.push("bite"); return bite.promise; }, true);
    await Promise.resolve();
    const cast = queue.run("action:cast", async () => { events.push("cast"); return "WAITING_BITE"; });
    expect(await queue.run("poll:tick", async () => "unexpected", true)).toBeNull();
    expect(events).toEqual(["bite"]);
    bite.resolve("BITE");
    expect(await poll).toBe("BITE");
    expect(await cast).toBe("WAITING_BITE");
    expect(events).toEqual(["bite", "cast"]);
  });

  it("deduplicates repeated KEEP/RELEASE requests while a decision is pending", async () => {
    const queue = new FishingRequestQueue();
    const decision = deferred<string>();
    const keep = queue.run("action:decide", () => decision.promise);
    const release = vi.fn(async () => "READY");
    expect(await queue.run("action:decide", release)).toBeNull();
    expect(release).not.toHaveBeenCalled();
    decision.resolve("READY");
    expect(await keep).toBe("READY");
    expect(await queue.run("action:decide", release)).toBe("READY");
  });

  it("continues accepting commands after a failed request", async () => {
    const queue = new FishingRequestQueue();
    const failed = queue.run("action:hook", async () => { throw new Error("offline"); });
    const recovery = queue.run("action:start", async () => "READY");
    await expect(failed).rejects.toThrow("offline");
    expect(await recovery).toBe("READY");
    expect(await queue.run("poll:bite", async () => "WAITING_BITE", true)).toBe("WAITING_BITE");
  });
});
