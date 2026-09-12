const SENSITIVE_KEY =
  /pass(word)?|secret|token|authorization|cookie|database_url|api[_-]?key|private[_-]?key|jwt/i;

export function redact(value: unknown, key?: string): unknown {
  if (key && SENSITIVE_KEY.test(key)) {
    return "[redacted]";
  }

  if (Array.isArray(value)) {
    return value.map((item) => redact(item, key));
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).map(
      ([entryKey, entryValue]) => [entryKey, redact(entryValue, entryKey)],
    );
    return Object.fromEntries(entries);
  }

  return value;
}
