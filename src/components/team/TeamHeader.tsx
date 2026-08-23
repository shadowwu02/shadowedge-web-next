"use client";

import { useI18n } from "@/i18n/useI18n";
import { hasProjectedAction, type TeamOrganization } from "@/lib/team-management-api";

export function TeamHeader({
  canCreate,
  disabled,
  onArchive,
  onCreate,
  onEdit,
  onSelect,
  organizations,
  selected,
}: {
  canCreate: boolean;
  disabled?: boolean;
  onArchive: () => void;
  onCreate: () => void;
  onEdit: () => void;
  onSelect: (organizationRef: string) => void;
  organizations: TeamOrganization[];
  selected: TeamOrganization | null;
}) {
  const { t } = useI18n();
  const isTeamNative = selected?.authorityOrigin === "TEAM_NATIVE";
  const canManage = isTeamNative && hasProjectedAction(selected?.allowedActions, "ORGANIZATION_MANAGE");
  const selectedIndex = Math.max(0, organizations.findIndex((organization) => organization.organizationRef === selected?.organizationRef));

  return (
    <header className="rounded-[28px] border border-white/10 bg-[linear-gradient(135deg,rgba(255,207,131,.11),rgba(255,255,255,.025)_48%,rgba(255,255,255,.015))] p-5 shadow-[0_22px_80px_rgba(0,0,0,.25)] md:p-7">
      <div className="flex min-w-0 flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#ffcf83]">{t("team.eyebrow")}</p>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-white md:text-3xl">{t("team.title")}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/58">{t("team.subtitle")}</p>
        </div>

        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end xl:justify-end">
          {organizations.length ? (
            <label className="min-w-0 sm:w-[280px]">
              <span className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.16em] text-white/45">{t("team.select")}</span>
              <select
                className="w-full min-w-0 rounded-2xl border border-white/12 bg-[#11131a] px-4 py-3 text-sm font-bold text-white outline-none transition focus:border-[#ffcf83]/55"
                disabled={disabled}
                onChange={(event) => {
                  const organization = organizations[Number(event.target.value)];
                  if (organization) onSelect(organization.organizationRef);
                }}
                value={String(selectedIndex)}
              >
                {organizations.map((organization, index) => (
                  <option key={organization.organizationRef} value={String(index)}>{organization.name}</option>
                ))}
              </select>
            </label>
          ) : null}

          {canManage ? (
            <>
              <button className="rounded-2xl border border-white/12 bg-white/[.055] px-4 py-3 text-sm font-black text-white transition hover:border-white/22 hover:bg-white/[.085] disabled:opacity-50" disabled={disabled} onClick={onEdit} type="button">
                {t("team.edit")}
              </button>
              <button className="rounded-2xl border border-red-300/20 bg-red-400/[.08] px-4 py-3 text-sm font-black text-red-100 transition hover:bg-red-400/[.14] disabled:opacity-50" disabled={disabled} onClick={onArchive} type="button">
                {t("team.archive")}
              </button>
            </>
          ) : null}

          {canCreate ? (
            <button className="rounded-2xl bg-[#ffcf83] px-4 py-3 text-sm font-black text-[#201306] transition hover:bg-[#ffdc9f] disabled:opacity-50" disabled={disabled} onClick={onCreate} type="button">
              {t("team.create")}
            </button>
          ) : null}
        </div>
      </div>
    </header>
  );
}
