"use client";

import { useI18n } from "@/i18n/useI18n";
import type { TeamPermissionProjection } from "@/lib/team-management-api";

function permissionLabel(key: string) {
  return key.toLowerCase().split("_").map((part) => part ? `${part[0].toUpperCase()}${part.slice(1)}` : "").join(" ");
}

export function PermissionMatrix({ projection }: { projection: TeamPermissionProjection }) {
  const { t } = useI18n();
  const visiblePermissions = projection.permissionDisplay.filter((permission) => permission.granted);

  return (
    <section aria-labelledby="team-permissions-heading" className="min-w-0 rounded-[24px] border border-white/10 bg-white/[.03] p-4 md:p-5">
      <h2 className="text-lg font-black text-white" id="team-permissions-heading">{t("team.permissions")}</h2>
      <p className="mt-1 text-xs leading-5 text-white/45">{t("team.permissions.subtitle")}</p>

      {!visiblePermissions.length ? <p className="mt-5 rounded-2xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-white/48">{t("team.permissions.empty")}</p> : null}

      <div className="mt-4 grid min-w-0 gap-2 sm:grid-cols-2">
        {visiblePermissions.map((permission) => (
          <div className="flex min-w-0 items-center justify-between gap-3 rounded-2xl border border-emerald-300/12 bg-emerald-400/[.055] px-3 py-3" key={permission.key}>
            <span className="min-w-0 break-words text-sm font-bold text-white/78">{permissionLabel(permission.key)}</span>
            <span className="shrink-0 rounded-full bg-emerald-300/12 px-2.5 py-1 text-[10px] font-black uppercase tracking-[.1em] text-emerald-100">{t("team.permission.granted")}</span>
          </div>
        ))}
      </div>

      {projection.unavailableActions.length ? (
        <div className="mt-5 border-t border-white/8 pt-4">
          <p className="text-[11px] font-black uppercase tracking-[.15em] text-white/35">{t("team.permission.unavailable")}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {projection.unavailableActions.map((action) => <span className="rounded-full border border-white/8 px-2.5 py-1 text-[11px] text-white/38" key={action}>{permissionLabel(action)}</span>)}
          </div>
        </div>
      ) : null}
    </section>
  );
}
