"use client";

import { useCallback, useEffect, useState } from "react";
import { getCurrentUserProfile } from "@/lib/auth-api";
import { getCachedProfile, getStoredAuthToken } from "@/lib/auth";
import type { ShadowEdgeProfile } from "@/types/user";

export function useAuthSession() {
  const [profile, setProfile] = useState<ShadowEdgeProfile | null>(null);
  const [token, setToken] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isProfileVerified, setIsProfileVerified] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    const currentToken = getStoredAuthToken();
    if (!currentToken) {
      setProfile(getCachedProfile());
      setToken("");
      setIsProfileVerified(false);
      setIsLoading(false);
      return null;
    }

    setIsLoading(true);
    setIsProfileVerified(false);
    setError("");

    try {
      const result = await getCurrentUserProfile();
      const verifiedToken = getStoredAuthToken();
      setProfile(result.profile);
      setToken(verifiedToken);
      setIsProfileVerified(Boolean(verifiedToken && result.profile));
      return result.profile;
    } catch (refreshError) {
      const cached = getCachedProfile();
      const nextToken = getStoredAuthToken();
      setProfile(cached);
      setToken(nextToken);
      setIsProfileVerified(false);
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
      setIsProfileVerified(false);
      void refresh();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [refresh]);

  useEffect(() => {
    function handleProfileUpdated() {
      const cached = getCachedProfile();
      const nextToken = getStoredAuthToken();
      setProfile(cached);
      setToken(nextToken);
      setIsProfileVerified(Boolean(nextToken && cached));
    }

    function handleStorageUpdated() {
      setProfile(getCachedProfile());
      setToken(getStoredAuthToken());
      setIsProfileVerified(false);
    }

    window.addEventListener("shadowedge:profile-updated", handleProfileUpdated);
    window.addEventListener("storage", handleStorageUpdated);

    return () => {
      window.removeEventListener("shadowedge:profile-updated", handleProfileUpdated);
      window.removeEventListener("storage", handleStorageUpdated);
    };
  }, []);

  return {
    error,
    isLoading,
    isProfileVerified,
    profile,
    refresh,
    token,
    isSignedIn: Boolean(token),
  };
}
