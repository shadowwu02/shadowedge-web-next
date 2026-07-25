"use client";

import { useCallback, useEffect, useState } from "react";
import { getCurrentUserProfile } from "@/lib/auth-api";
import { getCachedAuthSessionState } from "@/lib/auth";
import type { ShadowEdgeProfile } from "@/types/user";

export function useAuthSession() {
  const [profile, setProfile] = useState<ShadowEdgeProfile | null>(null);
  const [token, setToken] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isProfileVerified, setIsProfileVerified] = useState(false);
  const [error, setError] = useState("");

  const syncCachedSession = useCallback(() => {
    const next = getCachedAuthSessionState();
    setProfile(next.profile);
    setToken(next.token);
    setIsProfileVerified(next.isProfileVerified);
    return next;
  }, []);

  const refresh = useCallback(async () => {
    const current = getCachedAuthSessionState();
    if (!current.token) {
      syncCachedSession();
      setIsLoading(false);
      return null;
    }

    setIsLoading(true);
    setError("");

    try {
      const result = await getCurrentUserProfile();
      syncCachedSession();
      return result.profile;
    } catch (refreshError) {
      const cached = syncCachedSession();
      setError(refreshError instanceof Error ? refreshError.message : "Profile refresh failed.");
      return cached.profile;
    } finally {
      setIsLoading(false);
    }
  }, [syncCachedSession]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      syncCachedSession();
      void refresh();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [refresh, syncCachedSession]);

  useEffect(() => {
    function handleProfileUpdated() {
      syncCachedSession();
    }

    function handleStorageUpdated() {
      const next = syncCachedSession();
      if (next.token && !next.isProfileVerified) void refresh();
    }

    window.addEventListener("shadowedge:profile-updated", handleProfileUpdated);
    window.addEventListener("storage", handleStorageUpdated);

    return () => {
      window.removeEventListener("shadowedge:profile-updated", handleProfileUpdated);
      window.removeEventListener("storage", handleStorageUpdated);
    };
  }, [refresh, syncCachedSession]);

  return {
    error,
    isLoading,
    isProfileVerified,
    profile,
    refresh,
    token,
    isSignedIn: Boolean(token && isProfileVerified),
  };
}
