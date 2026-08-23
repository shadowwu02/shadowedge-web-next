"use client";

import { FormEvent, useState } from "react";
import { useI18n } from "@/i18n/useI18n";
import type { TeamRole } from "@/lib/team-management-api";
import { roleKey } from "@/components/team/RoleSelector";

export function InviteDialog({
  busy,
  errorMessage,
  onClose,
  onSubmit,
  roles,
}: {
  busy: boolean;
  errorMessage: string;
  onClose: () => void;
  onSubmit: (input: { email: string; role: TeamRole }) => void;
  roles: TeamRole[];
}) {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<TeamRole>(roles[0] || "MEMBER");

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!email.trim() || !roles.includes(role)) return;
    onSubmit({ email: email.trim(), role });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-3 backdrop-blur-sm sm:items-center" onMouseDown={(event) => { if (event.currentTarget === event.target && !busy) onClose(); }}>
      <form aria-labelledby="team-invite-title" aria-modal="true" className="w-full max-w-md rounded-[26px] border border-white/12 bg-[#11131a] p-5 shadow-2xl md:p-6" onSubmit={submit} role="dialog">
        <h2 className="text-xl font-black text-white" id="team-invite-title">{t("team.invite.title")}</h2>
        <div className="mt-5 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-xs font-bold text-white/62">{t("team.invite.email")}</span>
            <input autoComplete="email" className="w-full rounded-2xl border border-white/12 bg-black/20 px-4 py-3 text-sm text-white outline-none focus:border-[#ffcf83]/55" disabled={busy} onChange={(event) => setEmail(event.target.value)} required type="email" value={email} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-bold text-white/62">{t("team.invite.role")}</span>
            <select className="w-full rounded-2xl border border-white/12 bg-[#11131a] px-4 py-3 text-sm text-white outline-none focus:border-[#ffcf83]/55" disabled={busy} onChange={(event) => setRole(event.target.value as TeamRole)} value={role}>
              {roles.map((option) => <option key={option} value={option}>{t(roleKey(option))}</option>)}
            </select>
          </label>
          {errorMessage ? <p className="rounded-xl border border-red-300/20 bg-red-400/[.08] px-3 py-2 text-sm text-red-100" role="alert">{errorMessage}</p> : null}
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button className="rounded-xl border border-white/12 px-4 py-2.5 text-sm font-bold text-white/70 disabled:opacity-50" disabled={busy} onClick={onClose} type="button">{t("team.cancel")}</button>
          <button className="rounded-xl bg-[#ffcf83] px-4 py-2.5 text-sm font-black text-[#201306] disabled:opacity-50" disabled={busy || !email.trim() || !roles.length} type="submit">{busy ? t("team.action.saving") : t("team.invite.send")}</button>
        </div>
      </form>
    </div>
  );
}
