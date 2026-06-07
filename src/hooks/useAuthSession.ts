"use client";

import { useCallback, useEffect, useState } from "react";
import { getCurrentUserProfile } from "@/lib/auth-api";
import { getCachedProfile, getStoredAuthToken } from "@/lib/auth";
import type { ShadowEdgeProfile } from "@/types/user";

export function useAuthSession() {
  const [profile, setProfile] = useState<ShadowEdgeProfile | null>(null);
  const [token, setToken] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const result = await getCurrentUserProfile();
      setProfile(result.profile);
      setToken(getStoredAuthToken());
      window.dispatchEvent(new CustomEvent("shadowedge:profile-updated"));
      return result.profile;
    } catch (refreshError) {
      const cached = getCachedProfile();
      const nextToken = getStoredAuthToken();
      setProfile(cached);
      setToken(nextToken);
      setError(refreshError instanceof Error ? refreshError.message : "Profile refresh failed.");
      return cached;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setProfile(getCachedProfile());
      setToken(getStoredAuthToken());
      void refresh();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [refresh]);

  useEffect(() => {
    function handleProfileUpdated() {
      setProfile(getCachedProfile());
      setToken(getStoredAuthToken());
    }

    window.addEventListener("shadowedge:profile-updated", handleProfileUpdated);
    window.addEventListener("storage", handleProfileUpdated);

    return () => {
      window.removeEventListener("shadowedge:profile-updated", handleProfileUpdated);
      window.removeEventListener("storage", handleProfileUpdated);
    };
  }, []);

  return {
    error,
    isLoading,
    profile,
    refresh,
    token,
    isSignedIn: Boolean(token),
  };
}
