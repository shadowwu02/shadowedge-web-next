"use client";

import { useCallback, useEffect, useState } from "react";
import { getCurrentUserProfile } from "@/lib/auth-api";
import { getCachedAuthSessionState } from "@/lib/auth";
import type { ShadowEdgeProfile, ShadowEdgeTenantAccess, ShadowEdgeUser } from "@/types/user";

export function useAuthSession() {
  const [profile, setProfile] = useState<ShadowEdgeProfile | null>(null);
  const [user, setUser] = useState<ShadowEdgeUser | null>(null);
  const [tenantAccess, setTenantAccess] = useState<ShadowEdgeTenantAccess | null>(null);
  const [token, setToken] = useState("");
  // Authentication is unresolved until the cached session has been hydrated
  // and, when present, verified with /api/auth/me. Starting in a signed-out
  // state lets protected pages redirect before that first check completes.
  const [isLoading, setIsLoading] = useState(true);
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
      setUser(null);
      setTenantAccess(null);
      syncCachedSession();
      setIsLoading(false);
      return null;
    }

    setIsLoading(true);
    setError("");

    try {
      const result = await getCurrentUserProfile();
      setUser(result.user);
      setTenantAccess(result.tenantAccess);
      syncCachedSession();
      return result.profile;
    } catch (refreshError) {
      setUser(null);
      setTenantAccess(null);
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
      if (next.token) {
        setUser(null);
        setTenantAccess(null);
        void refresh();
      }
      else {
        setUser(null);
        setTenantAccess(null);
      }
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
    tenantAccess,
    user,
    refresh,
    token,
    isSignedIn: Boolean(token && isProfileVerified),
  };
}
