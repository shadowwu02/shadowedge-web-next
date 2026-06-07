import { ApiError, type ApiEnvelope, type ApiRequestOptions } from "@/types/api";
import { getStoredAuthToken, getStoredRefreshToken, saveAuthSession } from "@/lib/auth";

const fallbackApiBaseUrl = "https://api.shadowedgeai.com";

export function getApiBaseUrl() {
  const value = process.env.NEXT_PUBLIC_API_BASE_URL || fallbackApiBaseUrl;
  return value.replace(/\/$/, "");
}

function resolveUrl(path: string) {
  if (/^https?:\/\//i.test(path)) return path;
  return `${getApiBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}

function payloadText(payload: ApiEnvelope<unknown> | null) {
  return String(payload?.message || payload?.error || payload?.code || "").toLowerCase();
}

export function normalizeApiError(status: number, payload: ApiEnvelope<unknown> | null) {
  const text = payloadText(payload);

  if (status === 401) {
    return new ApiError("Sign in required.", {
      status,
      code: payload?.code,
      payload,
      kind: "auth",
    });
  }

  if (status === 403 || text.includes("insufficient") || text.includes("not enough credit") || text.includes("credits")) {
    return new ApiError(text.includes("admin") ? "Contact administrator." : "Not enough credits.", {
      status,
      code: payload?.code,
      payload,
      kind: "credits",
    });
  }

  return new ApiError(payload?.message || payload?.error || "ShadowEdge API request failed", {
    status,
    code: payload?.code,
    payload,
    kind: status >= 500 ? "server" : "unknown",
  });
}

async function readJsonEnvelope<T>(response: Response) {
  const text = await response.text();
  let payload: ApiEnvelope<T> | null = null;

  try {
    payload = text ? (JSON.parse(text) as ApiEnvelope<T>) : null;
  } catch {
    payload = { ok: false, message: text };
  }

  return payload;
}

async function refreshStoredAuthToken() {
  const refreshToken = getStoredRefreshToken();
  if (!refreshToken) return "";

  const response = await fetch(resolveUrl("/api/auth/refresh"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      refresh_token: refreshToken,
    }),
    cache: "no-store",
  });

  const payload = await readJsonEnvelope<{
    session?: {
      access_token?: string;
      refresh_token?: string;
      expires_at?: number;
      expires_in?: number;
      token_type?: string;
    };
    user?: { email?: string; user_metadata?: { name?: string; full_name?: string } };
  }>(response);

  const session = payload?.data?.session;
  if (!response.ok || payload?.ok === false || !session?.access_token) return "";

  saveAuthSession(session, payload?.data?.user);
  return session.access_token;
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

  const requestUrl = resolveUrl(path);
  const requestInit: RequestInit = {
      ...options,
      headers,
      cache: options.cache || "no-store",
    };

  let response: Response;
  try {
    response = await fetch(requestUrl, requestInit);
  } catch (error) {
    throw new ApiError(error instanceof Error ? error.message : "Network request failed.", {
      kind: "network",
    });
  }

  let payload = await readJsonEnvelope<T>(response);

  if (
    response.status === 401 &&
    !options.token &&
    typeof window !== "undefined" &&
    !path.includes("/api/auth/login") &&
    !path.includes("/api/auth/refresh")
  ) {
    const refreshedToken = await refreshStoredAuthToken().catch(() => "");
    if (refreshedToken) {
      const retryHeaders = new Headers(headers);
      retryHeaders.set("Authorization", `Bearer ${refreshedToken}`);

      try {
        response = await fetch(requestUrl, {
          ...requestInit,
          headers: retryHeaders,
        });
        payload = await readJsonEnvelope<T>(response);
      } catch (error) {
        throw new ApiError(error instanceof Error ? error.message : "Network request failed.", {
          kind: "network",
        });
      }
    }
  }

  if (!response.ok || payload?.ok === false) {
    throw normalizeApiError(response.status, payload);
  }

  return payload as ApiEnvelope<T>;
}
