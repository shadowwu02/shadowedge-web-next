"use client";

import { useI18n } from "@/i18n/useI18n";
import { hasProjectedAction, type TeamMember, type TeamRole } from "@/lib/team-management-api";
import { RoleSelector, roleKey } from "@/components/team/RoleSelector";

function formatDate(value: string) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString();
}

export function MemberList({
  assignableRoles,
  busyMemberRef,
  members,
  onRemove,
  onRoleChange,
}: {
  assignableRoles: TeamRole[];
  busyMemberRef: string;
  members: TeamMember[];
  onRemove: (member: TeamMember) => void;
  onRoleChange: (member: TeamMember, role: TeamRole) => void;
}) {
  const { t, tf } = useI18n();

  return (
    <section aria-labelledby="team-members-heading" className="min-w-0 rounded-[24px] border border-white/10 bg-white/[.03] p-4 md:p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-white" id="team-members-heading">{t("team.members")}</h2>
          <p className="mt-1 text-xs text-white/45">{tf("team.members.count", { count: members.length })}</p>
        </div>
      </div>

      {!members.length ? <p className="mt-5 rounded-2xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-white/48">{t("team.members.empty")}</p> : null}

      <div className="mt-4 grid min-w-0 gap-3">
        {members.map((member) => {
          const canChangeRole = hasProjectedAction(member.allowedActions, "ROLE_MANAGE") && assignableRoles.length > 0;
          const canRemove = hasProjectedAction(member.allowedActions, "MEMBER_REMOVE");
          const busy = busyMemberRef === member.memberRef;
          return (
            <article className="flex min-w-0 flex-col gap-3 rounded-2xl border border-white/8 bg-black/10 p-4 sm:flex-row sm:items-center sm:justify-between" key={member.memberRef}>
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-white">{member.identityDisplay}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-white/45">
                  <span>{t(roleKey(member.role))}</span>
                  <span aria-hidden="true">·</span>
                  <span>{member.status}</span>
                  <span aria-hidden="true">·</span>
                  <span>{tf("team.member.joined", { date: formatDate(member.joinedAt) })}</span>
                </div>
              </div>

              <div className="flex min-w-0 flex-wrap items-center gap-2">
                {canChangeRole ? (
                  <RoleSelector disabled={busy} onChange={(role) => onRoleChange(member, role)} options={assignableRoles} value={member.role} />
                ) : (
                  <span className="rounded-full border border-white/10 bg-white/[.045] px-3 py-1.5 text-xs font-bold text-white/65">{t(roleKey(member.role))}</span>
                )}
                {canRemove ? (
                  <button className="rounded-xl border border-red-300/20 bg-red-400/[.07] px-3 py-2 text-xs font-black text-red-100 transition hover:bg-red-400/[.13] disabled:opacity-50" disabled={busy} onClick={() => onRemove(member)} type="button">
                    {t("team.member.remove")}
                  </button>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
