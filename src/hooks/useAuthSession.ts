"use client";

import { useEffect, useState } from "react";
import { getCachedProfile, getStoredAuthToken } from "@/lib/auth";
import type { ShadowEdgeProfile } from "@/types/user";

export function useAuthSession() {
  const [profile, setProfile] = useState<ShadowEdgeProfile | null>(null);
  const [token, setToken] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setProfile(getCachedProfile());
      setToken(getStoredAuthToken());
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  return {
    profile,
    token,
    isSignedIn: Boolean(token),
  };
}
