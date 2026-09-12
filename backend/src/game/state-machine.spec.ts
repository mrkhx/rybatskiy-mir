import { assertTransition, canTransition, isTerminal } from "./state-machine";

describe("fishing state machine", () => {
  it("allows the happy path", () => {
    const path = ["IDLE", "READY", "CAST", "WAITING_BITE", "BITE", "HOOKED", "FIGHTING", "LANDED"] as const;
    for (let i = 0; i < path.length - 1; i += 1) {
      expect(canTransition(path[i]!, path[i + 1]!)).toBe(true);
    }
  });

  it("forbids hooking without a bite and double landing", () => {
    expect(canTransition("WAITING_BITE", "HOOKED")).toBe(false);
    expect(canTransition("READY", "FIGHTING")).toBe(false);
    expect(canTransition("LANDED", "LANDED")).toBe(false);
    expect(() => assertTransition("IDLE", "BITE")).toThrow(/Illegal/);
  });

  it("marks terminal states", () => {
    expect(isTerminal("LANDED")).toBe(true);
    expect(isTerminal("BROKEN")).toBe(true);
    expect(isTerminal("FIGHTING")).toBe(false);
  });
});
