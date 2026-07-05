"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { activeBrand } from "@/config/brand";
import { useI18n } from "@/i18n/useI18n";
import { getMaintenanceMode, DEFAULT_MAINTENANCE_MODE, type MaintenanceMode } from "@/lib/maintenance";

function formatRestoreTime(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function MaintenancePageClient() {
  const router = useRouter();
  const { t } = useI18n();
  const [maintenance, setMaintenance] = useState<MaintenanceMode>(DEFAULT_MAINTENANCE_MODE);
  const [isRechecking, setIsRechecking] = useState(false);

  const getReturnPath = useCallback(() => {
    if (typeof window === "undefined") return "/";
    const from = new URLSearchParams(window.location.search).get("from") || "/";
    if (!from.startsWith("/") || from.startsWith("//") || from === "/maintenance" || from.startsWith("/maintenance?")) {
      return "/";
    }
    return from;
  }, []);

  useEffect(() => {
    let mounted = true;
    getMaintenanceMode()
      .then((next) => {
        if (mounted) setMaintenance(next);
      })
      .catch(() => {
        if (mounted) setMaintenance(DEFAULT_MAINTENANCE_MODE);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const handleCheckAgain = useCallback(async () => {
    setIsRechecking(true);
    try {
      const next = await getMaintenanceMode();
      setMaintenance(next);
      if (!next.enabled) {
        router.replace(getReturnPath());
      }
    } catch {
      setMaintenance(DEFAULT_MAINTENANCE_MODE);
    } finally {
      setIsRechecking(false);
    }
  }, [getReturnPath, router]);

  const restoreTime = formatRestoreTime(maintenance.estimatedRestoreAt);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#05060a] px-5 py-8 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(200,164,93,.18),transparent_32%),radial-gradient(circle_at_82%_18%,rgba(139,92,246,.14),transparent_30%),linear-gradient(135deg,#05060a,#0d1018_54%,#05060a)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[.045] [background-image:repeating-linear-gradient(135deg,rgba(255,255,255,.8)_0,rgba(255,255,255,.8)_1px,transparent_1px,transparent_18px)]" />

      <section className="relative mx-auto flex min-h-[calc(100vh-4rem)] max-w-3xl items-center">
        <div className="w-full rounded-[32px] border border-white/10 bg-[#10131d]/88 p-7 shadow-[0_28px_90px_rgba(0,0,0,.45)] backdrop-blur md:p-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#c8a45d]/35 bg-[#c8a45d]/10 px-4 py-2 text-[11px] font-black uppercase tracking-[.24em] text-[#e5c97b]">
            {activeBrand.copy.statusLabel}
          </div>

          <h1 className="mt-7 text-4xl font-black tracking-tight text-[#f7f8fa] md:text-6xl">
            {maintenance.title || DEFAULT_MAINTENANCE_MODE.title}
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-8 text-[#a7adbb] md:text-lg">
            {maintenance.message || DEFAULT_MAINTENANCE_MODE.message}
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/[.045] p-4">
              <p className="text-xs font-black uppercase tracking-[.18em] text-white/40">Mode</p>
              <p className="mt-2 text-lg font-black text-white">{maintenance.enabled ? "Maintenance active" : "Service available"}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[.045] p-4">
              <p className="text-xs font-black uppercase tracking-[.18em] text-white/40">Estimated restore</p>
              <p className="mt-2 text-lg font-black text-white">{restoreTime || "To be announced"}</p>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link className="se-button-secondary inline-flex min-h-11 items-center justify-center rounded-full px-5 text-sm font-black" href="/sign-in">
              {t("maintenance.actions.signIn")}
            </Link>
            <Link className="se-button-ghost inline-flex min-h-11 items-center justify-center rounded-full px-5 text-sm font-black" href="/history">
              {t("maintenance.actions.viewHistory")}
            </Link>
            <button
              className="se-button-ghost inline-flex min-h-11 items-center justify-center rounded-full px-5 text-sm font-black disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isRechecking}
              type="button"
              onClick={() => void handleCheckAgain()}
            >
              {isRechecking ? t("maintenance.actions.checking") : t("maintenance.actions.checkAgain")}
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
