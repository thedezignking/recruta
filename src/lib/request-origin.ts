/** Compare the browser origin to the actual HTTP host, not Next's internal hostname. */
export function isSameOriginRequest(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    const target = new URL(request.url);
    const host = request.headers.get("host");
    if (host) target.host = host;
    return origin === target.origin;
  } catch {
    return false;
  }
}
