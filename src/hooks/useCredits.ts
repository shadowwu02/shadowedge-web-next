"use client";

import { useMemo } from "react";
import { useAuthSession } from "@/hooks/useAuthSession";

export function useCredits() {
  const { error, isLoading, profile, refresh } = useAuthSession();

  return useMemo(() => {
    const value = profile?.credits_balance ?? profile?.credits;
    return {
      credits: typeof value === "number" ? value : null,
      error,
      isLoading,
      maxConcurrency: profile?.max_concurrency ?? profile?.maxConcurrency ?? profile?.concurrency ?? null,
      refresh,
    };
  }, [error, isLoading, profile, refresh]);
}
