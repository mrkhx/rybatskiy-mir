import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";

describe("Admin App", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          status: "ok",
          backend: "ok",
          database: "ok",
          redis: "ok",
        }),
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders admin title", () => {
    render(<App />);
    expect(screen.getByRole("heading", { name: "Рыбацкий Мир — Admin" })).toBeInTheDocument();
  });
});
