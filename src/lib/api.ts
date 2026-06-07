import { ApiError, type ApiEnvelope, type ApiRequestOptions } from "@/types/api";
import { getStoredAuthToken } from "@/lib/auth";

const fallbackApiBaseUrl = "https://api.shadowedgeai.com";

export function getApiBaseUrl() {
  const value = process.env.NEXT_PUBLIC_API_BASE_URL || fallbackApiBaseUrl;
  return value.replace(/\/$/, "");
}

function resolveUrl(path: string) {
  if (/^https?:\/\//i.test(path)) return path;
  return `${getApiBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}) {
  const headers = new Headers(options.headers);
  const token = options.token || (typeof window !== "undefined" ? getStoredAuthToken() : "");

  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const hasBody = options.body !== undefined && options.body !== null;
  if (hasBody && !(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(resolveUrl(path), {
    ...options,
    headers,
    cache: options.cache || "no-store",
  });

  const text = await response.text();
  let payload: ApiEnvelope<T> | null = null;

  try {
    payload = text ? (JSON.parse(text) as ApiEnvelope<T>) : null;
  } catch {
    payload = { ok: false, message: text };
  }

  if (!response.ok || payload?.ok === false) {
    throw new ApiError(payload?.message || payload?.error || "ShadowEdge API request failed", {
      status: response.status,
      code: payload?.code,
      payload,
    });
  }

  return payload as ApiEnvelope<T>;
}
