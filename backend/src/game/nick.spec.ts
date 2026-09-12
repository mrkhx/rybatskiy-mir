import { placeholderNick, validateNick } from "./nick";

describe("nicknames", () => {
  it("accepts a normal nick and rejects slurs / too short", () => {
    expect(validateNick("Лесной Окунь")).toEqual({ ok: true, nick: "Лесной Окунь" });
    expect(validateNick("ab").ok).toBe(false);
    expect(validateNick("admin").ok).toBe(false);
    expect(validateNick("хуйня").ok).toBe(false);
  });

  it("does not use VK id as the display nick", () => {
    expect(placeholderNick("vk-12345678")).toBe("Рыбак-345678");
  });
});
