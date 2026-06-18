"use client";

import { ReactNode, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { canBypassMaintenanceAsAdmin, getMaintenanceMode, type MaintenanceMode } from "@/lib/maintenance";

const BYPASS_PREFIXES = [
  "/maintenance",
  "/sign-in",
  "/sign-up",
  "/forgot-password",
  "/reset-password",
  "/history",
  "/api/auth",
  "/api/admin",
  "/admin"
];

function isBypassedPath(pathname: string) {
  return BYPASS_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function getCurrentPathForReturn(pathname: string) {
  if (typeof window === "undefined") return pathname;
  return `${window.location.pathname}${window.location.search || ""}`;
}

export function MaintenanceGate({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "/";
  const router = useRouter();

  useEffect(() => {
    let mounted = true;

    async function checkMaintenance() {
      if (isBypassedPath(pathname)) return;

      try {
        const maintenance: MaintenanceMode = await getMaintenanceMode();
        if (!mounted) return;

        if (!maintenance.enabled) return;

        if (maintenance.allowAdminBypass && await canBypassMaintenanceAsAdmin()) {
          return;
        }

        const from = encodeURIComponent(getCurrentPathForReturn(pathname));
        router.replace(`/maintenance?from=${from}`);
      } catch {
        // Fail open: maintenance state should never block the normal app shell.
      }
    }

    checkMaintenance();

    return () => {
      mounted = false;
    };
  }, [pathname, router]);

  return <>{children}</>;
}
