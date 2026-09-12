import { redact } from "./redact";

describe("redact", () => {
  it("hides secret-like keys", () => {
    expect(
      redact({
        nickname: "pike",
        JWT_SECRET: "super-secret-value",
        authorization: "Bearer abc",
        nested: { database_url: "postgresql://user:pass@localhost/db" },
      }),
    ).toEqual({
      nickname: "pike",
      JWT_SECRET: "[redacted]",
      authorization: "[redacted]",
      nested: { database_url: "[redacted]" },
    });
  });
});
