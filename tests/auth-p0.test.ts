import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest, getApiBaseUrl } from "@/lib/api";
import { isAuthUnavailableError, signInWithPassword } from "@/lib/auth-api";
import { ApiError } from "@/types/api";
import {
  AUTH_PROFILE_KEY,
  AUTH_REFRESH_TOKEN_KEY,
  AUTH_TOKEN_KEY,
  SUPABASE_STORAGE_KEY,
  clearAuthSession,
  getCachedAuthSessionState,
  markAuthSessionVerified,
  saveAuthSession,
  saveCachedProfile,
  isVerifiedAuthSession,
} from "@/lib/auth";

class MemoryStorage implements Storage {
  private values = new Map<string, string>();

  get length() {
    return this.values.size;
  }

  clear() {
    this.values.clear();
  }

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  key(index: number) {
    return [...this.values.keys()][index] ?? null;
  }

  removeItem(key: string) {
    this.values.delete(key);
  }

  setItem(key: string, value: string) {
    this.values.set(key, String(value));
  }
}

const authStorageKeys = [
  AUTH_TOKEN_KEY,
  AUTH_REFRESH_TOKEN_KEY,
  AUTH_PROFILE_KEY,
  SUPABASE_STORAGE_KEY,
  "shadowedge_access_token",
  "shadowedge_token",
  "se_auth_token",
  "se_access_token",
  "access_token",
  "refresh_token",
  "se_refresh_token",
];

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

beforeEach(() => {
  vi.unstubAllEnvs();
  const localStorage = new MemoryStorage();
  vi.stubGlobal("window", {
    localStorage,
    dispatchEvent: vi.fn(),
  });
  vi.stubGlobal("CustomEvent", class CustomEvent {
    constructor(public type: string) {}
  });
  vi.restoreAllMocks();
});

describe("P0 Auth session behavior", () => {
  it("falls back to the canonical production API when a local prebuild contains a sensitive placeholder", () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "[SENSITIVE]");
    expect(getApiBaseUrl()).toBe("https://api.shadowedgeai.com");
  });

  it("does not expose a raw HTML login response to the customer", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "https://api.shadowedgeai.com");
    vi.stubGlobal("fetch", vi.fn(async () => new Response("<!DOCTYPE html><html>wrong host</html>", {
      status: 404,
      headers: { "content-type": "text/html; charset=utf-8" },
    })));

    const error = await signInWithPassword("user@example.test", "correct-password").catch((caught) => caught);
    expect(error).toMatchObject({
      code: "UNEXPECTED_API_RESPONSE",
    });
    expect(String(error?.message || "")).toContain("The service returned an unexpected response. Please try again.");
    expect(String(error?.message || "")).not.toMatch(/DOCTYPE|<html/i);
    expect(isAuthUnavailableError(new ApiError("unexpected", { code: "UNEXPECTED_API_RESPONSE" }))).toBe(true);
  });

  it("does not send an old Bearer token during Login and replaces it after verification", async () => {
    window.localStorage.setItem(AUTH_TOKEN_KEY, "old-token");
    window.localStorage.setItem("access_token", "older-token");

    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const authorization = new Headers(init?.headers).get("authorization");
      if (url.endsWith("/api/auth/login")) {
        expect(authorization).toBeNull();
        return jsonResponse({
          ok: true,
          data: {
            user: { id: "user-1", email: "user@example.test" },
            session: {
              access_token: "new-token",
              refresh_token: "new-refresh-token",
              expires_in: 3600,
              token_type: "bearer",
            },
          },
        });
      }
      expect(url.endsWith("/api/auth/me")).toBe(true);
      expect(authorization).toBe("Bearer new-token");
      return jsonResponse({
        ok: true,
        data: {
          user: { id: "user-1", email: "user@example.test" },
          profile: { email: "user@example.test", name: "Verified User" },
        },
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await signInWithPassword("user@example.test", "correct-password");

    expect(result.profile?.email).toBe("user@example.test");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(window.localStorage.getItem(AUTH_TOKEN_KEY)).toBe("new-token");
    expect(window.localStorage.getItem("access_token")).toBe("new-token");
    expect(getCachedAuthSessionState()).toMatchObject({
      isProfileVerified: true,
      isSignedIn: true,
      token: "new-token",
    });
  });

  it("shares verified Auth state across Header and Studio projections", () => {
    saveAuthSession(
      { access_token: "session-token", refresh_token: "refresh-token" },
      { email: "user@example.test" },
    );

    expect(getCachedAuthSessionState()).toMatchObject({
      isProfileVerified: false,
      isSignedIn: false,
      token: "session-token",
    });

    markAuthSessionVerified("session-token");
    saveCachedProfile({ email: "user@example.test", name: "Verified User" });

    expect(getCachedAuthSessionState()).toMatchObject({
      isProfileVerified: true,
      isSignedIn: true,
      profile: { email: "user@example.test", name: "Verified User" },
      token: "session-token",
    });

    saveAuthSession(
      { access_token: "refreshed-token", refresh_token: "refreshed-refresh-token" },
      { email: "user@example.test" },
    );
    expect(getCachedAuthSessionState().isSignedIn).toBe(false);

    markAuthSessionVerified("refreshed-token");
    expect(getCachedAuthSessionState().isSignedIn).toBe(true);

    clearAuthSession();
    expect(getCachedAuthSessionState()).toMatchObject({
      isProfileVerified: false,
      isSignedIn: false,
      profile: null,
      token: "",
    });
  });

  it("clears all Auth aliases when an authenticated request receives Invalid authorization token", async () => {
    for (const key of authStorageKeys) window.localStorage.setItem(key, `stored-${key}`);
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      if (String(input).endsWith("/api/auth/refresh")) {
        return jsonResponse({ ok: false, code: "AUTH_REFRESH_FAILED", message: "Invalid token." }, 401);
      }
      return jsonResponse({ ok: false, message: "Invalid authorization token." }, 401);
    }));

    await expect(apiRequest("/api/auth/me")).rejects.toThrow("Invalid authorization token");

    for (const key of authStorageKeys) expect(window.localStorage.getItem(key), key).toBeNull();
  });

  it("logout clears every supported Auth storage key", () => {
    for (const key of authStorageKeys) window.localStorage.setItem(key, `stored-${key}`);

    clearAuthSession();

    for (const key of authStorageKeys) expect(window.localStorage.getItem(key), key).toBeNull();
  });

  it("does not report a session as signed in until profile verification succeeds", () => {
    expect(isVerifiedAuthSession("stored-token", false)).toBe(false);
    expect(isVerifiedAuthSession("stored-token", true)).toBe(true);
    expect(isVerifiedAuthSession("", true)).toBe(false);
  });
});
