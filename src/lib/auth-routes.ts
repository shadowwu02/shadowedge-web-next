export function getSafeAuthNext(value: string | null, fallback = "/workspace/video") {
  if (!value) return fallback;

  try {
    const decoded = decodeURIComponent(value);
    if (decoded.startsWith("/") && !decoded.startsWith("//")) return decoded;
  } catch {
    if (value.startsWith("/") && !value.startsWith("//")) return value;
  }

  return fallback;
}
