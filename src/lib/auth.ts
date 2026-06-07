"use client";

import type { ShadowEdgeProfile } from "@/types/user";
import { readJsonFromStorage } from "@/lib/storage";

export const AUTH_TOKEN_KEY = "shadowedge_auth_token";
export const AUTH_REFRESH_TOKEN_KEY = "shadowedge_refresh_token";
export const AUTH_PROFILE_KEY = "shadowedge_user_profile";

type SupabaseAuthCache = {
  access_token?: string;
  refresh_token?: string;
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
