"use client";

import type { ShadowEdgeProfile } from "@/types/user";
import { readJsonFromStorage } from "@/lib/storage";

export const AUTH_TOKEN_KEY = "shadowedge_auth_token";
export const AUTH_REFRESH_TOKEN_KEY = "shadowedge_refresh_token";
export const AUTH_PROFILE_KEY = "shadowedge_user_profile";
export const SUPABASE_STORAGE_KEY = "sb-fihauilcdjsfavvjniig-auth-token";

type SupabaseAuthCache = {
  access_token?: string;
  refresh_token?: string;
  expires_at?: number;
  expires_in?: number;
  token_type?: string;
  currentSession?: {
    access_token?: string;
    refresh_token?: string;
    user?: { email?: string; user_metadata?: { name?: string; full_name?: string } };
  };
  session?: {
    access_token?: string;
    refresh_token?: string;
    user?: { email?: string; user_metadata?: { name?: string; full_name?: string } };
  };
  user?: { email?: string; user_metadata?: { name?: string; full_name?: string } };
};

export type AuthSessionPayload = {
  access_token?: string;
  refresh_token?: string;
  expires_at?: number;
  expires_in?: number;
  token_type?: string;
};

function getSupabaseAuthCache(): SupabaseAuthCache | null {
  try {
    if (typeof window === "undefined") return null;
    const key = Object.keys(window.localStorage).find(
      (item) => item.startsWith("sb-") && item.includes("auth-token"),
    );
    return key ? readJsonFromStorage<SupabaseAuthCache>(key) : null;
  } catch {
    return null;
  }
}

export function getStoredAuthToken() {
  try {
    if (typeof window === "undefined") return "";
    const direct =
      window.localStorage.getItem(AUTH_TOKEN_KEY) ||
      window.localStorage.getItem("shadowedge_access_token") ||
      window.localStorage.getItem("shadowedge_token") ||
      window.localStorage.getItem("se_auth_token") ||
      window.localStorage.getItem("se_access_token") ||
      window.localStorage.getItem("access_token");

    if (direct) return direct;

    const supabase = getSupabaseAuthCache();
    return (
      supabase?.access_token ||
      supabase?.currentSession?.access_token ||
      supabase?.session?.access_token ||
      ""
    );
  } catch {
    return "";
  }
}

export function getStoredRefreshToken() {
  try {
    if (typeof window === "undefined") return "";
    const direct =
      window.localStorage.getItem(AUTH_REFRESH_TOKEN_KEY) ||
      window.localStorage.getItem("shadowedge_refresh_token") ||
      window.localStorage.getItem("se_refresh_token") ||
      window.localStorage.getItem("refresh_token");

    if (direct) return direct;

    const supabase = getSupabaseAuthCache();
    return (
      supabase?.refresh_token ||
      supabase?.currentSession?.refresh_token ||
      supabase?.session?.refresh_token ||
      ""
    );
  } catch {
    return "";
  }
}

export function getCachedProfile(): ShadowEdgeProfile | null {
  const profile = readJsonFromStorage<ShadowEdgeProfile>(AUTH_PROFILE_KEY);
  if (profile?.email) return profile;

  const supabase = getSupabaseAuthCache();
  const user = supabase?.user || supabase?.currentSession?.user || supabase?.session?.user;
  if (!user?.email) return null;

  return {
    email: user.email,
    name: user.user_metadata?.name || user.user_metadata?.full_name || user.email,
  };
}

export function saveAuthSession(session: AuthSessionPayload | null | undefined, user?: { email?: string; user_metadata?: { name?: string; full_name?: string } }) {
  if (typeof window === "undefined" || !session?.access_token) return;

  const token = session.access_token;
  const refreshToken = session.refresh_token || "";
  const localSession = {
    access_token: token,
    refresh_token: refreshToken,
    expires_at: session.expires_at,
    expires_in: session.expires_in || 3600,
    token_type: session.token_type || "bearer",
    user,
  };

  try {
    window.localStorage.setItem(AUTH_TOKEN_KEY, token);
    window.localStorage.setItem("shadowedge_access_token", token);
    window.localStorage.setItem("se_auth_token", token);
    window.localStorage.setItem("access_token", token);

    if (refreshToken) {
      window.localStorage.setItem(AUTH_REFRESH_TOKEN_KEY, refreshToken);
      window.localStorage.setItem("refresh_token", refreshToken);
    }

    window.localStorage.setItem(SUPABASE_STORAGE_KEY, JSON.stringify(localSession));
    window.dispatchEvent(new CustomEvent("shadowedge:profile-updated"));
  } catch {
    // Storage failures should not expose secrets or crash the UI.
  }
}

export function saveCachedProfile(profile: ShadowEdgeProfile | null | undefined) {
  if (typeof window === "undefined" || !profile) return;

  try {
    window.localStorage.setItem(AUTH_PROFILE_KEY, JSON.stringify(profile));
    window.dispatchEvent(new CustomEvent("shadowedge:profile-updated"));
  } catch {
    // Profile cache is best effort.
  }
}

export function clearAuthSession() {
  if (typeof window === "undefined") return;

  [
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
  ].forEach((key) => {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // Continue clearing other keys.
    }
  });

  window.dispatchEvent(new CustomEvent("shadowedge:profile-updated"));
}
