import { apiRequest } from "@/lib/api";
import {
  clearAuthSession,
  getStoredRefreshToken,
  saveAuthSession,
  saveCachedProfile,
  type AuthSessionPayload,
} from "@/lib/auth";
import { ApiError } from "@/types/api";
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

type AuthRegisterPayload = {
  email?: string;
  profile?: ShadowEdgeProfile;
  user?: ShadowEdgeUser;
  userId?: string;
};

export type SignUpResult = {
  email: string;
  profile: ShadowEdgeProfile | null;
  user: ShadowEdgeUser | null;
  userId: string;
};

type ForgotPasswordPayload = {
  message?: string;
};

type ResetPasswordPayload = {
  message?: string;
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
    canUseLongVideoRealAnalysis: data.profile?.canUseLongVideoRealAnalysis === true,
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
  try {
    const verified = await getCurrentUserProfile();
    if (!verified.profile) throw new Error("Verified profile unavailable.");
    return verified;
  } catch {
    clearAuthSession();
    throw new Error("Unable to verify account access. Please sign in again.");
  }
}

export async function registerWithPassword(email: string, password: string): Promise<SignUpResult> {
  const cleanEmail = email.trim().toLowerCase();
  const envelope = await apiRequest<AuthRegisterPayload>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({
      email: cleanEmail,
      password,
    }),
    token: "",
  });

  const data = envelope.data || {};

  return {
    email: data.email || cleanEmail,
    profile: data.profile || null,
    user: data.user || null,
    userId: data.userId || data.user?.id || "",
  };
}

export async function requestPasswordReset(email: string) {
  const envelope = await apiRequest<ForgotPasswordPayload>("/api/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({
      email: email.trim().toLowerCase(),
    }),
    token: "",
  });

  return envelope.data || {};
}

export async function resetPassword(input: {
  password: string;
  code?: string;
  accessToken?: string;
  refreshToken?: string;
}) {
  const envelope = await apiRequest<ResetPasswordPayload>("/api/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({
      password: input.password,
      code: input.code,
      access_token: input.accessToken,
      refresh_token: input.refreshToken,
    }),
    token: "",
  });

  return envelope.data || {};
}

export function isAuthRateLimitError(error: unknown) {
  if (error instanceof ApiError) {
    return error.status === 429 || error.code === "AUTH_RATE_LIMITED";
  }

  const message = error instanceof Error ? error.message.toLowerCase() : "";
  return message.includes("too many") || message.includes("rate limit");
}

export function isInvalidResetLinkError(error: unknown) {
  if (error instanceof ApiError) {
    return error.status === 401 || error.code === "INVALID_RESET_LINK";
  }

  const message = error instanceof Error ? error.message.toLowerCase() : "";
  return message.includes("invalid") && message.includes("reset");
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
