import { apiRequest } from "@/lib/api";
import { getStoredRefreshToken, saveAuthSession, saveCachedProfile, type AuthSessionPayload } from "@/lib/auth";
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

type AuthLoginPayload = {
  user?: ShadowEdgeUser;
  profile?: ShadowEdgeProfile;
  session?: AuthSessionPayload;
};

export type SignInResult = {
  user: ShadowEdgeUser | null;
  profile: ShadowEdgeProfile | null;
};

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

  saveCachedProfile(profile);

  return {
    user: user.email || user.id ? user : null,
    profile: profile.email || profile.credits !== undefined ? profile : null,
  };
}

export async function signInWithPassword(email: string, password: string): Promise<SignInResult> {
  const envelope = await apiRequest<AuthLoginPayload>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({
      email: email.trim(),
      password,
    }),
  });

  const data = envelope.data || {};
  if (!data.session?.access_token) {
    throw new Error("No valid session returned.");
  }

  saveAuthSession(data.session, data.user);
  saveCachedProfile(data.profile || (data.user?.email ? { email: data.user.email, name: data.user.name || data.user.email } : null));

  return {
    user: data.user || null,
    profile: data.profile || null,
  };
}

export async function refreshAuthSession() {
  const refreshToken = getStoredRefreshToken();
  if (!refreshToken) return "";

  const envelope = await apiRequest<{ session?: AuthSessionPayload; user?: ShadowEdgeUser }>("/api/auth/refresh", {
    method: "POST",
    body: JSON.stringify({
      refresh_token: refreshToken,
    }),
    token: "",
  });

  const session = envelope.data?.session;
  if (!session?.access_token) return "";

  saveAuthSession(session, envelope.data?.user);
  return session.access_token;
}
