import { apiRequest } from "@/lib/api";
import { AUTH_PROFILE_KEY } from "@/lib/auth";
import type { ShadowEdgeProfile, ShadowEdgeUser } from "@/types/user";

type AuthMePayload = {
  user?: ShadowEdgeUser;
  profile?: ShadowEdgeProfile;
  credits?: number;
  credits_balance?: number;
  max_concurrency?: number;
  maxConcurrency?: number;
  concurrency?: number;
  email?: string;
  name?: string;
};

export type AuthMeResult = {
  user: ShadowEdgeUser | null;
  profile: ShadowEdgeProfile | null;
};

function cacheProfile(profile: ShadowEdgeProfile | null) {
  if (!profile || typeof window === "undefined") return;
  try {
    window.localStorage.setItem(AUTH_PROFILE_KEY, JSON.stringify(profile));
    window.dispatchEvent(new CustomEvent("shadowedge:profile-updated"));
  } catch {
    // Cache failures should never block workspace usage.
  }
}

export async function getCurrentUserProfile(): Promise<AuthMeResult> {
  const envelope = await apiRequest<AuthMePayload>("/api/auth/me", {
    method: "GET",
  });
  const data = envelope.data || {};
  const user = data.user || {
    email: data.email || data.profile?.email,
    name: data.name || data.profile?.name,
  };
  const profile: ShadowEdgeProfile = {
    ...(data.profile || {}),
    email: data.profile?.email || user.email,
    name: data.profile?.name || user.name || user.email,
    credits: data.profile?.credits ?? data.credits,
    credits_balance: data.profile?.credits_balance ?? data.credits_balance ?? data.credits,
    max_concurrency: data.profile?.max_concurrency ?? data.max_concurrency ?? data.concurrency,
    maxConcurrency: data.profile?.maxConcurrency ?? data.maxConcurrency,
  };

  cacheProfile(profile);

  return {
    user: user.email || user.id ? user : null,
    profile: profile.email || profile.credits !== undefined ? profile : null,
  };
}
