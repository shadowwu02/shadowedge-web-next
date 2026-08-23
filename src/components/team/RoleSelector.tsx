"use client";

import type { TeamRole } from "@/lib/team-management-api";
import { useI18n } from "@/i18n/useI18n";

function roleKey(role: TeamRole | "UNKNOWN") {
  if (role === "OWNER") return "team.role.owner" as const;
  if (role === "ADMIN") return "team.role.admin" as const;
  if (role === "MEMBER") return "team.role.member" as const;
  return "team.role.unknown" as const;
}

export function RoleSelector({
  disabled,
  onChange,
  options,
  value,
}: {
  disabled?: boolean;
  onChange: (role: TeamRole) => void;
  options: TeamRole[];
  value: TeamRole | "UNKNOWN";
}) {
  const { t } = useI18n();
  const selectable = options.filter((role) => role !== value);

  if (!selectable.length) {
    return (
      <span className="rounded-full border border-white/10 bg-white/[.045] px-3 py-1.5 text-xs font-bold text-white/65">
        {t(roleKey(value))}
      </span>
    );
  }

  return (
    <label className="min-w-0">
      <span className="sr-only">{t("team.role.change")}</span>
      <select
        aria-label={t("team.role.change")}
        className="max-w-full rounded-xl border border-white/12 bg-[#11131a] px-3 py-2 text-xs font-bold text-white outline-none transition focus:border-[#ffcf83]/55 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={disabled}
        onChange={(event) => onChange(event.target.value as TeamRole)}
        value={value}
      >
        <option disabled value={value}>{t(roleKey(value))}</option>
        {selectable.map((role) => <option key={role} value={role}>{t(roleKey(role))}</option>)}
      </select>
    </label>
  );
}

export { roleKey };
