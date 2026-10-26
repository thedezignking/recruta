export function safeAuthNext(
  value: string | null | undefined,
  fallback = "/auth/continue",
) {
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    /[\\\u0000-\u001f]/.test(value)
  )
    return fallback;
  try {
    const url = new URL(value, "https://recruta.invalid");
    return url.origin === "https://recruta.invalid"
      ? `${url.pathname}${url.search}${url.hash}`
      : fallback;
  } catch {
    return fallback;
  }
}
