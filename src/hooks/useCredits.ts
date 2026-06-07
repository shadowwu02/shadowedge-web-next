"use client";

import { useMemo } from "react";
import { useAuthSession } from "@/hooks/useAuthSession";

export function useCredits() {
  const { profile } = useAuthSession();

  return useMemo(() => {
    const value = profile?.credits_balance ?? profile?.credits;
    return {
      credits: typeof value === "number" ? value : null,
      maxConcurrency: profile?.max_concurrency ?? profile?.maxConcurrency ?? null,
    };
  }, [profile]);
}
