import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { scheduleVisualTransition } from "./visibleTransition";

const visibility = (hidden: boolean) => {
  vi.spyOn(document, "hidden", "get").mockReturnValue(hidden);
  document.dispatchEvent(new Event("visibilitychange"));
};
beforeEach(() => { vi.useFakeTimers(); visibility(false); });
afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

it("preserves the remaining PRE-CAST time during a long hidden interval", () => {
  const callback = vi.fn();
  scheduleVisualTransition(callback, 350);
  vi.advanceTimersByTime(200);
  visibility(true);
  vi.advanceTimersByTime(60000);
  expect(callback).not.toHaveBeenCalled();
  visibility(false);
  vi.advanceTimersByTime(149);
  expect(callback).not.toHaveBeenCalled();
  vi.advanceTimersByTime(1);
  expect(callback).toHaveBeenCalledTimes(1);
  visibility(true); visibility(false);
  vi.advanceTimersByTime(1000);
  expect(callback).toHaveBeenCalledTimes(1);
});

it("cleans up while hidden and never fires after unmount", () => {
  visibility(true);
  const callback = vi.fn();
  const cancel = scheduleVisualTransition(callback, 350);
  expect(vi.getTimerCount()).toBe(0);
  cancel();
  visibility(false);
  vi.advanceTimersByTime(1000);
  expect(callback).not.toHaveBeenCalled();
  expect(vi.getTimerCount()).toBe(0);
});
