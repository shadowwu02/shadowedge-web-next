"use client";

import { ReactNode, useEffect, useState } from "react";
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
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function checkMaintenance() {
      setIsChecking(true);

      try {
        const maintenance: MaintenanceMode = await getMaintenanceMode();
        if (!mounted) return;

        if (!maintenance.enabled || isBypassedPath(pathname)) {
          setIsChecking(false);
          return;
        }

        if (maintenance.allowAdminBypass && await canBypassMaintenanceAsAdmin()) {
          setIsChecking(false);
          return;
        }

        const from = encodeURIComponent(getCurrentPathForReturn(pathname));
        router.replace(`/maintenance?from=${from}`);
      } catch {
        if (mounted) setIsChecking(false);
      }
    }

    checkMaintenance();

    return () => {
      mounted = false;
    };
  }, [pathname, router]);

  if (isChecking && !isBypassedPath(pathname)) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#05060a] px-6 text-white">
        <div className="rounded-[28px] border border-white/10 bg-white/[.045] px-6 py-5 text-sm font-semibold text-white/62 shadow-2xl">
          Checking ShadowEdge status...
        </div>
      </main>
    );
  }

  return <>{children}</>;
}
