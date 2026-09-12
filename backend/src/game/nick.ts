const BLOCKED = [
  "admin",
  "administrator",
  "moderator",
  "модер",
  "админ",
  "хуй",
  "пизд",
  "ебан",
  "сука",
  "бляд",
  "fuck",
  "shit",
  "nazi",
  "hitler",
];

export function normalizeNick(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

export function validateNick(raw: string): { ok: true; nick: string } | { ok: false; reason: string } {
  const nick = normalizeNick(raw);
  if (nick.length < 3 || nick.length > 20) {
    return { ok: false, reason: "Ник должен быть от 3 до 20 символов" };
  }
  if (!/^[\p{L}\p{N} _.-]+$/u.test(nick)) {
    return { ok: false, reason: "Допустимы буквы, цифры, пробел, _ . -" };
  }
  const lowered = nick.toLowerCase();
  if (BLOCKED.some((word) => lowered.includes(word))) {
    return { ok: false, reason: "Этот ник нельзя использовать" };
  }
  return { ok: true, nick };
}

export function placeholderNick(vkId: string): string {
  const suffix = vkId.replace(/\W/g, "").slice(-6).padStart(6, "0");
  return `Рыбак-${suffix}`;
}
